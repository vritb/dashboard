/**
 * Legend Component
 *
 * This component renders the color legend for event types.
 */

import * as d3 from 'd3';
import Component from './base-component.js';
import { createElement, clearElement } from '../utils/dom-utils.js';
import store from '../store/store.js';

export default class LegendComponent extends Component {
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
    const container = createElement('div', { className: 'legend' });

    // Get state
    const state = store.getState();
    if (state.data && state.data.events) {
      this.renderLegend(container, state);
    }

    return container;
  }

  update(state) {
    if (!this.element) return;

    // Clear container
    clearElement(this.element);

    // Render legend
    if (state.data && state.data.events) {
      this.renderLegend(this.element, state);
    }
  }

  renderLegend(container, state) {
    // Get event types
    const eventTypes = store.getEventTypes();

    // Generate color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(eventTypes);

    // Create legend items
    eventTypes.forEach(type => {
      // Create legend item
      const legendItem = createElement('div', { className: 'legend-item' });

      // Create color box
      const colorBox = createElement('div', {
        className: 'legend-color',
        style: { backgroundColor: colorScale(type) }
      });

      // Create label
      const label = createElement('span', {}, type);

      // Add to legend item
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);

      // Add to container
      container.appendChild(legendItem);
    });
  }
}
