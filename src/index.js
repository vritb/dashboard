/**
 * Main entry point for the dashboard application
 *
 * This file initializes the application by creating and mounting
 * the App component, which orchestrates all other components.
 */

import App from './components/app.js';

document.addEventListener('DOMContentLoaded', () => {
  // Get the container element
  const container = document.getElementById('app-container');

  if (!container) {
    console.error('Container element not found');
    return;
  }

  // Create and mount the app
  const app = new App(container);
  app.mount();

  // Log initialization
  console.log('Dashboard application initialized');
});
