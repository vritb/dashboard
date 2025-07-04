/**
 * Timeline Component
 *
 * This component renders the protocol data timeline visualization using D3.js.
 * It handles zooming, panning, and event interactions.
 */

import * as d3 from 'd3';
import Component from './base-component.js';
import { debounce } from '../utils/dom-utils.js';
import store from '../store/store.js';
import STATUS_SCALE from '../models/status-scale.js';

export default class TimelineComponent extends Component {
  initialize() {
    // D3 selections
    this.svg = null;
    this.xScale = null;
    this.yScale = null;
    this.colorScale = null;
    this.zoom = null;

    // Configuration
    this.config = {
      margin: { top: 40, right: 40, bottom: 100, left: 100 },
      barHeight: 20,
      barPadding: 30,
      timeFormat: d3.timeFormat('%Y-%m-%d %H:%M'),
      timeFormatShort: d3.timeFormat('%H:%M'),
      dateParser: d3.timeParse('%Y-%m-%d %H:%M')
    };

    // Subscribe to store changes
    this.subscribeToStore(store, state => {
      if (state.data && state.data.events) {
        this.update(state);
      }
    });

    // Handle window resize
    this.handleResize = debounce(() => {
      if (this.svg) {
        this.updateVisualization();
      }
    }, 250);

    window.addEventListener('resize', this.handleResize);
    this.eventListeners.push({
      element: window,
      event: 'resize',
      handler: this.handleResize
    });
  }

  render() {
    // Create a container element
    const container = document.createElement('div');
    container.className = 'timeline-container';

    // Create the SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '500px'); // Initial height, will be updated
    container.appendChild(svg);

    // Store the SVG selection
    this.svg = d3.select(svg);

    // If there's data, create the visualization
    const state = store.getState();
    if (state.data && state.data.events) {
      this.createVisualization(state);
    }

    return container;
  }

  update(state) {
    if (state.data && state.data.events) {
      this.updateVisualization();
    }
  }

  createVisualization(state) {
    if (!state.data || !state.data.events || state.data.events.length === 0) {
      return;
    }

    // Get filtered events
    const filteredEvents = store.getFilteredEvents();
    if (filteredEvents.length === 0) {
      return;
    }

    // Get visible event types
    const visibleEventTypes = store.getVisibleEventTypes();
    if (visibleEventTypes.length === 0) {
      return;
    }

    // Clear previous visualization
    this.svg.selectAll('*').remove();

    // Determine visualization dimensions
    const container = this.svg.node().parentNode;
    const width = container.clientWidth - this.config.margin.left - this.config.margin.right;
    const height = (this.config.barHeight + this.config.barPadding) * visibleEventTypes.length +
                  this.config.margin.top + this.config.margin.bottom;

    // Update SVG dimensions
    this.svg
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width + this.config.margin.left + this.config.margin.right} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Create the main group element
    const g = this.svg.append('g')
      .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);

    // Determine time range
    const timeExtent = d3.extent(filteredEvents, d => d.date);
    timeExtent[0] = new Date(timeExtent[0].getTime() - 1000 * 60 * 60); // 1 hour before first event
    timeExtent[1] = new Date(timeExtent[1].getTime() + 1000 * 60 * 60); // 1 hour after last event

    // Create scales
    this.xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, width]);

    this.yScale = d3.scaleBand()
      .domain(visibleEventTypes)
      .range([0, (this.config.barHeight + this.config.barPadding) * visibleEventTypes.length])
      .padding(0.1);

    this.colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(visibleEventTypes);

    // Add zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([0.5, 5])  // Limit zoom level between 0.5x and 5x
      .on('zoom', event => this.zoomed(event));

    // Apply zoom behavior to SVG
    this.svg.call(this.zoom);

    // Create a group for all elements that should be zoomed
    const zoomGroup = g.append('g')
      .attr('class', 'zoom-group');

    // Create separate groups for different elements
    this.circlesGroup = zoomGroup.append('g')
      .attr('class', 'circles-group');

    this.linesGroup = zoomGroup.append('g')
      .attr('class', 'lines-group');

    this.markersGroup = zoomGroup.append('g')
      .attr('class', 'markers-group');

    // Draw x-axis
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(d3.timeHour.every(4))
      .tickFormat(d3.timeFormat('%d.%m %H:%M'));

    this.xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${(this.config.barHeight + this.config.barPadding) * visibleEventTypes.length})`)
      .attr('class', 'x-axis')
      .call(xAxis);

    this.xAxisGroup.selectAll('text')
      .attr('y', 10)
      .attr('x', -8)
      .attr('dy', '.35em')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // Draw y-axis with grid lines
    const yAxis = d3.axisLeft(this.yScale)
      .tickSize(-width) // Add grid lines spanning the width
      .tickPadding(10); // Add padding between tick and label for better readability

    this.yAxisGroup = g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Style the y-axis grid lines
    this.yAxisGroup.selectAll('.tick line')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');

    // Style the domain path
    this.yAxisGroup.select('.domain')
      .attr('stroke', '#888');

    // Add enhanced zoom controls
    this.addZoomControls(container);

    // Draw event data
    this.drawEvents(filteredEvents, visibleEventTypes);

    // Add special marking for medication intake (Einnahme)
    this.drawMedicationMarkers(filteredEvents, visibleEventTypes);
  }

  drawEvents(events, visibleEventTypes) {
    // Group events by type, ensuring strict type matching
    const eventsByType = {};
    visibleEventTypes.forEach(type => {
      // Make sure we're getting exact type matches
      eventsByType[type] = events.filter(event => event.type === type);
    });

    // Draw events for each type
    visibleEventTypes.forEach(type => {
      const typeEvents = eventsByType[type];

      // Draw event points
      this.circlesGroup.selectAll(`.event-point-${type.replace(/\s+/g, '-')}`)
        .data(typeEvents)
        .enter()
        .append('circle')
        .attr('class', `event-point event-point-${type.replace(/\s+/g, '-')}`)
        .attr('cx', d => this.xScale(d.date))
        .attr('data-x', d => d.date.getTime())
        // Use yScale.bandwidth() to properly center within the band
        .attr('cy', () => this.yScale(type) + this.yScale.bandwidth() / 2)
        .attr('r', 5)
        .attr('fill', d => {
          // Use status color if available
          if (d.statusInfo && d.statusInfo.category) {
            return STATUS_SCALE.getStatusColor(d.statusInfo);
          }
          return this.colorScale(type);
        })
        .on('mouseover', (event, d) => this.showTooltip(event, d))
        .on('click', (event, d) => this.selectEvent(event, d));

      // Connect events with lines
      if (typeEvents.length > 1) {
        for (let i = 0; i < typeEvents.length - 1; i++) {
          const current = typeEvents[i];
          const next = typeEvents[i + 1];

          this.linesGroup.append('line')
            .attr('class', `event-line event-line-${type.replace(/\s+/g, '-')}`)
            .attr('x1', this.xScale(current.date))
            .attr('x2', this.xScale(next.date))
            .attr('data-x1', current.date.getTime())
            .attr('data-x2', next.date.getTime())
            .attr('y1', this.yScale(type) + this.yScale.bandwidth() / 2)
            .attr('y2', this.yScale(type) + this.yScale.bandwidth() / 2)
            .attr('stroke', this.colorScale(type))
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
        }
      }
    });
  }

  drawMedicationMarkers(events, visibleEventTypes) {
    // Get the proper Y positions using bandwidth
    const getYPosition = type => {
      if (!visibleEventTypes.includes(type)) return 0;
      return this.yScale(type) + this.yScale.bandwidth() / 2;
    };

    const medicationEvents = events.filter(event =>
      event.type === 'Einnahme' || event.standardType === 'einnahme'
    );

    // Draw markers for medication events
    this.markersGroup.selectAll('.medication-marker')
      .data(medicationEvents)
      .enter()
      .append('rect')
      .attr('class', 'medication-marker')
      .attr('x', d => this.xScale(d.date) - 2)
      .attr('data-x', d => d.date.getTime())
      // Center markers on their respective rows
      .attr('y', d => {
        if (d.type === 'Einnahme' || d.standardType === 'einnahme') {
          return getYPosition('Einnahme') - this.config.barHeight / 2;
        }
        return 0;
      })
      .attr('height', d => {
        if (d.type === 'Einnahme' || d.standardType === 'einnahme') {
          return this.config.barHeight;
        }
        return (this.config.barHeight + this.config.barPadding) * visibleEventTypes.length;
      })
      .attr('width', 4)
      .attr('fill', 'rgba(255, 0, 0, 0.1)')
      .on('mouseover', (event, d) => this.showTooltip(event, d))
      .on('click', (event, d) => this.selectEvent(event, d));
  }

  showTooltip(event, d) {
    // Remove any existing tooltips first
    this.hideTooltip();

    // Create new tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    // Add a close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.className = 'tooltip-close-btn';
    closeButton.onclick = () => this.hideTooltip();
    tooltip.appendChild(closeButton);

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'tooltip-content';

    // Format tooltip content
    contentDiv.innerHTML = `<h3>${d.type}</h3>`;
    contentDiv.innerHTML += `<p><strong>Datum:</strong> ${this.config.timeFormat(d.date)}</p>`;
    contentDiv.innerHTML += `<p><strong>Status:</strong> ${d.status}</p>`;

    if (d.details) {
      contentDiv.innerHTML += `<p><strong>Details:</strong> ${d.details}</p>`;
    }

    if (d.statusInfo && d.statusInfo.standardDisplay) {
      contentDiv.innerHTML += `<p><strong>Standardisierter Status:</strong> ${d.statusInfo.standardDisplay}</p>`;
    }

    tooltip.appendChild(contentDiv);

    // Calculate optimal position to ensure tooltip is fully visible
    const tooltipWidth = 300; // Estimated width
    const tooltipHeight = 200; // Estimated height

    let left = event.pageX + 10;
    let top = event.pageY + 10;

    // Check if tooltip would go off right edge of window
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    // Check if tooltip would go off bottom edge of window
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 10;
    }

    // Make sure we don't position offscreen
    left = Math.max(10, left);
    top = Math.max(10, top);

    // Set tooltip style
    tooltip.style.opacity = 1;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = 1000;
    tooltip.style.backgroundColor = 'white';
    tooltip.style.border = '1px solid #ccc';
    tooltip.style.borderRadius = '4px';
    tooltip.style.padding = '8px';
    tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    tooltip.style.maxWidth = '300px';

    // Style close button
    closeButton.style.float = 'right';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginLeft = '5px';
  }

  hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }
  }

  selectEvent(event, d) {
    // Select the event in the store
    store.selectEvent(d);

    // Highlight the selected event
    this.circlesGroup.selectAll('circle')
      .classed('selected', false)
      .attr('r', 5);

    d3.select(event.target)
      .classed('selected', true)
      .attr('r', 8);
  }

  zoomed(event) {
    const transform = event.transform;

    // Update zoom level in the store
    store.setZoomLevel(transform.k);

    // Update zoom level display
    const zoomLevelEl = document.querySelector('.zoom-level');
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `Zoom: ${Math.round(transform.k * 100)}%`;
    }

    // Create new scaled x-axis
    const newXScale = transform.rescaleX(this.xScale);

    // Update the x-axis
    this.xAxisGroup.call(
      d3.axisBottom(newXScale)
        .ticks(d3.timeHour.every(4))
        .tickFormat(d3.timeFormat('%d.%m %H:%M'))
    );

    // Re-apply the rotation to the axis labels
    this.xAxisGroup.selectAll('text')
      .attr('y', 10)
      .attr('x', -8)
      .attr('dy', '.35em')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // Update circle positions
    this.circlesGroup.selectAll('circle')
      .attr('cx', d => newXScale(d.date));

    // Update line positions
    this.linesGroup.selectAll('line')
      .attr('x1', d => newXScale(d.date))
      .attr('x2', function () {
        const nextDate = new Date(+d3.select(this).attr('data-x2'));
        return newXScale(nextDate);
      });

    // Update marker positions
    this.markersGroup.selectAll('rect')
      .attr('x', function () {
        const date = new Date(+d3.select(this).attr('data-x'));
        return newXScale(date) - 2;
      });
  }

  addZoomControls(container) {
    try {
      // Remove ALL existing zoom controls from the document
      document.querySelectorAll('.zoom-controls').forEach(control => {
        control.remove();
      });

      document.querySelectorAll('.zoom-tooltip').forEach(tooltip => {
        tooltip.remove();
      });

      // Create a unique identifier for this instance
      const uniqueId = `zoom-controls-${Date.now()}`;

      // Create zoom controls container with unique identifier
      const zoomControls = document.createElement('div');
      zoomControls.className = 'zoom-controls';
      zoomControls.id = uniqueId;

      //console.log(`Creating new zoom controls with ID: ${uniqueId}`);

      // Create zoom in button
      const zoomInButton = document.createElement('button');
      zoomInButton.id = 'zoom-in';
      zoomInButton.title = 'Zoom In (Keyboard: +)';
      zoomInButton.textContent = '+';
      zoomInButton.addEventListener('click', () => {
        this.svg.transition().call(this.zoom.scaleBy, 1.2);
      });

      // Create zoom out button
      const zoomOutButton = document.createElement('button');
      zoomOutButton.id = 'zoom-out';
      zoomOutButton.title = 'Zoom Out (Keyboard: -)';
      zoomOutButton.textContent = '−';
      zoomOutButton.addEventListener('click', () => {
        this.svg.transition().call(this.zoom.scaleBy, 0.8);
      });

      // Create zoom level display
      const zoomLevel = document.createElement('div');
      zoomLevel.className = 'zoom-level';
      zoomLevel.textContent = 'Zoom: 100%';

      // Create reset button
      const resetButton = document.createElement('button');
      resetButton.id = 'zoom-reset';
      resetButton.title = 'Reset Zoom (Keyboard: 0)';
      resetButton.textContent = 'Reset';
      resetButton.addEventListener('click', () => {
        this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
      });

      // Add elements to controls
      zoomControls.appendChild(zoomOutButton);
      zoomControls.appendChild(zoomLevel);
      zoomControls.appendChild(zoomInButton);
      zoomControls.appendChild(resetButton);

      // Add zoom tooltip with instructions
      const zoomTooltip = document.createElement('div');
      zoomTooltip.className = 'zoom-tooltip';
      zoomTooltip.innerHTML = `
        <strong>Zoom Controls:</strong><br>
        • Mouse wheel to zoom in/out<br>
        • Drag timeline to pan<br>
        • Double-click to reset zoom<br>
        • Keyboard: + to zoom in, - to zoom out, 0 to reset
      `;

      // Add controls to container
      container.appendChild(zoomControls);
      container.appendChild(zoomTooltip);

      // Store references for cleanup
      this.zoomControls = zoomControls;
      this.zoomTooltip = zoomTooltip;

      // Remove any existing keyboard handlers
      if (this.keydownHandler) {
        document.removeEventListener('keydown', this.keydownHandler);
      }
      // Add keyboard shortcuts for zooming
      this.keydownHandler = e => {
        // Only process if we're not in an input field
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          if (e.key === '+' || e.key === '=') {
            this.svg.transition().call(this.zoom.scaleBy, 1.2);
            e.preventDefault();
          } else if (e.key === '-' || e.key === '_') {
            this.svg.transition().call(this.zoom.scaleBy, 0.8);
            e.preventDefault();
          } else if (e.key === '0') {
            this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', this.keydownHandler);
      this.eventListeners.push({
        element: document,
        event: 'keydown',
        handler: this.keydownHandler
      });

      // Remove any existing dblclick handler
      if (this.dblclickHandler && this.svg.node()) {
        this.svg.node().removeEventListener('dblclick', this.dblclickHandler);
      }

      // Add double-click to reset zoom
      this.dblclickHandler = () => {
        this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
      };

      this.svg.node().addEventListener('dblclick', this.dblclickHandler);
      this.eventListeners.push({
        element: this.svg.node(),
        event: 'dblclick',
        handler: this.dblclickHandler
      });
    } catch (error) {
      console.error('Error creating zoom controls:', error);
      console.error('Error location: timeline-component.js -> addZoomControls');
      console.error('Error details:', error.stack);

      // Create a simple fallback set of controls if possible
      try {
        const basicControls = document.createElement('div');
        basicControls.className = 'zoom-controls fallback';
        basicControls.innerHTML = '<p>Zoom controls error - using fallback</p>';
        container.appendChild(basicControls);
        this.zoomControls = basicControls;
      } catch (fallbackError) {
        console.error('Failed to create fallback controls:', fallbackError);
      }
    }
  }

  updateVisualization() {
    // Update the visualization with current data
    const state = store.getState();
    this.createVisualization(state);
  }

  destroy() {
    // Remove tooltip
    const tooltip = document.getElementById('tooltip');
    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }

    // Remove zoom controls
    if (this.zoomControls && this.zoomControls.parentNode) {
      this.zoomControls.parentNode.removeChild(this.zoomControls);
    }

    // Remove zoom tooltip
    if (this.zoomTooltip && this.zoomTooltip.parentNode) {
      this.zoomTooltip.parentNode.removeChild(this.zoomTooltip);
    }

    // Call parent destroy method
    super.destroy();
  }
}

