// const STOREFRONT_API_TOKEN = 'c4ef00cae3aa859ebdd6a1d805151699' // for test test54329.myshopify.com
const STOREFRONT_API_TOKEN = '05eb84641778e6e55aa9b288d8e958ce'; // for protect-home-fr.myshopify.com

async function fetchVariantQuantities(productGid) {
  const query = `
    query getProductInventory($id: ID!) {
      product(id: $id) {
        variants(first: 100) {
          edges {
            node {
              id
              quantityAvailable
            }
          }
        }
      }
    }
  `;
  const res = await fetch('/api/2023-04/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_API_TOKEN,
    },
    body: JSON.stringify({ query, variables: { id: productGid } }),
  });
  const data = await res.json();
  console.log('Storefront API response:', data);
  const quantities = {};
  if (data.data && data.data.product && data.data.product.variants) {
    data.data.product.variants.edges.forEach(edge => {
      quantities[edge.node.id] = edge.node.quantityAvailable;
    });
  }
  return quantities;
}

class BundleApp {
  constructor(container) {
    try {
      console.log('Initializing BundleApp with container:', container);
      if (!container) {
        throw new Error('No container element provided');
      }
      
      this.container = container;
      this.productId = container.dataset.productId;
      if (!this.productId) {
        throw new Error('No product ID found in container data attributes');
      }
      console.log('Product ID from data attribute:', this.productId);

      // Extract numeric ID from GID if needed
      if (this.productId.includes('gid://')) {
        this.productId = this.productId.split('/').pop();
        console.log('Extracted numeric product ID:', this.productId);
      }

      this.blocksContainer = container.querySelector('[data-bundle-blocks]');
      if (!this.blocksContainer) {
        throw new Error('Bundle blocks container not found');
      }

      this.finalPriceElement = container.querySelector('[data-bundle-final-price]');
      this.addButton = container.querySelector('[data-bundle-add]');
      
      this.basePrice = 0;
      console.log('Parsed base price:', this.basePrice);
      
      this.selectedOptions = new Map();
      this.files = new Map();

      this.init();
    } catch (error) {
      console.error('BundleApp initialization failed:', error);
      if (this.blocksContainer) {
        this.blocksContainer.innerHTML = `<div class="bundle-error" style="color: red; padding: 1em;">
          Failed to initialize bundle: ${error.message}
        </div>`;
      }
    }
  }

  async init() {
    try {
      console.log('Fetching bundle configuration for product:', this.productId);
      // Use the app proxy URL format for Shopify
      const url = `/apps/bundle/api/bundles/product/${this.productId}`;
      console.log('API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('API Response status:', response.status);
      
      const data = await response.json();
      console.log('API Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      if (!data || !data.blocks) {
        console.log('No bundle configuration found or invalid data:', data);
        this.blocksContainer.innerHTML = '<div class="bundle-error" style="color: red; padding: 1em;">No bundle configuration found for this product.</div>';
        return;
      }

      // Initialize product data if not already available
      if (!window.product) {
        // Get product data from Shopify's product JSON endpoint using the handle
        const productHandle = window.location.pathname.split('/').pop();
        const productResponse = await fetch(`/products/${productHandle}.js`);
        if (productResponse.ok) {
          const productData = await productResponse.json();
          console.log('Loaded product data:', productData);
          window.product = productData;
        } else {
          console.error('Failed to fetch product data:', productResponse.status);
          this.blocksContainer.innerHTML = '<div class="bundle-error" style="color: red; padding: 1em;">Failed to load product data.</div>';
          return;
        }
      }

      // After window.product is set and before this.bundle = data;
      const productGid = `gid://shopify/Product/${this.productId}`;
      this.variantQuantities = await fetchVariantQuantities(productGid);
      console.log('Fetched variant quantities:', this.variantQuantities);

      this.bundle = data;
      console.log('Rendering bundle with blocks:', this.bundle.blocks);
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load bundle configuration:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.name
      });
      this.blocksContainer.innerHTML = `<div class="bundle-error" style="color: red; padding: 1em;">
        Failed to load bundle configuration: ${error.message}
      </div>`;
    }
  }

  render() {
    console.log('Starting render process');
    if (!this.bundle.blocks) {
      console.error('No blocks found in bundle:', this.bundle);
      return;
    }

    const sortedBlocks = this.bundle.blocks.sort((a, b) => a.position - b.position);
    console.log('Sorted blocks:', sortedBlocks);

    this.blocksContainer.innerHTML = sortedBlocks
      .map(block => {
        console.log('Rendering block:', block);
        return this.renderBlock(block);
      })
      .join('');
    console.log('Render complete');
  }

  renderBlock(block) {
    return `
      <div class="bundle-block" data-block-id="${block.id}">
        <h3 class="bundle-block-title">${block.title}</h3>
        ${block.description ? `<p class="bundle-block-description">${block.description}</p>` : ''}
        ${block.inputs
          .sort((a, b) => a.position - b.position)
          .map(input => this.renderInput(input))
          .join('')}
      </div>
    `;
  }

  renderInput(input) {
    return `
      <div class="bundle-input" data-input-id="${input.id}">
        <div class="bundle-input-title">
          <h4>${input.title}</h4>
          ${input.description ? `
            <span class="bundle-input-description-trigger" title="Click for more info">?</span>
            <div class="bundle-input-description">${input.description}</div>
          ` : ''}
        </div>
        ${this.renderInputByType(input)}
      </div>
    `;
  }

  renderInputByType(input) {
    switch (input.type) {
      case 'MULTI_SELECT':
        return this.renderMultiSelect(input);
      case 'RADIO':
        return this.renderRadioButtons(input);
      case 'FILE':
        return this.renderFileUpload(input);
      case 'TABLE':
        return this.renderTableInput(input);
      default:
        return '';
    }
  }

  renderMultiSelect(input) {
    return `
      <div class="bundle-options" data-type="multi">
        ${input.options.map(option => {
          const variantGid = option.variant?.id;
          let label = option.label;
          let priceDisplay = '';
          let quantitySelector = '';
          let stockIndicator = '';
          let showFileUpload = !variantGid && !!option.showFileUpload; // Only show file upload if NOT linked to a variant
          let variantData = null;
          let numericVariantId = null;
          let quantityAvailable = null;
          let isOutOfStock = false;

          if (variantGid && window.product && window.product.variants) {
            const match = variantGid.match(/\/ProductVariant\/(\d+)/);
            numericVariantId = match ? parseInt(match[1], 10) : null;
            if (numericVariantId) {
               variantData = window.product.variants.find(v => v.id === numericVariantId);
            }
            
            if (variantData) {
              label = variantData.title; // Use variant title as label
              
              // --- Display Variant Price ---
              priceDisplay = `<span class="bundle-option-price variant-price">${this.formatPrice({ value: variantData.price / 100, type: 'fixed' })}</span>`;
              
              // --- Get Stock and Build Quantity Selector ---
              quantityAvailable = this.variantQuantities ? this.variantQuantities[variantGid] : null;
              isOutOfStock = quantityAvailable === 0;
              console.log(`Variant Option ${label} (${variantGid}), Stock: ${quantityAvailable}`);
              
              quantitySelector = `
                <div class="bundle-option-quantity quantity-selector ${isOutOfStock ? 'disabled' : ''}">
                  <button type="button" class="quantity-button minus" aria-label="Decrease quantity" ${isOutOfStock ? 'disabled' : ''}>-</button>
                  <input 
                    type="number" 
                    class="quantity-input" 
                    value="${this.getOptionQuantity(input.id, option.id)}" 
                    min="0" 
                    max="${quantityAvailable !== null ? quantityAvailable : 9999}" 
                    aria-label="Quantity" 
                    ${isOutOfStock || !this.isOptionSelected(input.id, option.id) ? 'disabled' : ''} 
                    data-price="${variantData.price}"
                  >
                  <button type="button" class="quantity-button plus" aria-label="Increase quantity" ${isOutOfStock ? 'disabled' : ''}>+</button>
                </div>
              `;
              
              // --- Add Stock Indicator ---
              stockIndicator = `
                <td class="stock-cell">
                  ${(quantityAvailable > 0)
                    ? `<span class="stock-icon in-stock" title="In stock">✓</span>`
                    : `<span class="stock-icon restock" title="Out of stock">⏱</span>`
                  }
                </td>
              `;

              // Hide custom file upload if linked to variant
              showFileUpload = false; 
              
            } else {
              console.warn(`Variant ${variantGid} (numeric: ${numericVariantId}) not found in product data.`);
              // Fallback to custom option display if variant not found
              if (option.price && option.price.value > 0) {
                priceDisplay = `<span class="bundle-option-price">${this.formatPrice(option.price)}</span>`;
              }
              if (option.maxQuantity) {
                  quantitySelector = `
                    <div class="bundle-option-quantity">
                      <button type="button" class="quantity-decrease">-</button>
                      <input type="number" min="1" max="${option.maxQuantity}" value="${this.getOptionQuantity(input.id, option.id)}" ${!this.isOptionSelected(input.id, option.id) ? 'disabled' : ''}>
                      <button type="button" class="quantity-increase">+</button>
                    </div>
                  `;
              }
            }
          } else {
             // Standard custom option display (no variant linked)
             if (option.price && option.price.value > 0) {
                priceDisplay = `<span class="bundle-option-price">${this.formatPrice(option.price)}</span>`;
             }
             if (option.maxQuantity) {
                  quantitySelector = `
                    <div class="bundle-option-quantity">
                      <button type="button" class="quantity-decrease">-</button>
                      <input type="number" min="1" max="${option.maxQuantity}" value="${this.getOptionQuantity(input.id, option.id)}" ${!this.isOptionSelected(input.id, option.id) ? 'disabled' : ''}>
                      <button type="button" class="quantity-increase">+</button>
                    </div>
                  `;
              }
          }
          
          return `
            <div class="bundle-option ${variantData ? 'variant-linked' : 'custom'}" data-option-id="${option.id}" ${variantData ? `data-variant-id="${variantData.id}"` : ''}>
              <div class="bundle-option-main">
                <div class="bundle-option-selection">
                   <input type="checkbox" id="option-${input.id}-${option.id}" ${this.isOptionSelected(input.id, option.id) ? 'checked' : ''} ${isOutOfStock ? 'disabled' : ''}> 
                   <label for="option-${input.id}-${option.id}">${label}</label>
                </div>
                 <div class="bundle-option-details">
                    ${priceDisplay}
                    ${stockIndicator}
                 </div>
              </div>
              ${quantitySelector}
              ${showFileUpload ? `
                <div class="bundle-file-upload" data-show-upload="true">
                  <div class="bundle-file-upload-description">
                    Extensions de fichier pris en charge à l'envoi de fichier: pdf, jpg, jpeg, png
                  </div>
                  <label>
                    <input type="file" data-file-input data-input-id="${input.id}" data-option-id="${option.id}" accept=".pdf,.jpg,.jpeg,.png">
                    Upload File
                  </label>
                  <div class="bundle-file-preview"></div>
                </div>
              `: ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderRadioButtons(input) {
    return `
      <div class="bundle-options" data-type="radio">
        ${input.options.map(option => {
          let showFileUpload = !!option.showFileUpload;
          let priceDisplay = '';
          if (option.price && option.price.value > 0) {
             priceDisplay = `<span class="bundle-option-price">${this.formatPrice(option.price)}</span>`;
          }

          return `
            <div class="bundle-option" data-type="radio" data-option-id="${option.id}">
              <div class="bundle-option-label">
                <label>
                  <input type="radio" name="input_${input.id}" ${this.isOptionSelected(input.id, option.id) ? 'checked' : ''}>
                  ${option.label}
                </label>
                ${priceDisplay}
              </div>
              ${showFileUpload ? `
                <div class="bundle-file-upload" data-show-upload="true">
                  <div class="bundle-file-upload-description">
                    Extensions de fichier pris en charge à l'envoi de fichier: pdf, jpg, jpeg, png
                  </div>
                  <label class="button button--secondary">
                    <input type="file" data-file-input data-input-id="${input.id}" data-option-id="${option.id}" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                    Upload File
                  </label>
                  <div class="bundle-file-preview"></div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderFileUpload(input) {
    return `
      <div class="bundle-file-upload" data-input-id="${input.id}">
         <label class="button button--secondary">
            <input type="file" data-file-input data-input-id="${input.id}" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
            Upload File
         </label>
        <div class="bundle-file-preview"></div>
      </div>
    `;
  }

  renderTableInput(input) {
    if (!window.product || !window.product.variants) {
      console.error('Product data not available');
      return '<div class="bundle-error">Product data not available</div>';
    }

    // Get the variant IDs from the input options and extract numeric IDs from GIDs
    const variantIds = input.options.map(opt => {
      // Extract numeric ID from GID string and convert to number
      const match = opt.id.match(/\/ProductVariant\/(\d+)/);
      return match ? parseInt(match[1], 10) : parseInt(opt.id, 10);
    });
    
    console.log('Looking for variants with IDs:', variantIds);
    console.log('Available variants:', window.product.variants);
    
    // Filter product variants to only show those in the input options
    const variants = window.product.variants.filter(v => variantIds.includes(v.id));
    
    if (variants.length === 0) {
      console.error('No matching variants found. Expected IDs:', variantIds);
      console.error('Available variant IDs:', window.product.variants.map(v => v.id));
      return '<div class="bundle-error">No matching variants found</div>';
    }

    return `
      <div class="variant-selector-table" data-input-id="${input.id}">
        <div class="variant-table-wrapper">
          <table class="variant-table">
            <thead>
              <tr>
                ${window.product.options.map(option => `
                  <th>${option.name}</th>
                `).join('')}
                <th>Quantity</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              ${variants.map(variant => {
                // Find the variant GID for the Storefront API map
                const variantGid = `gid://shopify/ProductVariant/${variant.id}`;
                const quantityAvailable = this.variantQuantities ? this.variantQuantities[variantGid] : null;
                console.log('Variant', variant.id, 'quantityAvailable:', quantityAvailable);
                return `
                  <tr class="variant-row" data-variant-id="${variant.id}">
                    ${window.product.options.map((option, index) => {
                      const optionName = `option${index + 1}`;
                      const optionValue = variant[optionName];
                      if (option.name.toLowerCase().includes('color') || option.name.toLowerCase().includes('couleur')) {
                        let color = optionValue && optionValue.trim() ? optionValue : '#ccc';
                        const isColor = /^#([0-9a-f]{3}){1,2}$/i.test(color) || /^(rgb|hsl)a?\(/i.test(color) || /^[a-z]+$/i.test(color);
                        if (!isColor) color = '#ccc';
                        return `
                          <td class="color-cell">
                            <span class="color-swatch" style="display:inline-block;width:24px;height:24px;border-radius:50%;border:1px solid #ddd;background:${color};min-width:24px;min-height:24px;"></span>
                          </td>
                        `;
                      }
                      return `<td class="option-cell">${optionValue}</td>`;
                    }).join('')}
                    <td class="quantity-cell">
                      <div class="quantity-selector ${(quantityAvailable === 0) ? 'disabled' : ''}">
                        <button class="quantity-button minus" aria-label="Decrease quantity" ${(quantityAvailable === 0) ? 'disabled' : ''}>-</button>
                        <input type="number" class="quantity-input" value="0" min="0" max="${quantityAvailable !== null ? quantityAvailable : 9999}" aria-label="Quantity" ${(quantityAvailable === 0) ? 'disabled' : ''} data-price="${variant.price}">
                        <button class="quantity-button plus" aria-label="Increase quantity" ${(quantityAvailable === 0) ? 'disabled' : ''}>+</button>
                      </div>
                    </td>
                    <td class="price-cell">
                      <span class="original-price">${this.formatPrice({ value: variant.price / 100, type: 'fixed' })}</span>
                      ${variant.compare_at_price && variant.compare_at_price > variant.price ? `<span class="discounted-price">${this.formatPrice({ value: variant.compare_at_price / 100, type: 'fixed' })}</span>` : ''}
                    </td>
                    <td class="stock-cell">
                      ${(quantityAvailable > 0)
                        ? `<span class="stock-icon in-stock" title="In stock">✓</span>`
                        : `<span class="stock-icon restock" title="Restocking">⏱</span>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    this.container.addEventListener('click', (e) => {
      // Handle radio option card clicks
      if (e.target.closest('.bundle-option[data-type="radio"]')) {
        const option = e.target.closest('.bundle-option');
        const radio = option.querySelector('input[type="radio"]');
        if (!radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Handle quantity buttons (table and options)
      if (
        e.target.classList.contains('quantity-button') ||
        e.target.classList.contains('quantity-decrease') ||
        e.target.classList.contains('quantity-increase') ||
        e.target.classList.contains('minus') ||
        e.target.classList.contains('plus')
      ) {
        let input;
        if (e.target.closest('.quantity-selector')) {
          input = e.target.closest('.quantity-selector').querySelector('input[type="number"]');
        } else if (e.target.closest('.bundle-option-quantity')) {
          input = e.target.closest('.bundle-option-quantity').querySelector('input[type="number"]');
        }
        if (!input || input.disabled) return;
        let value = parseInt(input.value, 10);
        const min = parseInt(input.min, 10);
        let max = parseInt(input.max, 10);
        if (!max || isNaN(max)) max = 9999;
        if ((e.target.classList.contains('quantity-decrease') || e.target.classList.contains('minus')) && value > min) value--;
        if ((e.target.classList.contains('quantity-increase') || e.target.classList.contains('plus')) && value < max) value++;
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    this.container.addEventListener('change', (e) => {
      const option = e.target.closest('.bundle-option');
      if (!option) {
        // Table row quantity change
        if (e.target.type === 'number') {
          this.updatePrice();
        }
        return;
      }
      const input = option.closest('.bundle-input');
      const inputId = input.dataset.inputId;
      const optionId = option.dataset.optionId;
      const inputType = input.querySelector('.bundle-options').dataset.type;
      if (e.target.type === 'checkbox' || e.target.type === 'radio') {
        if (e.target.type === 'radio') {
          input.querySelectorAll('.bundle-option').forEach(opt => {
            opt.classList.remove('selected');
          });
        }
        if (e.target.checked) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
        this.handleOptionSelection(inputId, optionId, e.target.checked, inputType);
        this.updatePrice();
        this.validateSelection();
      } else if (e.target.type === 'number') {
        this.handleQuantityChange(inputId, optionId, parseInt(e.target.value));
        this.updatePrice();
        this.validateSelection();
      } else if (e.target.type === 'file') {
        this.handleFileUpload(inputId, optionId, e.target.files[0]);
        this.updatePrice();
        this.validateSelection();
      }
    });

    this.addButton.addEventListener('click', () => this.addToCart());
  }

  handleOptionSelection(inputId, optionId, selected, type) {
    console.log('Option selection:', { inputId, optionId, selected, type });
    const key = `${inputId}_${optionId}`;

    // Find the option element and related quantity input
    const optionElement = this.container.querySelector(`[data-option-id="${optionId}"]`);
    if (!optionElement) {
        console.error('Could not find option element for', optionId);
        return;
    }
    const quantityInput = optionElement.querySelector('.quantity-input');
    const isVariantLinked = optionElement.classList.contains('variant-linked');
    let isOutOfStock = false;

    if (isVariantLinked && quantityInput) {
        const maxQty = parseInt(quantityInput.max, 10);
        isOutOfStock = maxQty === 0;
    }

    if (type === 'multi') {
        if (selected && !isOutOfStock) {
            optionElement.classList.add('selected');
            this.selectedOptions.set(key, { quantity: quantityInput ? parseInt(quantityInput.value) || 1 : 1 }); 
        } else {
            optionElement.classList.remove('selected');
            this.selectedOptions.delete(key);
        }
    } else { // radio 
        const inputElement = optionElement.closest('.bundle-input');
        // Deselect all other radio options in the same group and remove .selected class
        inputElement?.querySelectorAll('.bundle-option[data-type="radio"]').forEach(opt => {
            opt.classList.remove('selected');
        });
         // Clear other selections in the map for this input
        Array.from(this.selectedOptions.keys())
            .filter(k => k.startsWith(`${inputId}_`))
            .forEach(k => this.selectedOptions.delete(k));

        if (selected) {
            optionElement.classList.add('selected'); // Add selected class to the correct option
            this.selectedOptions.set(key, { quantity: 1 }); 
        } 
        // No need to explicitly remove class on deselection for radio, 
        // as selecting another implicitly deselects this one via the loop above.
    }

    console.log('Updated selections:', Object.fromEntries(this.selectedOptions));

    // Enable/disable quantity inputs based on selection AND stock status
    if (quantityInput) {
      quantityInput.disabled = !selected || isOutOfStock;
      const buttons = quantityInput.closest('.quantity-selector')?.querySelectorAll('.quantity-button');
      buttons?.forEach(btn => btn.disabled = !selected || isOutOfStock);
      console.log('Quantity input state updated:', { optionId, disabled: quantityInput.disabled });
    }
    
    // REMOVED direct style manipulation for file upload visibility
    // CSS will handle visibility based on the .selected class and data-show-upload attribute
  }

  handleQuantityChange(inputId, optionId, quantity) {
    const key = `${inputId}_${optionId}`;
    if (this.selectedOptions.has(key)) {
      this.selectedOptions.get(key).quantity = quantity;
    }
  }

  handleFileUpload(inputId, optionId, file) {
    const key = optionId ? `${inputId}_${optionId}` : inputId;
    const previewSelector = optionId 
      ? `[data-option-id="${optionId}"] .bundle-file-preview` 
      : `[data-input-id="${inputId}"].bundle-file-upload .bundle-file-preview`;
    const preview = this.container.querySelector(previewSelector);

    if (!preview) {
      console.error('Could not find preview element for', key);
      return;
    }

    if (file) {
      // Validate file type
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        alert('Type de fichier non pris en charge. Veuillez utiliser: pdf, jpg, jpeg, ou png');
        if (e && e.target) e.target.value = '';
        preview.textContent = '';
        this.files.delete(key);
        return;
      }

      this.files.set(key, file);
      preview.textContent = file.name;
    } else {
      preview.textContent = '';
      this.files.delete(key);
    }
  }

  updatePrice() {
    console.log('Updating price calculation');
    let totalPrice = this.basePrice;
    console.log('Starting with base price:', totalPrice);

    // Add price for selected options
    for (const [key, selection] of this.selectedOptions) {
      const [inputId, optionId] = key.split('_');
      const input = this.bundle.blocks
        .flatMap(block => block.inputs)
        .find(input => input.id === inputId);
      const option = input?.options.find(opt => opt.id === optionId);
      
      if (!option) continue; // Skip if option not found

      const quantity = selection.quantity || 1;
      const variantId = option.variant?.id;
      let variantData = null;

      if (variantId && window.product && window.product.variants) {
          // Extract numeric ID from GID for comparison
          const numericVariantId = parseInt(variantId.match(/\/ProductVariant\/(\d+)/)?.[1], 10);
          variantData = window.product.variants.find(v => v.id === numericVariantId);
      }

      if (variantData) {
        // If linked to a variant, use the variant's price
        totalPrice += (variantData.price / 100) * quantity;
      } else if (option.price) {
        // Otherwise, use the option's price modifier
        if (option.price.type === 'fixed') {
          totalPrice += option.price.value * quantity;
        } else { // percentage
          totalPrice += (this.basePrice * (option.price.value / 100)) * quantity;
        }
      }
    }

    // Add price for table variant quantities
    document.querySelectorAll('.variant-row .quantity-input').forEach(input => {
      if (input && !input.disabled) {
        const qty = parseInt(input.value, 10) || 0;
        const price = parseFloat(input.getAttribute('data-price')) / 100;
        totalPrice += qty * price;
      }
    });

    this.finalPriceElement.textContent = this.formatPrice({ value: totalPrice, type: 'fixed' });
  }

  validateSelection() {
    const isValid = this.bundle.blocks.every(block =>
      block.inputs
        .filter(input => input.required)
        .every(input => {
          const selectedForInput = Array.from(this.selectedOptions.keys())
            .filter(key => key.startsWith(`${input.id}_`));
          return selectedForInput.length > 0;
        })
    );

    this.addButton.disabled = !isValid;
  }

  async addToCart() {
    try {
      console.log('Adding bundle to cart');
      const formData = new FormData();
      formData.append('bundle_id', this.bundle.id);
      formData.append('product_id', this.productId);
      
      const selections = [];
      for (const [key, selection] of this.selectedOptions) {
        const [inputId, optionId] = key.split('_');
        selections.push({
          input_id: inputId,
          option_id: optionId,
          quantity: selection.quantity || 1
        });

        if (this.files.has(key)) {
          formData.append(`file_${inputId}_${optionId}`, this.files.get(key));
        }
      }
      
      console.log('Cart selections:', selections);
      formData.append('selections', JSON.stringify(selections));

      const response = await fetch('/apps/bundle/api/cart/add', {
        method: 'POST',
        body: formData
      });

      console.log('Cart API response:', response);

      if (!response.ok) throw new Error(`Failed to add to cart: ${response.status}`);

      if (typeof window.refreshCart === 'function') {
        window.refreshCart();
      } else {
        window.location.href = '/cart';
      }
    } catch (error) {
      console.error('Cart error:', error);
      alert('Failed to add bundle to cart. Please try again.');
    }
  }

  formatPrice(price) {
    if (!price || price.value <= 0) return '';
    const value = price.type === 'percentage' 
      ? `${price.value}%`
      : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price.value);
    return price.type === 'percentage' ? `+${value}` : value;
  }

  isOptionSelected(inputId, optionId) {
    return this.selectedOptions.has(`${inputId}_${optionId}`);
  }

  getOptionQuantity(inputId, optionId) {
    const selection = this.selectedOptions.get(`${inputId}_${optionId}`);
    return selection ? selection.quantity : 1;
  }
}

// Initialize bundle app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, looking for bundle containers');
  const bundleContainers = document.querySelectorAll('[data-bundle-app]');
  console.log('Found bundle containers:', bundleContainers);
  
  bundleContainers.forEach(container => {
    try {
      new BundleApp(container);
    } catch (error) {
      console.error('Failed to initialize bundle container:', error);
      container.innerHTML = `<div class="bundle-error" style="color: red; padding: 1em;">
        Failed to initialize bundle: ${error.message}
      </div>`;
    }
  });
}); 