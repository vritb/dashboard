/**
 * Analysis Component
 *
 * This component displays analysis of the protocol data, including:
 * - Event frequencies
 * - Patterns after medication intake
 * - Half-life estimations
 */

import Component from './base-component.js';
import { createElement, clearElement } from '../utils/dom-utils.js';
import store from '../store/store.js';
import dataService from '../services/data-service.js';

export default class AnalysisComponent extends Component {
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
    const container = createElement('div', { className: 'analysis-container' });

    // Get state
    const state = store.getState();
    if (state.data && state.data.events) {
      this.renderAnalysis(container, state);
    } else {
      container.appendChild(
        createElement('p', {}, 'Keine Daten für die Analyse verfügbar.')
      );
    }

    return container;
  }

  update(state) {
    if (!this.element) return;

    // Clear container
    clearElement(this.element);

    // Render analysis
    if (state.data && state.data.events) {
      this.renderAnalysis(this.element, state);
    } else {
      this.element.appendChild(
        createElement('p', {}, 'Keine Daten für die Analyse verfügbar.')
      );
    }
  }

  renderAnalysis(container, state) {
    // Create sections
    this.renderEventFrequency(container);
    this.renderPatternsAfterMedication(container);
    this.renderHalfLifeEstimation(container);
  }

  renderEventFrequency(container) {
    // Create section
    const section = createElement('div', { className: 'analysis-section' });
    section.appendChild(createElement('h3', {}, 'Ereignishäufigkeit'));

    // Get event counts
    const eventCounts = dataService.getEventCounts();

    // Sort event types by count
    const sortedEventTypes = Object.keys(eventCounts).sort((a, b) =>
      eventCounts[b] - eventCounts[a]
    );

    if (sortedEventTypes.length === 0) {
      section.appendChild(createElement('p', {}, 'Keine Ereignisse gefunden.'));
    } else {
      // Create list
      const list = createElement('ul');

      sortedEventTypes.forEach(type => {
        const count = eventCounts[type];
        list.appendChild(
          createElement('li', {}, [
            createElement('strong', {}, `${type}: `),
            `${count} Ereignisse`
          ])
        );
      });

      section.appendChild(list);
    }

    container.appendChild(section);
  }

  renderPatternsAfterMedication(container) {
    // Create section
    const section = createElement('div', { className: 'analysis-section' });
    section.appendChild(createElement('h3', {}, 'Muster nach Einnahme'));

    // Get patterns after medication
    const patterns = dataService.analyzePatternsAfterMedication();

    // Create description
    section.appendChild(createElement('p', {}, 'Beobachtungen nach Mestinon-Einnahme:'));

    // Create list
    const list = createElement('ul');

    // Add improvements
    if (patterns.improvements && patterns.improvements.length > 0) {
      const improvementsItem = createElement('li');
      improvementsItem.appendChild(createElement('strong', {}, 'Verbesserungen:'));

      const improvementsList = createElement('ul');
      patterns.improvements.forEach(imp => {
        improvementsList.appendChild(
          createElement('li', {}, `${imp.type}: Durchschnittlich ${Math.round(imp.avgTime)} Minuten nach Einnahme`)
        );
      });

      improvementsItem.appendChild(improvementsList);
      list.appendChild(improvementsItem);
    }

    // Add side effects
    if (patterns.sideEffects && patterns.sideEffects.length > 0) {
      const sideEffectsItem = createElement('li');
      sideEffectsItem.appendChild(createElement('strong', {}, 'Mögliche Nebenwirkungen:'));

      const sideEffectsList = createElement('ul');
      patterns.sideEffects.forEach(side => {
        sideEffectsList.appendChild(
          createElement('li', {}, `${side.type}: Durchschnittlich ${Math.round(side.avgTime)} Minuten nach Einnahme`)
        );
      });

      sideEffectsItem.appendChild(sideEffectsList);
      list.appendChild(sideEffectsItem);
    }

    // If no patterns found
    if (list.children.length === 0) {
      list.appendChild(createElement('li', {}, 'Keine eindeutigen Muster gefunden.'));
    }

    section.appendChild(list);
    container.appendChild(section);
  }

  renderHalfLifeEstimation(container) {
    // Create section
    const section = createElement('div', { className: 'analysis-section half-life-estimation' });
    section.appendChild(createElement('h3', {}, 'Schätzung der Eliminationshalbwertszeit'));

    // Get half-life estimation
    const halfLife = dataService.estimateHalfLife();

    // Add meta information
    section.appendChild(
      createElement('p', {}, [
        createElement('strong', {}, 'Aus den Metadaten: '),
        'Mittlere Halbwertszeit ca. 1.7 Stunden, bei Dialyse bis zu 2-3 fach verlängert.'
      ])
    );

    // If estimation was possible
    if (halfLife.estimated) {
      section.appendChild(
        createElement('p', {}, [
          createElement('strong', {}, 'Geschätzte Halbwertszeit basierend auf Symptomwiederkehr: '),
          `Ungefähr ${halfLife.estimatedHalfLife.toFixed(2)} Stunden`
        ])
      );

      // Add dialysis effect information if relevant
      if (halfLife.dialysisPatient) {
        section.appendChild(
          createElement('p', {}, [
            createElement('strong', {}, 'Mögliche Werte unter Berücksichtigung der Dialyse:')
          ])
        );

        const valuesList = createElement('ul');
        valuesList.appendChild(
          createElement('li', {}, `Minimum (ohne Dialyseeffekt): ${halfLife.withoutDialysisEffect.toFixed(2)} Stunden`)
        );
        valuesList.appendChild(
          createElement('li', {}, `Maximum (mit Dialyseeffekt): ${halfLife.withDialysisEffect.toFixed(2)} Stunden`)
        );
        valuesList.appendChild(
          createElement('li', {}, `Wahrscheinlichster Wert: ${halfLife.mostLikely.toFixed(2)} Stunden`)
        );

        section.appendChild(valuesList);
      }

      // Add sample count
      section.appendChild(
        createElement('p', {}, [
          createElement('small', {}, `Basierend auf ${halfLife.samplesCount} Beobachtungen.`)
        ])
      );
    } else {
      // If estimation was not possible
      section.appendChild(
        createElement('p', {}, `Keine eindeutigen Muster für eine präzise Schätzung gefunden: ${halfLife.reason}`)
      );

      section.appendChild(createElement('p', {}, 'Basierend auf der Literatur und den Patientendaten:'));

      const valuesList = createElement('ul');
      valuesList.appendChild(
        createElement('li', {}, 'Normale Halbwertszeit: 1.5-2 Stunden')
      );
      valuesList.appendChild(
        createElement('li', {}, 'Bei Niereninsuffizienz/Dialyse: 3-6 Stunden (verlängert)')
      );

      section.appendChild(valuesList);
    }

    container.appendChild(section);
  }
}
