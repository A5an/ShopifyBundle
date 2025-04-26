class VariantTable {
  constructor(container) {
    this.container = container;
    this.productId = container.dataset.productId;
    this.quantityInputs = container.querySelectorAll('.quantity-input');
    
    // Log variant inventory data
    this.container.querySelectorAll('.variant-row').forEach(row => {
      const variantId = row.dataset.variantId;
      const input = row.querySelector('.quantity-input');
      const maxQuantity = input.getAttribute('max');
      const isAvailable = !input.disabled;
      console.log('Variant Data:', {
        variantId,
        inventoryQuantity: maxQuantity,
        isAvailable,
      });
    });

    this.initializeQuantityControls();
    this.initializeTooltips();
  }

  initializeQuantityControls() {
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('quantity-button') && !e.target.disabled) {
        const input = e.target.parentNode.querySelector('.quantity-input');
        const isPlus = e.target.classList.contains('plus');
        const maxQuantity = parseInt(input.getAttribute('max')) || 0;
        
        let value = parseInt(input.value) || 0;
        if (isPlus) {
          value = value < maxQuantity ? value + 1 : maxQuantity;
        } else {
          value = Math.max(0, value - 1);
        }
        
        input.value = value;
        this.updateTotalPrice();
      }
    });

    this.quantityInputs.forEach(input => {
      input.addEventListener('change', () => {
        const maxQuantity = parseInt(input.getAttribute('max')) || 0;
        let value = parseInt(input.value) || 0;
        
        // Ensure value is between 0 and max
        value = Math.max(0, Math.min(value, maxQuantity));
        input.value = value;
        
        this.updateTotalPrice();
      });
    });
  }

  updateTotalPrice() {
    let total = 0;
    let items = [];

    this.quantityInputs.forEach(input => {
      const quantity = parseInt(input.value) || 0;
      if (quantity > 0) {
        const row = input.closest('.variant-row');
        const variantId = row.dataset.variantId;
        const price = parseInt(input.dataset.price);
        
        // Get all option values from the row
        const item = {
          variantId,
          quantity,
          price: price,
          total: quantity * price
        };

        // Add all options to the item
        row.querySelectorAll('.option-cell, .color-cell').forEach((cell, index) => {
          const optionName = this.container.querySelector('thead th:nth-child(' + (index + 1) + ')').textContent.trim();
          const optionValue = cell.classList.contains('color-cell') 
            ? cell.querySelector('.color-swatch').dataset.color
            : cell.textContent;
          item[optionName.toLowerCase()] = optionValue;
        });
        
        total += quantity * price;
        items.push(item);
      }
    });

    // Dispatch event with detailed information
    const event = new CustomEvent('variant-table:price-updated', {
      detail: { 
        total: total,
        items: items
      }
    });
    this.container.dispatchEvent(event);
  }

  initializeTooltips() {
    const stockIcons = this.container.querySelectorAll('.stock-icon');
    stockIcons.forEach(icon => {
      const title = icon.getAttribute('title');
      
      icon.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.classList.add('stock-tooltip');
        tooltip.textContent = title;
        document.body.appendChild(tooltip);
        
        const rect = icon.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
        tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
      });

      icon.addEventListener('mouseleave', () => {
        const tooltip = document.querySelector('.stock-tooltip');
        if (tooltip) tooltip.remove();
      });
    });
  }
}

// Initialize all variant tables on the page
document.addEventListener('DOMContentLoaded', () => {
  const tables = document.querySelectorAll('.variant-selector-table');
  tables.forEach(table => new VariantTable(table));
}); 