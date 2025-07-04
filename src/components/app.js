/**
 * App Component
 *
 * This is the main application component that coordinates all other components.
 */

import Component from './base-component.js';
import { createElement } from '../utils/dom-utils.js';
import store from '../store/store.js';
import dataService from '../services/data-service.js';

import FilterComponent from './filter-component.js';
import TimelineComponent from './timeline-component.js';
import LegendComponent from './legend-component.js';
import AnalysisComponent from './analysis-component.js';

export default class App extends Component {
  initialize() {
    // Load the data when the app initializes
    this.loadData();

    // Subscribe to store changes
    this.subscribeToStore(store, state => {
      this.updatePageTitle(state);
    });
  }

  async loadData() {
    try {
      await store.loadData();
    } catch (error) {
      console.error('Error loading data:', error);
      // Display error message
      if (this.element) {
        const errorEl = createElement('div', { className: 'error-message' });
        errorEl.textContent = `Error loading data: ${error.message}`;
        this.element.prepend(errorEl);
      }
    }
  }

  render() {
    // Create the main container
    const container = createElement('div', { className: 'dashboard-container' });

    // Create header
    const header = this.createHeader();
    container.appendChild(header);

    // Create patient info section
    const patientInfo = this.createPatientInfo();
    container.appendChild(patientInfo);

    // Create filter section
    const filterSection = this.createFilterSection();
    container.appendChild(filterSection);

    // Create visualization section
    const visualizationSection = this.createVisualizationSection();
    container.appendChild(visualizationSection);

    // Create analysis section
    const analysisSection = this.createAnalysisSection();
    container.appendChild(analysisSection);

    // Initialize child components
    this.initializeChildComponents();

    return container;
  }

  createHeader() {
    // Create header element
    const header = createElement('header');

    // Create title
    const title = createElement('h1', { id: 'title' }, 'Mestinon Einnahme Protokoll');
    header.appendChild(title);

    // Create description
    const description = createElement('p', { id: 'description' }, 'Erfahrungen mit Mestinon');
    header.appendChild(description);

    return header;
  }

  createPatientInfo() {
    // Create patient info section
    const section = createElement('div', { className: 'patient-info' });

    // Create heading
    const heading = createElement('h2', {}, 'Patient Information');
    section.appendChild(heading);

    // Create details container
    const details = createElement('div', { id: 'patient-details' });
    section.appendChild(details);

    return section;
  }

  createFilterSection() {
    // Create filter section
    const section = createElement('div', { className: 'controls' });

    // Create heading
    const heading = createElement('h2', {}, 'Filter');
    section.appendChild(heading);

    // Create filter container
    const filterContainer = createElement('div', { id: 'event-filters', className: 'filters' });
    section.appendChild(filterContainer);

    // Store reference to filter container
    this.filterContainer = filterContainer;

    return section;
  }

  createVisualizationSection() {
    // Create visualization section
    const section = createElement('div', { className: 'visualization-container' });

    // Create visualization container
    const visualizationContainer = createElement('div', { id: 'visualization' });
    section.appendChild(visualizationContainer);

    // Create legend container
    const legendContainer = createElement('div', { id: 'event-legend', className: 'legend' });
    section.appendChild(legendContainer);

    // Store references to containers
    this.visualizationContainer = visualizationContainer;
    this.legendContainer = legendContainer;

    return section;
  }

  createAnalysisSection() {
    // Create analysis section
    const section = createElement('div', { className: 'analysis-section' });

    // Create heading
    const heading = createElement('h2', {}, 'Analyse');
    section.appendChild(heading);

    // Create analysis container
    const analysisContainer = createElement('div', { id: 'analysis-details' });
    section.appendChild(analysisContainer);

    // Create half-life estimation section
    const halfLifeSection = createElement('div', { className: 'half-life-estimation' });
    halfLifeSection.appendChild(createElement('h3', {}, 'Schätzung der Eliminationshalbwertszeit'));

    const halfLifeContainer = createElement('div', { id: 'half-life-estimation' });
    halfLifeSection.appendChild(halfLifeContainer);

    section.appendChild(halfLifeSection);

    // Store reference to analysis container
    this.analysisContainer = analysisContainer;

    return section;
  }

  initializeChildComponents() {
    // Initialize filter component
    const filterComponent = new FilterComponent(this.filterContainer);
    this.addChild('filter', filterComponent);

    // Initialize timeline component
    const timelineComponent = new TimelineComponent(this.visualizationContainer);
    this.addChild('timeline', timelineComponent);

    // Initialize legend component
    const legendComponent = new LegendComponent(this.legendContainer);
    this.addChild('legend', legendComponent);

    // Initialize analysis component
    const analysisComponent = new AnalysisComponent(this.analysisContainer);
    this.addChild('analysis', analysisComponent);

    // Mount components
    filterComponent.mount();
    timelineComponent.mount();
    legendComponent.mount();
    analysisComponent.mount();
  }

  updatePageTitle(state) {
    // Update page title and description from data
    if (state.data && state.data.meta) {
      const titleEl = document.getElementById('title');
      const descriptionEl = document.getElementById('description');

      if (titleEl && state.data.meta.title) {
        titleEl.textContent = state.data.meta.title;
      }

      if (descriptionEl && state.data.meta.description) {
        descriptionEl.textContent = state.data.meta.description;
      }

      // Update patient details
      this.updatePatientDetails(state.data.meta);
    }
  }

  updatePatientDetails(meta) {
    const patientDetailsEl = document.getElementById('patient-details');
    if (!patientDetailsEl) return;

    const patientInfo = [];

    if (meta.author) patientInfo.push(`<strong>Patient:</strong> ${meta.author}`);
    if (meta.weight) patientInfo.push(`<strong>Gewicht:</strong> ${meta.weight}`);
    if (meta.size) patientInfo.push(`<strong>Größe:</strong> ${meta.size}`);

    if (meta['medical-status'] && Array.isArray(meta['medical-status'])) {
      patientInfo.push(`<strong>Medizinischer Status:</strong> ${meta['medical-status'].join(', ')}`);
    }

    patientDetailsEl.innerHTML = patientInfo.join('<br>');
  }
}
