/**
 * Data Service
 *
 * This module provides services for loading, validating, and processing protocol data.
 * It acts as a centralized data access layer for the application.
 */

import EVENT_TAXONOMY from '../models/event-taxonomy.js';
import STATUS_SCALE from '../models/status-scale.js';

class DataService {
  constructor() {
    this.data = null;
    this.processedData = null;
    this.cache = new Map();
    this.listeners = new Set();
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Load protocol data from the server
   * @param {string} url - URL to fetch the data from
   * @returns {Promise<Object>} The processed protocol data
   */
  async loadData(url = 'data/mestinon-intake-protocol.json') {
    try {
      this.isLoading = true;
      this.error = null;
      this._notifyListeners();

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch protocol data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Store the original data
      this.data = data;

      // Process and standardize the data
      this.processedData = this._processData(data);

      // Clear cache when new data is loaded
      this.cache.clear();

      this.isLoading = false;
      this._notifyListeners();

      return this.processedData;
    } catch (error) {
      this.isLoading = false;
      this.error = error.message;
      this._notifyListeners();
      throw error;
    }
  }

  /**
   * Get the current protocol data
   * @returns {Object} The processed protocol data
   */
  getData() {
    return this.processedData;
  }

  /**
   * Process and standardize protocol data
   * @param {Object} data - The raw protocol data
   * @returns {Object} The processed protocol data
   * @private
   */
  _processData(data) {
    if (!data || !data.events || !Array.isArray(data.events)) {
      return data;
    }

    // Clone the data to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(data));

    // Process events
    processedData.events = processedData.events.map(event => {
      // Parse date
      if (event.date) {
        event.date = new Date(event.date);
      }

      // Standardize event type
      const originalType = event.type;
      event.standardType = EVENT_TAXONOMY.mapLegacyType(originalType);
      event.standardTypeDisplay = EVENT_TAXONOMY.getDisplayName(event.standardType);

      // Standardize status
      event.statusInfo = STATUS_SCALE.mapLegacyStatus(event.status, event.type);

      return event;
    });

    // Sort events by date
    processedData.events.sort((a, b) => a.date - b.date);

    return processedData;
  }

  /**
   * Validate protocol data against schema
   * @param {Object} data - The protocol data to validate
   * @returns {Object} Validation result with errors if any
   */
  validateData(data) {
    // This would use a JSON Schema validator in a real implementation
    // For now, just do basic structure validation

    const errors = [];

    // Check required top-level properties
    if (!data) {
      errors.push('Data is null or undefined');
      return { valid: false, errors };
    }

    if (!data.meta) {
      errors.push('Missing required property: meta');
    }

    if (!data.events || !Array.isArray(data.events)) {
      errors.push('Missing required property: events (must be an array)');
    }

    // Check meta properties
    if (data.meta) {
      if (!data.meta.title) {
        errors.push('Missing required property: meta.title');
      }

      if (!data.meta.description) {
        errors.push('Missing required property: meta.description');
      }

      if (!data.meta.author) {
        errors.push('Missing required property: meta.author');
      }
    }

    // Check events
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach((event, index) => {
        if (!event.date) {
          errors.push(`Event at index ${index} is missing required property: date`);
        }

        if (!event.type) {
          errors.push(`Event at index ${index} is missing required property: type`);
        }

        if (!event.status) {
          errors.push(`Event at index ${index} is missing required property: status`);
        }

        // Check date format
        if (event.date && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(event.date)) {
          errors.push(`Event at index ${index} has invalid date format. Expected: YYYY-MM-DD HH:MM`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get unique event types from the data
   * @returns {string[]} Array of unique event types
   */
  getEventTypes() {
    if (!this.processedData || !this.processedData.events) {
      return [];
    }

    const cacheKey = 'event-types';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const types = [...new Set(this.processedData.events.map(event => event.type))];
    this.cache.set(cacheKey, types);
    return types;
  }

  /**
   * Get standardized event types from the data
   * @returns {string[]} Array of standardized event types
   */
  getStandardEventTypes() {
    if (!this.processedData || !this.processedData.events) {
      return [];
    }

    const cacheKey = 'standard-event-types';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const types = [...new Set(this.processedData.events.map(event => event.standardType))];
    this.cache.set(cacheKey, types);
    return types;
  }

  /**
   * Filter events by type
   * @param {string[]} types - Array of event types to include
   * @returns {Object[]} Filtered events
   */
  filterEventsByType(types) {
    if (!this.processedData || !this.processedData.events) {
      return [];
    }

    if (!types || types.length === 0) {
      return this.processedData.events;
    }

    return this.processedData.events.filter(event =>
      types.includes(event.type) || types.includes(event.standardType)
    );
  }

  /**
   * Filter events by date range
   * @param {Date} startDate - Start date for the range
   * @param {Date} endDate - End date for the range
   * @returns {Object[]} Filtered events
   */
  filterEventsByDateRange(startDate, endDate) {
    if (!this.processedData || !this.processedData.events) {
      return [];
    }

    if (!startDate && !endDate) {
      return this.processedData.events;
    }

    return this.processedData.events.filter(event => {
      if (startDate && event.date < startDate) {
        return false;
      }

      if (endDate && event.date > endDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get event counts by type
   * @returns {Object} Map of event types to counts
   */
  getEventCounts() {
    if (!this.processedData || !this.processedData.events) {
      return {};
    }

    const cacheKey = 'event-counts';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const counts = {};
    this.processedData.events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    this.cache.set(cacheKey, counts);
    return counts;
  }

  /**
   * Get standard event counts by type
   * @returns {Object} Map of standardized event types to counts
   */
  getStandardEventCounts() {
    if (!this.processedData || !this.processedData.events) {
      return {};
    }

    const cacheKey = 'standard-event-counts';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const counts = {};
    this.processedData.events.forEach(event => {
      counts[event.standardType] = (counts[event.standardType] || 0) + 1;
    });

    this.cache.set(cacheKey, counts);
    return counts;
  }

  /**
   * Analyze patterns after medication intake
   * @param {number} hours - Hours after medication intake to analyze
   * @returns {Object} Analysis results
   */
  analyzePatternsAfterMedication(hours = 4) {
    if (!this.processedData || !this.processedData.events) {
      return { improvements: [], sideEffects: [] };
    }

    const cacheKey = `patterns-after-medication-${hours}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const medicationEvents = this.processedData.events.filter(e =>
      e.type === 'Einnahme' || e.standardType === EVENT_TAXONOMY.MEDICATION.id
    );

    const improvements = [];
    const sideEffects = [];

    medicationEvents.forEach(med => {
      // Look at events within specified hours after medication
      const laterTime = new Date(med.date.getTime() + hours * 60 * 60 * 1000);
      const eventsAfterMed = this.processedData.events.filter(e =>
        e.date > med.date && e.date <= laterTime &&
        e.type !== 'Einnahme' && e.standardType !== EVENT_TAXONOMY.MEDICATION.id
      );

      eventsAfterMed.forEach(event => {
        const timeDiff = (event.date - med.date) / (1000 * 60); // Time difference in minutes

        // Check if this is a positive effect
        if (event.statusInfo.category === 'improvement' ||
            event.statusInfo.category === 'quality' ||
            event.status.toLowerCase().includes('kein')) {

          const existing = improvements.find(i => i.type === event.type);
          if (!existing) {
            improvements.push({
              type: event.type,
              standardType: event.standardType,
              timeRange: [timeDiff],
              status: [event.status]
            });
          } else {
            existing.timeRange.push(timeDiff);
            existing.status.push(event.status);
          }
        }

        // Check if this is a side effect
        else if (event.type.toLowerCase().includes('durchfall') ||
                event.type.toLowerCase().includes('übelkeit') ||
                event.type.toLowerCase().includes('bauch') ||
                event.status.toLowerCase().includes('schlecht')) {

          const existing = sideEffects.find(i => i.type === event.type);
          if (!existing) {
            sideEffects.push({
              type: event.type,
              standardType: event.standardType,
              timeRange: [timeDiff],
              status: [event.status]
            });
          } else {
            existing.timeRange.push(timeDiff);
            existing.status.push(event.status);
          }
        }
      });
    });

    // Calculate averages
    improvements.forEach(imp => {
      imp.avgTime = imp.timeRange.reduce((a, b) => a + b, 0) / imp.timeRange.length;
    });

    sideEffects.forEach(side => {
      side.avgTime = side.timeRange.reduce((a, b) => a + b, 0) / side.timeRange.length;
    });

    const result = { improvements, sideEffects };
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Estimate medication half-life based on symptom patterns
   * @returns {Object} Half-life estimation results
   */
  estimateHalfLife() {
    if (!this.processedData || !this.processedData.events) {
      return { estimated: false };
    }

    const cacheKey = 'half-life-estimation';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const doppelsehenEvents = this.processedData.events.filter(e =>
      e.type.includes('Doppelsehen') || e.standardType.includes('doppelsehen')
    );

    const medicationEvents = this.processedData.events.filter(e =>
      e.type === 'Einnahme' || e.standardType === EVENT_TAXONOMY.MEDICATION.id
    );

    if (doppelsehenEvents.length === 0 || medicationEvents.length === 0) {
      return { estimated: false, reason: 'Not enough data' };
    }

    // Find instances where symptoms return after medication
    const symptomsReturn = [];

    medicationEvents.forEach(med => {
      // Find improvements after medication
      const eventsAfterMed = doppelsehenEvents.filter(e => e.date > med.date);

      if (eventsAfterMed.length > 0) {
        // First, look for improvement
        const improvements = eventsAfterMed.filter(e =>
          e.status.toLowerCase().includes('besser') ||
          e.status.toLowerCase().includes('gut') ||
          e.status.toLowerCase().includes('kein')
        );

        if (improvements.length > 0) {
          // Sort by time
          improvements.sort((a, b) => a.date - b.date);
          const firstImprovement = improvements[0];

          // Then look for deterioration after improvement
          const deteriorations = eventsAfterMed.filter(e =>
            e.date > firstImprovement.date &&
            (e.status.toLowerCase().includes('schlecht') ||
            e.status.toLowerCase().includes('stark') ||
            e.status.toLowerCase().includes('vollständig'))
          );

          if (deteriorations.length > 0) {
            // Sort by time
            deteriorations.sort((a, b) => a.date - b.date);
            const firstDeterioration = deteriorations[0];

            // Calculate time from medication to deterioration
            const timeToDeterioration = (firstDeterioration.date - med.date) / (1000 * 60 * 60); // hours

            symptomsReturn.push({
              medication: med,
              improvement: firstImprovement,
              deterioration: firstDeterioration,
              timeToDeterioration: timeToDeterioration
            });
          }
        }
      }
    });

    if (symptomsReturn.length === 0) {
      return { estimated: false, reason: 'No clear pattern of symptom return' };
    }

    // Calculate average time to symptom return
    const avgTimeToDeterioration = symptomsReturn.reduce((sum, item) => sum + item.timeToDeterioration, 0) / symptomsReturn.length;

    // Estimate half-life based on symptom return
    // Half-life is approximately time to deterioration divided by 5 (assuming 5 half-lives for significant deterioration)
    const estimatedHalfLife = avgTimeToDeterioration / 5;

    // Consider dialysis effect
    const patientInfo = this.processedData.meta['medical-status'] || [];
    const dialysisPatient = patientInfo.some(info => info.toLowerCase().includes('dialyse'));

    const result = {
      estimated: true,
      estimatedHalfLife: estimatedHalfLife,
      avgTimeToDeterioration: avgTimeToDeterioration,
      dialysisPatient: dialysisPatient,
      samplesCount: symptomsReturn.length
    };

    if (dialysisPatient) {
      result.withoutDialysisEffect = estimatedHalfLife / 3;
      result.withDialysisEffect = estimatedHalfLife;
      result.mostLikely = estimatedHalfLife / 2;
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Subscribe to data changes
   * @param {Function} listener - Callback function to notify of changes
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
   * Notify all listeners of data changes
   * @private
   */
  _notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({
          data: this.processedData,
          isLoading: this.isLoading,
          error: this.error
        });
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService;
