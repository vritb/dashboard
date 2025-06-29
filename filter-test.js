// This script will be used to test the filter behavior by programmatically
// clicking on specific filters and capturing the results

// Wait for page to fully load
setTimeout(() => {
  console.log('Applying Einnahme filter only...');
  
  // First click "All" to reset
  document.querySelector('#event-filters .filter-item').click();
  
  // Then click "Einnahme" to activate only that filter
  const filters = document.querySelectorAll('#event-filters .filter-item');
  for (const filter of filters) {
    if (filter.textContent.trim() === 'Einnahme') {
      filter.click();
      console.log('Clicked on Einnahme filter');
      break;
    }
  }
  
  console.log('Filter applied. Check visualization to verify only Einnahme row is visible.');
}, 1000);