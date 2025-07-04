/**
 * Store Module
 *
 * This module provides a simple state management system for the application.
 * It implements a pub-sub pattern to keep the UI in sync with the data.
 */

import dataService from '../services/data-service.js';

// Initial state
const initialState = {
  data: null,
  isLoading: false,
  error: null,
  ui: {
    activeFilters: [],
    dateRange: null,
    zoomLevel: 1,
    selectedEvent: null
  }
};

class Store {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.prevState = null;

    // Subscribe to data service changes
    dataService.subscribe(dataState => {
      this.setState({
        data: dataState.data,
        isLoading: dataState.isLoading,
        error: dataState.error
      });
    });
  }

  /**
   * Get the current state
   * @returns {Object} The current state
   */
  getState() {
    return this.state;
  }

  /**
   * Set the state
   * @param {Object} newState - The new state
   * @param {boolean} [merge=true] - Whether to merge with the current state
   */
  setState(newState, merge = true) {
    // Save previous state for comparison
    this.prevState = { ...this.state };

    // Update the state
    if (merge) {
      this.state = {
        ...this.state,
        ...newState,
        // Deep merge UI state
        ui: {
          ...this.state.ui,
          ...(newState.ui || {})
        }
      };
    } else {
      this.state = { ...newState };
    }

    // Notify listeners
    this._notifyListeners();
  }

  /**
   * Reset the state to initial values
   */
  resetState() {
    this.setState({ ...initialState }, false);
  }

  /**
   * Load data
   * @param {string} [url] - URL to fetch the data from
   * @returns {Promise<Object>} The processed protocol data
   */
  async loadData(url) {
    return dataService.loadData(url);
  }

  /**
   * Set active filters
   * @param {string[]} filters - Array of event types to filter by
   */
  setActiveFilters(filters) {
    this.setState({
      ui: {
        ...this.state.ui,
        activeFilters: filters
      }
    });
  }

  /**
   * Clear active filters
   */
  clearFilters() {
    this.setState({
      ui: {
        ...this.state.ui,
        activeFilters: []
      }
    });
  }

  /**
   * Toggle a filter
   * @param {string} filter - Filter to toggle
   */
  toggleFilter(filter) {
    const activeFilters = [...this.state.ui.activeFilters];
    const index = activeFilters.indexOf(filter);

    if (index === -1) {
      activeFilters.push(filter);
    } else {
      activeFilters.splice(index, 1);
    }

    this.setState({
      ui: {
        ...this.state.ui,
        activeFilters
      }
    });
  }

  /**
   * Set date range filter
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  setDateRange(startDate, endDate) {
    this.setState({
      ui: {
        ...this.state.ui,
        dateRange: { startDate, endDate }
      }
    });
  }

  /**
   * Clear date range filter
   */
  clearDateRange() {
    this.setState({
      ui: {
        ...this.state.ui,
        dateRange: null
      }
    });
  }

  /**
   * Set zoom level
   * @param {number} zoomLevel - Zoom level
   */
  setZoomLevel(zoomLevel) {
    this.setState({
      ui: {
        ...this.state.ui,
        zoomLevel
      }
    });
  }

  /**
   * Select an event
   * @param {Object} event - The event to select
   */
  selectEvent(event) {
    this.setState({
      ui: {
        ...this.state.ui,
        selectedEvent: event
      }
    });
  }

  /**
   * Clear selected event
   */
  clearSelectedEvent() {
    this.setState({
      ui: {
        ...this.state.ui,
        selectedEvent: null
      }
    });
  }

  /**
   * Get filtered events
   * @returns {Object[]} Filtered events
   */
  getFilteredEvents() {
    if (!this.state.data || !this.state.data.events) {
      return [];
    }

    let filtered = this.state.data.events;

    // Apply type filters
    if (this.state.ui.activeFilters && this.state.ui.activeFilters.length > 0) {
      filtered = filtered.filter(event =>
        this.state.ui.activeFilters.includes(event.type) ||
        this.state.ui.activeFilters.includes(event.standardType)
      );
    }

    // Apply date range filter
    if (this.state.ui.dateRange) {
      const { startDate, endDate } = this.state.ui.dateRange;

      if (startDate) {
        filtered = filtered.filter(event => event.date >= startDate);
      }

      if (endDate) {
        filtered = filtered.filter(event => event.date <= endDate);
      }
    }

    return filtered;
  }

  /**
   * Get visible event types (from filtered events)
   * @returns {string[]} Array of visible event types
   */
  getVisibleEventTypes() {
    const filtered = this.getFilteredEvents();
    if (filtered.length === 0) {
      return [];
    }

    return [...new Set(filtered.map(event => event.type))];
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   * @private
   */
  _notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, this.prevState);
      } catch (error) {
        console.error('Error in store listener:', error);
      }
    });
  }
}

// Create and export a singleton instance
const store = new Store(initialState);
export default store;
