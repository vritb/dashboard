/**
 * Base Component Class
 *
 * This module provides a base class for all components in the application.
 * It implements the component lifecycle and common functionality.
 */

import { clearElement } from '../utils/dom-utils.js';

/**
 * Base component class
 */
export default class Component {
  /**
   * Create a component
   * @param {HTMLElement} container - Container element
   * @param {Object} [options={}] - Component options
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Container element is required');
    }

    this.container = container;
    this.options = options;
    this.element = null;
    this.children = new Map();
    this.eventListeners = [];
    this.storeUnsubscribe = null;

    // Initialize the component
    this.initialize();
  }

  /**
   * Initialize the component
   * This method should be overridden by subclasses
   */
  initialize() {
    // Default implementation does nothing
  }

  /**
   * Render the component
   * This method should be overridden by subclasses
   * @returns {HTMLElement} The rendered element
   */
  render() {
    // Default implementation returns an empty div
    return document.createElement('div');
  }

  /**
   * Update the component
   * This method should be overridden by subclasses
   * @param {Object} [state] - New state data
   */
  update(state) {
    // Default implementation re-renders the component
    this.element = this.render();

    // Clear the container
    clearElement(this.container);

    // Append the element to the container
    this.container.appendChild(this.element);
  }

  /**
   * Mount the component to the container
   */
  mount() {
    // Render the component
    this.element = this.render();

    // Clear the container
    clearElement(this.container);

    // Append the element to the container
    this.container.appendChild(this.element);
  }

  /**
   * Unmount the component from the container
   */
  unmount() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  /**
   * Add a child component
   * @param {string} id - Child component ID
   * @param {Component} component - Child component
   */
  addChild(id, component) {
    if (!(component instanceof Component)) {
      throw new Error('Child must be a Component instance');
    }

    this.children.set(id, component);
  }

  /**
   * Get a child component by ID
   * @param {string} id - Child component ID
   * @returns {Component} Child component
   */
  getChild(id) {
    return this.children.get(id);
  }

  /**
   * Remove a child component
   * @param {string} id - Child component ID
   */
  removeChild(id) {
    const child = this.children.get(id);
    if (child) {
      child.destroy();
      this.children.delete(id);
    }
  }

  /**
   * Add an event listener
   * @param {HTMLElement} element - Element to listen to
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} [options] - Event listener options
   */
  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];
  }

  /**
   * Subscribe to store updates
   * @param {Function} callback - Callback function
   */
  subscribeToStore(store, callback) {
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
    }

    this.storeUnsubscribe = store.subscribe(callback);
  }

  /**
   * Unsubscribe from store updates
   */
  unsubscribeFromStore() {
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }
  }

  /**
   * Destroy the component
   * This method should be called when the component is no longer needed
   */
  destroy() {
    // Unsubscribe from store
    this.unsubscribeFromStore();

    // Remove event listeners
    this.removeEventListeners();

    // Destroy children
    this.children.forEach(child => child.destroy());
    this.children.clear();

    // Unmount the component
    this.unmount();
  }
}
