/**
 * Event Taxonomy Model
 *
 * This module provides a standardized taxonomy for event types in the protocol data.
 * It includes mapping functions to convert legacy event types to standardized ones.
 */

const EVENT_TAXONOMY = {
  // Medication events
  MEDICATION: {
    id: 'einnahme',
    display: 'Einnahme',
    category: 'medication'
  },

  // Vision symptoms
  DOUBLE_VISION: {
    id: 'doppelsehen',
    display: 'Doppelsehen',
    category: 'vision',
    subtypes: {
      NEAR: {
        id: 'doppelsehen_nah',
        display: 'Doppelsehen (nah)'
      },
      FAR: {
        id: 'doppelsehen_fern',
        display: 'Doppelsehen (fern)'
      },
      ALL: {
        id: 'doppelsehen_alle',
        display: 'Doppelsehen (alle Entfernungen)'
      }
    }
  },

  TEXT_DISTORTION: {
    id: 'zeilenmix',
    display: 'Zeilenmix',
    category: 'vision',
    subtypes: {
      LAPTOP: {
        id: 'zeilenmix_laptop',
        display: 'Zeilenmix Laptop'
      }
    }
  },

  EYELID: {
    id: 'lid',
    display: 'Lid',
    category: 'vision',
    subtypes: {
      LEFT: {
        id: 'lid_links',
        display: 'Lid linkes Auge'
      }
    }
  },

  // Gastrointestinal symptoms
  STOMACH_PAIN: {
    id: 'bauchschmerz',
    display: 'Bauchschmerz',
    category: 'gastrointestinal'
  },

  STOMACH_RUMBLING: {
    id: 'bauchgrummeln',
    display: 'Bauchgrummeln',
    category: 'gastrointestinal'
  },

  STOMACH_GURGLING: {
    id: 'bauchgluckern',
    display: 'Bauchgluckern',
    category: 'gastrointestinal'
  },

  STOMACH_PRESSURE: {
    id: 'bauchdruck',
    display: 'Bauchdruck',
    category: 'gastrointestinal'
  },

  DIARRHEA: {
    id: 'durchfall',
    display: 'Durchfall',
    category: 'gastrointestinal',
    subtypes: {
      WATERY: {
        id: 'wasserdurchfall',
        display: 'Wasserdurchfall'
      }
    }
  },

  INTESTINE: {
    id: 'darm',
    display: 'Darm',
    category: 'gastrointestinal'
  },

  FLATULENCE: {
    id: 'blähungen',
    display: 'Blähungen',
    category: 'gastrointestinal'
  },

  BELCHING: {
    id: 'aufstoßen',
    display: 'Aufstoßen',
    category: 'gastrointestinal'
  },

  NAUSEA: {
    id: 'übelkeit',
    display: 'Übelkeit',
    category: 'gastrointestinal'
  },

  // Other symptoms
  MUSCLE_TWITCHING: {
    id: 'muskelzucken',
    display: 'Muskelzucken',
    category: 'neuromuscular'
  },

  SALIVATION: {
    id: 'speichelfluss',
    display: 'Speichelfluss',
    category: 'other'
  },

  RUNNY_NOSE: {
    id: 'nase_läuft',
    display: 'Nase läuft',
    category: 'other'
  },

  READING_ALOUD: {
    id: 'vorlesen',
    display: 'Vorlesen',
    category: 'activity'
  },

  BOWEL_MOVEMENT: {
    id: 'stuhlgang',
    display: 'Stuhlgang',
    category: 'gastrointestinal'
  },

  OTHER: {
    id: 'sonstiges',
    display: 'Sonstiges',
    category: 'other'
  },

  DOCTOR_VISIT: {
    id: 'hausarztnotdienst',
    display: 'Hausarztnotdienst',
    category: 'medical'
  },

  // Get all event types as an array
  getAllTypes() {
    const types = [];

    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'object' && this[key] !== null && this[key].id) {
        types.push(this[key]);

        // Add subtypes if present
        if (this[key].subtypes) {
          Object.keys(this[key].subtypes).forEach(subKey => {
            types.push(this[key].subtypes[subKey]);
          });
        }
      }
    });

    return types;
  },

  // Get types by category
  getTypesByCategory(category) {
    return this.getAllTypes().filter(type => type.category === category);
  },

  // Map legacy type to standardized type
  mapLegacyType(legacyType) {
    // Standardize event type names
    const normalized = (legacyType || '').toLowerCase().trim();

    // Doppelsehen variations
    if (normalized.includes('doppelsehen')) {
      if (normalized.includes('nah')) {
        return this.DOUBLE_VISION.subtypes.NEAR.id;
      } else if (normalized.includes('fern')) {
        return this.DOUBLE_VISION.subtypes.FAR.id;
      } else if (normalized.includes('alle')) {
        return this.DOUBLE_VISION.subtypes.ALL.id;
      } else {
        return this.DOUBLE_VISION.id;
      }
    }

    // Doppensehen (typo in some entries)
    if (normalized.includes('doppensehen')) {
      return this.DOUBLE_VISION.id;
    }

    // Zeilenmix/Zeilemix variations
    if (normalized.includes('zeilenmix') || normalized.includes('zeilemix')) {
      if (normalized.includes('laptop')) {
        return this.TEXT_DISTORTION.subtypes.LAPTOP.id;
      } else {
        return this.TEXT_DISTORTION.id;
      }
    }

    // Durchfall/Wasserdurchfall variations
    if (normalized.includes('durchfall') || normalized.includes('wasserdurchfall')) {
      if (normalized.includes('wasser')) {
        return this.DIARRHEA.subtypes.WATERY.id;
      } else {
        return this.DIARRHEA.id;
      }
    }

    // Lid variations
    if (normalized.includes('lid')) {
      if (normalized.includes('link')) {
        return this.EYELID.subtypes.LEFT.id;
      } else {
        return this.EYELID.id;
      }
    }

    // Bauch variations
    if (normalized.includes('bauch')) {
      if (normalized.includes('schmerz')) {
        return this.STOMACH_PAIN.id;
      } else if (normalized.includes('grummel')) {
        return this.STOMACH_RUMBLING.id;
      } else if (normalized.includes('gluckern')) {
        return this.STOMACH_GURGLING.id;
      } else if (normalized.includes('druck')) {
        return this.STOMACH_PRESSURE.id;
      } else {
        return this.STOMACH_PAIN.id; // Default
      }
    }

    // Darm
    if (normalized === 'darm') {
      return this.INTESTINE.id;
    }

    // Stuhlgang
    if (normalized.includes('stuhlgang')) {
      return this.BOWEL_MOVEMENT.id;
    }

    // Blähungen
    if (normalized.includes('bläh')) {
      return this.FLATULENCE.id;
    }

    // Aufstoßen
    if (normalized.includes('aufstoß')) {
      return this.BELCHING.id;
    }

    // Übelkeit
    if (normalized.includes('übel')) {
      return this.NAUSEA.id;
    }

    // Muskelzucken
    if (normalized.includes('muskelzuck')) {
      return this.MUSCLE_TWITCHING.id;
    }

    // Speichelfluss
    if (normalized.includes('speichel')) {
      return this.SALIVATION.id;
    }

    // Nase läuft
    if (normalized.includes('nase')) {
      return this.RUNNY_NOSE.id;
    }

    // Vorlesen
    if (normalized.includes('vorlesen')) {
      return this.READING_ALOUD.id;
    }

    // Hausarztnotdienst
    if (normalized.includes('arzt') || normalized.includes('notdienst')) {
      return this.DOCTOR_VISIT.id;
    }

    // Einnahme
    if (normalized.includes('einnahme')) {
      return this.MEDICATION.id;
    }

    // Sonstiges/Other
    if (normalized.includes('sonstig')) {
      return this.OTHER.id;
    }

    // If no mapping found, return the original
    return legacyType;
  },

  // Get display name for a type ID
  getDisplayName(typeId) {
    const normalized = (typeId || '').toLowerCase().trim();

    // Search through all types
    const allTypes = this.getAllTypes();
    const match = allTypes.find(type => type.id === normalized);

    return match ? match.display : typeId;
  }
};

// Export the taxonomy
export default EVENT_TAXONOMY;
