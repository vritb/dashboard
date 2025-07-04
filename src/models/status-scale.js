/**
 * Status Scale Model
 *
 * This module provides standardized scales for status values in the protocol data.
 * It includes mapping functions to convert legacy status descriptions to standardized values.
 */

const STATUS_SCALE = {
  // Severity scale (0-5)
  SEVERITY: {
    NONE: {
      id: 'none',
      value: 0,
      display: 'Keine',
      mappings: ['kein', 'keine', 'none', 'nicht vorhanden']
    },
    VERY_MILD: {
      id: 'very_mild',
      value: 1,
      display: 'Sehr leicht',
      mappings: ['sehr leicht', 'kaum', 'minimal', 'etwas', 'leich']
    },
    MILD: {
      id: 'mild',
      value: 2,
      display: 'Leicht',
      mappings: ['leicht', 'wenig', 'leidht', 'schwach']
    },
    MODERATE: {
      id: 'moderate',
      value: 3,
      display: 'Mittel',
      mappings: ['mittel', 'mäßig', 'mittelmäßig', 'mittelstark', 'mittelstart', 'mäßgut', 'befriedigend', 'erträglich']
    },
    SEVERE: {
      id: 'severe',
      value: 4,
      display: 'Stark',
      mappings: ['stark', 'viel', 'schwer', 'schlecht', 'deutlich']
    },
    VERY_SEVERE: {
      id: 'very_severe',
      value: 5,
      display: 'Sehr stark',
      mappings: ['sehr stark', 'extrem', 'vollständig', 'häufig und start']
    }
  },

  // Special status for medication intake
  MEDICATION: {
    id: 'medication',
    specialType: 'dosage',
    mappings: ['60mg', '30mg', '90mg', '120mg']
  },

  // Quality scale (good to bad)
  QUALITY: {
    VERY_GOOD: {
      id: 'very_good',
      value: 5,
      display: 'Sehr gut',
      mappings: ['sehr gut', 'ausgezeichnet']
    },
    GOOD: {
      id: 'good',
      value: 4,
      display: 'Gut',
      mappings: ['gut', 'normal', 'beschwerdefrei']
    },
    FAIR: {
      id: 'fair',
      value: 3,
      display: 'Befriedigend',
      mappings: ['befriedigend', 'erträglich']
    },
    POOR: {
      id: 'poor',
      value: 2,
      display: 'Schlecht',
      mappings: ['schlecht', 'schlech', 'unzureichend']
    },
    VERY_POOR: {
      id: 'very_poor',
      value: 1,
      display: 'Sehr schlecht',
      mappings: ['sehr schlecht', 'extrem schlecht']
    }
  },

  // Improvement scale
  IMPROVEMENT: {
    SIGNIFICANT: {
      id: 'significant_improvement',
      value: 3,
      display: 'Deutliche Besserung',
      mappings: ['deutliche besserung', 'starke besserung', 'viel besser']
    },
    MODERATE: {
      id: 'moderate_improvement',
      value: 2,
      display: 'Besserung',
      mappings: ['besserung', 'besser', 'bessert']
    },
    SLIGHT: {
      id: 'slight_improvement',
      value: 1,
      display: 'Leichte Besserung',
      mappings: ['leichte besserung', 'etwas besser', 'leicht besser', 'leicht besserung']
    },
    NONE: {
      id: 'no_improvement',
      value: 0,
      display: 'Keine Besserung',
      mappings: ['keine besserung', 'unverändert', 'keine wirkung', 'kaum besserung']
    }
  },

  // Time-based descriptions
  TIME_BASED: {
    id: 'time_based',
    display: 'Zeitlich begrenzt',
    mappings: ['kurzzeitig', 'zeitweise', 'häufiger', 'gelegentlich', '30s bis 2min']
  },

  // Fluctuating symptoms
  FLUCTUATING: {
    id: 'fluctuating',
    display: 'Wechselnd',
    mappings: ['wechselnd', 'ständig wechselnd', 'zunehmend wechselhaft']
  },

  // Consistency descriptions
  CONSISTENCY: {
    id: 'consistency',
    display: 'Konsistenz',
    mappings: ['breiig', 'wässrig', 'flüssig']
  },

  // Map legacy status to standardized values
  mapLegacyStatus(legacyStatus, eventType) {
    const normalized = (legacyStatus || '').toLowerCase().trim();

    // For medication events, preserve dosage
    if (eventType?.toLowerCase()?.includes('einnahme')) {
      if (this.MEDICATION.mappings.includes(normalized)) {
        return {
          standardId: this.MEDICATION.id,
          standardValue: normalized,
          originalValue: legacyStatus,
          category: 'medication'
        };
      }
    }

    // Check for improvement terms
    for (const [key, scale] of Object.entries(this.IMPROVEMENT)) {
      if (scale.mappings.some(term => normalized.includes(term))) {
        return {
          standardId: scale.id,
          standardValue: scale.value,
          standardDisplay: scale.display,
          originalValue: legacyStatus,
          category: 'improvement'
        };
      }
    }

    // Check for quality terms
    for (const [key, scale] of Object.entries(this.QUALITY)) {
      if (scale.mappings.some(term => normalized.includes(term))) {
        return {
          standardId: scale.id,
          standardValue: scale.value,
          standardDisplay: scale.display,
          originalValue: legacyStatus,
          category: 'quality'
        };
      }
    }

    // Check for severity terms
    for (const [key, scale] of Object.entries(this.SEVERITY)) {
      if (scale.mappings.some(term => normalized.includes(term))) {
        return {
          standardId: scale.id,
          standardValue: scale.value,
          standardDisplay: scale.display,
          originalValue: legacyStatus,
          category: 'severity'
        };
      }
    }

    // Check for time-based descriptions
    if (this.TIME_BASED.mappings.some(term => normalized.includes(term))) {
      return {
        standardId: this.TIME_BASED.id,
        standardDisplay: this.TIME_BASED.display,
        originalValue: legacyStatus,
        category: 'time'
      };
    }

    // Check for fluctuating symptoms
    if (this.FLUCTUATING.mappings.some(term => normalized.includes(term))) {
      return {
        standardId: this.FLUCTUATING.id,
        standardDisplay: this.FLUCTUATING.display,
        originalValue: legacyStatus,
        category: 'fluctuating'
      };
    }

    // Check for consistency descriptions
    if (this.CONSISTENCY.mappings.some(term => normalized.includes(term))) {
      return {
        standardId: this.CONSISTENCY.id,
        standardDisplay: this.CONSISTENCY.display,
        originalValue: legacyStatus,
        category: 'consistency'
      };
    }

    // Default: return original with a flag
    return {
      standardId: 'unclassified',
      standardDisplay: 'Nicht klassifiziert',
      originalValue: legacyStatus,
      category: 'unknown'
    };
  },

  // Get display name for a status ID
  getDisplayName(statusId) {
    // Search through all scales
    for (const scaleKey in this) {
      const scale = this[scaleKey];

      // Skip non-object properties or methods
      if (typeof scale !== 'object' || scale === null) continue;

      // Check if scale has sub-scales
      for (const subScaleKey in scale) {
        const subScale = scale[subScaleKey];

        if (typeof subScale === 'object' && subScale !== null && subScale.id === statusId) {
          return subScale.display;
        }
      }

      // Check if this is a direct scale with an ID
      if (scale.id === statusId) {
        return scale.display;
      }
    }

    // Return the original if no match found
    return statusId;
  },

  // Get color for a status value
  getStatusColor(statusInfo) {
    if (!statusInfo) return '#888888';

    // Handle different categories
    switch (statusInfo.category) {
    case 'improvement':
      // Green gradient for improvements
      var greenValue = Math.min(255, Math.round(155 + (statusInfo.standardValue * 25)));
      return `rgb(0, ${greenValue}, 0)`;

    case 'quality':
      // Blue gradient for quality
      var blueValue = Math.min(255, Math.round(155 + (statusInfo.standardValue * 20)));
      return `rgb(0, 0, ${blueValue})`;

    case 'severity':
      // Red gradient for severity (higher is worse)
      var redValue = Math.min(255, Math.round(155 + (statusInfo.standardValue * 20)));
      return `rgb(${redValue}, 0, 0)`;

    case 'medication':
      return '#1a73e8'; // Blue for medication

    case 'time':
      return '#9c27b0'; // Purple for time-based

    case 'fluctuating':
      return '#ff9800'; // Orange for fluctuating

    case 'consistency':
      return '#795548'; // Brown for consistency

    default:
      return '#888888'; // Gray for unknown
    }
  }
};

// Export the status scale
export default STATUS_SCALE;
