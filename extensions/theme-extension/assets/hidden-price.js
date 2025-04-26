// This script will handle any dynamic price updates
document.addEventListener('DOMContentLoaded', function() {
  // Handle dynamic price updates (e.g., for variants)
  const priceObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const priceContainer = mutation.target.closest('.price');
        if (priceContainer) {
          // Re-render the hidden price component if needed
          const event = new CustomEvent('price:updated', {
            detail: { container: priceContainer }
          });
          document.dispatchEvent(event);
        }
      }
    });
  });

  // Observe price elements for changes
  document.querySelectorAll('.price').forEach(function(priceElement) {
    priceObserver.observe(priceElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  });
}); 