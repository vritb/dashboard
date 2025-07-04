/**
 * Filter Component
 *
 * This component renders filter buttons for event types and handles filtering.
 */

import Component from './base-component.js';
import { createElement, clearElement } from '../utils/dom-utils.js';
import store from '../store/store.js';

export default class FilterComponent extends Component {
  initialize() {
    // Subscribe to store changes
    this.subscribeToStore(store, state => {
      if (state.data && state.data.events) {
        this.update(state);
      }
    });
  }

  render() {
    // Create container
    const container = createElement('div', { className: 'filters' });

    // Get event types
    const state = store.getState();
    if (state.data && state.data.events) {
      this.renderFilters(container, state);
    }

    return container;
  }

  update(state) {
    if (!this.element) return;

    // Clear container
    clearElement(this.element);

    // Render filters
    this.renderFilters(this.element, state);
  }

  renderFilters(container, state) {
    const eventTypes = state.data ? store.getEventTypes() : [];
    const activeFilters = state.ui.activeFilters || [];

    // Add "All" filter
    const allFilter = createElement('div', {
      className: `filter-item ${activeFilters.length === 0 ? 'active' : ''}`,
      onclick: () => this.handleAllFilter()
    }, 'Alle');

    container.appendChild(allFilter);

    // Add event type filters
    eventTypes.forEach(type => {
      const isActive = activeFilters.includes(type);

      const filterItem = createElement('div', {
        className: `filter-item ${isActive ? 'active' : ''}`,
        onclick: () => this.handleFilterClick(type),
        dataset: { type }
      }, type);

      container.appendChild(filterItem);
    });
  }

  handleAllFilter() {
    // Clear all filters
    store.clearFilters();
  }

  handleFilterClick(type) {
    // Toggle filter
    store.toggleFilter(type);
  }
}
