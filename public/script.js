document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results');
  const loadingIndicator = document.getElementById('loading');
  
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const query = searchInput.value.trim();
      if (!query) return;
      
      // Show loading indicator
      loadingIndicator.style.display = 'block';
      resultsContainer.innerHTML = '';
      
      try {
        const response = await fetch(`/api/products?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }
        
        const data = await response.json();
        displayResults(data);
      } catch (error) {
        resultsContainer.innerHTML = `
          <div class="error-message">
            <p>Error: ${error.message}</p>
            <p>Please try again later.</p>
          </div>
        `;
      } finally {
        loadingIndicator.style.display = 'none';
      }
    });
  }
  
  function displayResults(products) {
    if (!products || products.length === 0) {
      resultsContainer.innerHTML = '<p class="no-results">No products found. Try a different search term.</p>';
      return;
    }
    
    const resultsHTML = products.map(product => `
      <div class="product-card">
        <div class="product-image">
          ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<div class="no-image">No image</div>'}
        </div>
        <div class="product-details">
          <h3>${product.name}</h3>
          <p class="product-price">${product.price}</p>
          <p class="product-store">${product.store}</p>
          ${product.url ? `<a href="${product.url}" target="_blank" class="view-button">View Product</a>` : ''}
        </div>
      </div>
    `).join('');
    
    resultsContainer.innerHTML = resultsHTML;
  }
});

