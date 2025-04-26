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
      
      const basePriceElement = container.querySelector('.bundle-base-price');
      if (!basePriceElement) {
        throw new Error('Base price element not found');
      }
      console.log('Base price element:', basePriceElement);
      
      this.basePrice = parseFloat(basePriceElement.textContent.replace(/[^0-9.]/g, ''));
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
      case 'ONE_SELECT':
        return this.renderSingleSelect(input);
      case 'RADIO':
        return this.renderRadioButtons(input);
      case 'FILE':
        return this.renderFileUpload(input);
      default:
        return '';
    }
  }

  renderMultiSelect(input) {
    return `
      <div class="bundle-options" data-type="multi">
        ${input.options.map(option => `
          <div class="bundle-option" data-option-id="${option.id}">
            <div class="bundle-option-label">
              <label>
                <input type="checkbox" ${this.isOptionSelected(input.id, option.id) ? 'checked' : ''}>
                ${option.label}
              </label>
              ${option.price && option.price.value > 0 ? `
                <span class="bundle-option-price">${this.formatPrice(option.price)}</span>
              ` : ''}
            </div>
            ${option.maxQuantity ? `
              <div class="bundle-option-quantity">
                <button type="button" class="quantity-decrease">-</button>
                <input type="number" min="1" max="${option.maxQuantity}" value="${this.getOptionQuantity(input.id, option.id)}" ${this.isOptionSelected(input.id, option.id) ? '' : 'disabled'}>
                <button type="button" class="quantity-increase">+</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderSingleSelect(input) {
    return `
      <div class="bundle-options" data-type="single">
        ${input.options.map(option => `
          <div class="bundle-option" data-option-id="${option.id}">
            <div class="bundle-option-label">
              <label>
                <input type="radio" name="input_${input.id}" ${this.isOptionSelected(input.id, option.id) ? 'checked' : ''}>
                ${option.label}
              </label>
              ${option.price && option.price.value > 0 ? `
                <span class="bundle-option-price">${this.formatPrice(option.price)}</span>
              ` : ''}
            </div>
            ${option.maxQuantity ? `
              <div class="bundle-option-quantity">
                <button type="button" class="quantity-decrease">-</button>
                <input type="number" min="1" max="${option.maxQuantity}" value="${this.getOptionQuantity(input.id, option.id)}" ${this.isOptionSelected(input.id, option.id) ? '' : 'disabled'}>
                <button type="button" class="quantity-increase">+</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderRadioButtons(input) {
    return `
      <div class="bundle-options" data-type="radio">
        ${input.options.map(option => `
          <div class="bundle-option" data-type="radio" data-option-id="${option.id}">
            <div class="bundle-option-label">
              <label>
                <input type="radio" name="input_${input.id}" ${this.isOptionSelected(input.id, option.id) ? 'checked' : ''}>
                ${option.label}
              </label>
              ${option.price && option.price.value > 0 ? `
                <span class="bundle-option-price">${this.formatPrice(option.price)}</span>
              ` : ''}
            </div>
            ${option.showFileUpload ? `
              <div class="bundle-file-upload" data-show-upload="true">
                <div class="bundle-file-upload-description">
                  Extensions de fichier pris en charge à l'envoi de fichier: pdf, jpg, jpeg, png
                </div>
                <label>
                  <input type="file" data-file-input accept=".pdf,.jpg,.jpeg,.png">
                  Upload File
                </label>
                <div class="bundle-file-preview"></div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderFileUpload(input) {
    return `
      <div class="bundle-file-upload">
        <label>
          <input type="file" data-file-input>
          Upload File
        </label>
        <div class="bundle-file-preview"></div>
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

      // Handle quantity buttons
      if (e.target.classList.contains('quantity-decrease') || e.target.classList.contains('quantity-increase')) {
        const input = e.target.closest('.bundle-option-quantity').querySelector('input');
        const currentValue = parseInt(input.value);
        const max = parseInt(input.max);
        const min = parseInt(input.min);

        if (e.target.classList.contains('quantity-decrease')) {
          if (currentValue > min) {
            input.value = currentValue - 1;
          }
        } else {
          if (currentValue < max) {
            input.value = currentValue + 1;
          }
        }

        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    this.container.addEventListener('change', (e) => {
      const option = e.target.closest('.bundle-option');
      if (!option) return;

      const input = option.closest('.bundle-input');
      const inputId = input.dataset.inputId;
      const optionId = option.dataset.optionId;
      const inputType = input.querySelector('.bundle-options').dataset.type;

      if (e.target.type === 'checkbox' || e.target.type === 'radio') {
        // Remove selected class from all options in the same input group
        if (e.target.type === 'radio') {
          input.querySelectorAll('.bundle-option').forEach(opt => {
            opt.classList.remove('selected');
          });
        }
        
        // Add selected class to the current option if checked
        if (e.target.checked) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }

        this.handleOptionSelection(inputId, optionId, e.target.checked, inputType);
      } else if (e.target.type === 'number') {
        this.handleQuantityChange(inputId, optionId, parseInt(e.target.value));
      } else if (e.target.type === 'file') {
        this.handleFileUpload(inputId, optionId, e.target.files[0]);
      }

      this.updatePrice();
      this.validateSelection();
    });

    this.addButton.addEventListener('click', () => this.addToCart());
  }

  handleOptionSelection(inputId, optionId, selected, type) {
    console.log('Option selection:', { inputId, optionId, selected, type });
    if (type === 'multi') {
      if (selected) {
        this.selectedOptions.set(`${inputId}_${optionId}`, { quantity: 1 });
      } else {
        this.selectedOptions.delete(`${inputId}_${optionId}`);
      }
    } else {
      // For radio and single select, clear other selections for this input
      Array.from(this.selectedOptions.keys())
        .filter(key => key.startsWith(`${inputId}_`))
        .forEach(key => this.selectedOptions.delete(key));

      if (selected) {
        this.selectedOptions.set(`${inputId}_${optionId}`, { quantity: 1 });
      }
    }

    console.log('Updated selections:', Object.fromEntries(this.selectedOptions));

    // Enable/disable quantity inputs
    const option = this.container.querySelector(`[data-option-id="${optionId}"]`);
    const quantityInput = option.querySelector('input[type="number"]');
    if (quantityInput) {
      quantityInput.disabled = !selected;
      console.log('Quantity input state updated:', { optionId, disabled: !selected });
    }
  }

  handleQuantityChange(inputId, optionId, quantity) {
    const key = `${inputId}_${optionId}`;
    if (this.selectedOptions.has(key)) {
      this.selectedOptions.get(key).quantity = quantity;
    }
  }

  handleFileUpload(inputId, optionId, file) {
    if (file) {
      // Validate file type
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        alert('Type de fichier non pris en charge. Veuillez utiliser: pdf, jpg, jpeg, ou png');
        return;
      }

      this.files.set(`${inputId}_${optionId}`, file);
      const preview = this.container.querySelector(`[data-option-id="${optionId}"] .bundle-file-preview`);
      preview.textContent = file.name;
    }
  }

  updatePrice() {
    console.log('Updating price calculation');
    let totalPrice = this.basePrice;
    console.log('Starting with base price:', totalPrice);

    for (const [key, selection] of this.selectedOptions) {
      const [inputId, optionId] = key.split('_');
      const input = this.bundle.blocks
        .flatMap(block => block.inputs)
        .find(input => input.id === inputId);
      const option = input.options.find(opt => opt.id === optionId);

      console.log('Processing option:', { key, option, selection });

      if (option.price) {
        const quantity = selection.quantity || 1;
        if (option.price.type === 'fixed') {
          const addition = option.price.value * quantity;
          totalPrice += addition;
          console.log('Added fixed price:', { addition, newTotal: totalPrice });
        } else {
          const addition = (this.basePrice * (option.price.value / 100)) * quantity;
          totalPrice += addition;
          console.log('Added percentage price:', { addition, newTotal: totalPrice });
        }
      }
    }

    console.log('Final price:', totalPrice);
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