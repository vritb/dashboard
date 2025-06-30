#!/usr/bin/env node

/**
 * Mestinon Protocol Update Script
 * 
 * This script watches for changes to the mestinon-intake-protocol.json file
 * and automatically generates updated visualizations and artifacts as specified
 * in the protocol file.
 * 
 * Usage:
 *   node update-dashboard.js [--watch] [--force] [--verbose|-v]
 * 
 * Options:
 *   --watch    Keep running and watch for file changes (default: false)
 *   --force    Force update all artifacts (default: false)
 *   --verbose  Show detailed logs (default: false)
 */

const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const { JSDOM } = require('jsdom');

// Configuration
const CONFIG = {
    protocolFile: path.join(__dirname, 'data', 'mestinon-intake-protocol.json'),
    defaultOutputDir: path.join(__dirname, 'docs', 'up-to-date-protocol-analysis'),
    templateDir: path.join(__dirname),
    indexFile: path.join(__dirname, 'index.html'),
    watchMode: process.argv.includes('--watch'),
    forceUpdate: process.argv.includes('--force'),
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    width: 1200,
    height: 600
};

// Logging utilities
const log = {
    info: (message) => console.log(`[INFO] ${message}`),
    success: (message) => console.log(`[SUCCESS] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`),
    verbose: (message) => {
        if (CONFIG.verbose) {
            console.log(`[VERBOSE] ${message}`);
        }
    }
};

/**
 * Read the protocol file and parse its JSON content
 */
function readProtocolFile() {
    try {
        const data = fs.readFileSync(CONFIG.protocolFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log.error(`Failed to read protocol file: ${error.message}`);
        return null;
    }
}

/**
 * Get the output directory from the protocol file or use the default
 */
function getOutputDirectory(protocol) {
    if (protocol && protocol.meta && protocol.meta['output-directory']) {
        // Use the directory specified in the protocol
        return path.join(__dirname, protocol.meta['output-directory']);
    }
    
    // Fall back to default
    return CONFIG.defaultOutputDir;
}

/**
 * Ensure that the output directory exists
 */
function ensureOutputDirectory(outputDir) {
    if (!fs.existsSync(outputDir)) {
        log.verbose(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

/**
 * Generate a visualization SVG directly from the protocol data
 */
function generateVisualization(protocol, outputDir) {
    log.info('Generating SVG visualization...');
    
    try {
        // Create a virtual DOM to render the SVG
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        const document = dom.window.document;
        
        // Create SVG element
        const svg = d3.select(document.body)
            .append('svg')
            .attr('width', CONFIG.width)
            .attr('height', CONFIG.height)
            .attr('xmlns', 'http://www.w3.org/2000/svg');
            
        // Add background
        svg.append('rect')
            .attr('width', CONFIG.width)
            .attr('height', CONFIG.height)
            .attr('fill', '#f9f9f9');
            
        // Extract events from protocol
        const events = protocol.events || [];
        
        // Set up scales
        const timeExtent = d3.extent(events, d => new Date(d.date));
        const xScale = d3.scaleTime()
            .domain(timeExtent)
            .range([50, CONFIG.width - 50]);
            
        // Add title
        svg.append('text')
            .attr('x', CONFIG.width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '20px')
            .attr('font-weight', 'bold')
            .text('Mestinon/Pyridostigminbromid Wirkungskurve');
            
        // Add timeline axis
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.timeFormat('%d.%m.%Y'));
            
        svg.append('g')
            .attr('transform', `translate(0, ${CONFIG.height - 50})`)
            .call(xAxis)
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end');
            
        // Dynamically identify unique event types
        const eventTypes = [...new Set(events.map(event => event.type || 'unknown'))];
        
        // Generate event groups dynamically with colors
        const eventGroups = {};
        const colors = ['#1a73e8', '#e8731a', '#e81a1a', '#1ae89b', '#9b1ae8', '#e8d81a', '#547b48'];
        
        // Calculate available vertical space and proper spacing
        const topMargin = 100;  // Space for title and top margin
        const bottomMargin = 70; // Space for x-axis and bottom margin
        const availableHeight = CONFIG.height - topMargin - bottomMargin;
        const ySpacing = availableHeight / (eventTypes.length || 1); // Avoid division by zero
        
        eventTypes.forEach((type, index) => {
            // Use predefined mappings for common types, or generate based on index
            let mappedType = type;
            let color = colors[index % colors.length];
            // Position each type with dynamic spacing to fit within SVG height
            let y = topMargin + (index * ySpacing); 
            
            // Special case mappings for known types
            if (type.toLowerCase().includes('einnahme')) {
                mappedType = 'Mestinon Einnahme';
                color = '#1a73e8';
            } else if (type.toLowerCase().includes('doppelsehen')) {
                mappedType = 'Doppeltsehen';
                color = '#e8731a';
            } else if (type.toLowerCase().includes('durchfall') || 
                       type.toLowerCase().includes('übelkeit') ||
                       type.toLowerCase().includes('bauch')) {
                mappedType = 'Nebenwirkung';
                color = '#e81a1a';
            }
            
            eventGroups[type] = { 
                color: color, 
                label: mappedType, 
                y: y
            };
        });
        
        // Draw legend
        let legendY = 70;
        Object.entries(eventGroups).forEach(([type, props], i) => {
            svg.append('circle')
                .attr('cx', 100)
                .attr('cy', legendY)
                .attr('r', 6)
                .attr('fill', props.color);
                
            svg.append('text')
                .attr('x', 120)
                .attr('y', legendY + 5)
                .text(props.label)
                .attr('font-size', '14px');
                
            legendY += 25;
        });
        
        // Draw events
        events.forEach(event => {
            const eventType = event.type || 'unknown';
            const groupInfo = eventGroups[eventType] || { color: '#999', y: 300 };
            
            svg.append('circle')
                .attr('cx', xScale(new Date(event.date)))
                .attr('cy', groupInfo.y)
                .attr('r', 6)
                .attr('fill', groupInfo.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
        });
        
        // Create output filenames with current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Get SVG content
        const svgContent = document.body.innerHTML;
        const outputFile = path.join(outputDir, `Wirkungskurve-${currentDate}.svg`);
        
        // Save SVG to file
        fs.writeFileSync(outputFile, svgContent);
        
        log.success(`Static SVG visualization saved to ${outputFile}`);
        return outputFile;
    } catch (error) {
        log.error(`Failed to generate visualization: ${error.message}`);
        return null;
    }
}

/**
 * Generate an interactive HTML dashboard based on the protocol data
 */
function generateInteractiveDashboard(protocol, outputDir) {
    log.info('Generating interactive dashboard...');
    
    try {
        const currentDate = new Date().toISOString().split('T')[0];
        const outputFile = path.join(outputDir, `protocol-analysis-${currentDate}.html`);
        
        // JSON string of the protocol data for embedding in the HTML
        const protocolJSON = JSON.stringify(protocol);
        
        // Create the interactive HTML dashboard
        const dashboardHTML = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mestinon Einnahme Protokoll Dashboard - ${currentDate}</title>
    <!-- Add D3.js library -->
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        
        header {
            margin-bottom: 20px;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .patient-info {
            background-color: #fff;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .visualization-container {
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow-x: auto;
            margin-bottom: 20px;
        }
        
        #visualization {
            min-height: 500px;
            width: 100%;
        }
        
        .controls {
            background-color: #fff;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .filters {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .filter-item {
            background-color: #eee;
            border-radius: 15px;
            padding: 5px 10px;
            cursor: pointer;
            user-select: none;
        }
        
        .filter-item.active {
            background-color: #2c3e50;
            color: white;
        }
        
        .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 20px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .legend-color {
            width: 15px;
            height: 15px;
            border-radius: 50%;
        }
        
        .tooltip {
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 300px;
            z-index: 100;
        }
        
        .tooltip h3 {
            margin-top: 0;
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .tooltip p {
            margin: 5px 0;
            font-size: 12px;
        }
        
        .axis-label {
            font-size: 12px;
            fill: #555;
        }
        
        /* Zoom controls styling */
        .zoom-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            align-items: center;
            background: white;
            padding: 5px;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            z-index: 100;
        }
        
        .zoom-controls button {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 14px;
            padding: 5px 10px;
            cursor: pointer;
            margin: 0 3px;
            transition: background 0.2s;
        }
        
        .zoom-controls button:hover {
            background: #e9ecef;
        }
        
        .zoom-controls button:active {
            background: #dee2e6;
        }
        
        .zoom-controls .zoom-level {
            margin: 0 8px;
            font-size: 12px;
            color: #666;
        }
        
        .zoom-tooltip {
            position: absolute;
            top: 45px;
            right: 10px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 3px;
            padding: 8px;
            font-size: 12px;
            max-width: 220px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 100;
        }
        
        .zoom-controls:hover + .zoom-tooltip {
            opacity: 1;
        }

        .analysis-section {
            background-color: #fff;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .half-life-estimation {
            background-color: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .visualization-container {
                padding: 10px;
            }
        }

        .back-to-index {
            display: inline-block;
            margin-bottom: 20px;
            padding: 8px 15px;
            background-color: #f0f0f0;
            border-radius: 4px;
            text-decoration: none;
            color: #333;
        }
        
        .back-to-index:hover {
            background-color: #e0e0e0;
        }
    </style>
</head>
<body>
    <a href="../../../index.html" class="back-to-index">← Zurück zur Übersicht</a>
    
    <header>
        <h1 id="title">Mestinon Einnahme Protokoll</h1>
        <p id="description">Erfahrungen mit Mestinon</p>
    </header>
    
    <div class="patient-info">
        <h2>Patient Information</h2>
        <div id="patient-details"></div>
    </div>
    
    <div class="controls">
        <h2>Filter</h2>
        <div class="filters" id="event-filters">
            <!-- Filter items will be generated here -->
        </div>
    </div>
    
    <div class="visualization-container">
        <div id="visualization">
            <!-- SVG will be inserted here -->
        </div>
        <div class="legend" id="event-legend">
            <!-- Legend items will be generated here -->
        </div>
    </div>

    <div class="analysis-section">
        <h2>Analyse</h2>
        <div id="analysis-details">
            <!-- Analysis will be generated here -->
        </div>
        
        <div class="half-life-estimation">
            <h3>Schätzung der Eliminationshalbwertszeit</h3>
            <div id="half-life-estimation">
                <!-- Half-life estimation will be generated here -->
            </div>
        </div>
    </div>

    <div id="tooltip" class="tooltip"></div>
    
    <script>
        // Embedded protocol data
        const protocolData = ${protocolJSON};
        
        // Configuration
        const config = {
            margin: { top: 40, right: 40, bottom: 100, left: 100 },
            barHeight: 20,
            barPadding: 30,
            timeFormat: d3.timeFormat("%Y-%m-%d %H:%M"),
            timeFormatShort: d3.timeFormat("%H:%M"),
            dateParser: d3.timeParse("%Y-%m-%d %H:%M")
        };

        // Data state
        let originalData = null;
        let filteredData = null;
        let eventTypes = [];
        let activeFilters = [];
        let visibleEventTypes = []; // Array to track which event types are visible
        
        // Elements
        const visualizationEl = document.getElementById('visualization');
        const patientDetailsEl = document.getElementById('patient-details');
        const eventFiltersEl = document.getElementById('event-filters');
        const eventLegendEl = document.getElementById('event-legend');
        const tooltipEl = document.getElementById('tooltip');
        const analysisDetailsEl = document.getElementById('analysis-details');
        const halfLifeEstimationEl = document.getElementById('half-life-estimation');

        // Process the data
        function processData(data) {
            // Update page title and description
            document.getElementById('title').textContent = data.meta.title || 'Mestinon Einnahme Protokoll';
            document.getElementById('description').textContent = data.meta.description || '';
            
            // Display patient information
            const patientInfo = [];
            if (data.meta.author) patientInfo.push(\`<strong>Patient:</strong> \${data.meta.author}\`);
            if (data.meta.weight) patientInfo.push(\`<strong>Gewicht:</strong> \${data.meta.weight}\`);
            if (data.meta.size) patientInfo.push(\`<strong>Größe:</strong> \${data.meta.size}\`);
            
            if (data.meta['medical-status'] && Array.isArray(data.meta['medical-status'])) {
                patientInfo.push(\`<strong>Medizinischer Status:</strong> \${data.meta['medical-status'].join(', ')}\`);
            }
            
            patientDetailsEl.innerHTML = patientInfo.join('<br>');
            
            // Process events
            const events = data.events.map(event => {
                return {
                    ...event,
                    date: config.dateParser(event.date)
                };
            }).filter(event => event.date !== null);
            
            // Sort events by date
            events.sort((a, b) => a.date - b.date);
            
            // Extract unique event types
            eventTypes = [...new Set(events.map(event => event.type))];
            
            return {
                meta: data.meta,
                events: events
            };
        }

        // Create filters
        function createFilters() {
            eventFiltersEl.innerHTML = '';
            
            // Add "Update/All" filter
            const allFilter = document.createElement('div');
            allFilter.className = 'filter-item active';
            allFilter.textContent = 'Update';
            allFilter.addEventListener('click', () => {
                document.querySelectorAll('.filter-item').forEach(item => {
                    item.classList.remove('active');
                });
                allFilter.classList.add('active');
                activeFilters = [];
                filterData();
                updateVisualization();
                
                // Change button text to "Alle" after it's clicked
                if (allFilter.textContent === 'Update') {
                    allFilter.textContent = 'Alle';
                }
            });
            eventFiltersEl.appendChild(allFilter);
            
            // Add event type filters
            eventTypes.forEach(type => {
                const filterItem = document.createElement('div');
                filterItem.className = 'filter-item';
                filterItem.textContent = type;
                filterItem.addEventListener('click', () => {
                    if (filterItem.classList.contains('active')) {
                        filterItem.classList.remove('active');
                        activeFilters = activeFilters.filter(f => f !== type);
                    } else {
                        filterItem.classList.add('active');
                        activeFilters.push(type);
                    }
                    
                    // If no filters are active, activate "All"
                    if (activeFilters.length === 0) {
                        allFilter.classList.add('active');
                    } else {
                        allFilter.classList.remove('active');
                    }
                    
                    filterData();
                    updateVisualization();
                });
                eventFiltersEl.appendChild(filterItem);
            });
        }

        // Filter data based on active filters
        function filterData() {
            if (activeFilters.length === 0) {
                filteredData = originalData.events;
                visibleEventTypes = [...eventTypes]; // All event types are visible
            } else {
                filteredData = originalData.events.filter(event => 
                    activeFilters.includes(event.type)
                );
                // Update which event types are visible based on filtered data
                visibleEventTypes = [...new Set(filteredData.map(event => event.type))];
            }
        }

        // Create the legend
        function createLegend() {
            eventLegendEl.innerHTML = '';
            
            // Generate colors for each event type
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(eventTypes);
            
            // Create legend items
            eventTypes.forEach(type => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                
                const colorBox = document.createElement('div');
                colorBox.className = 'legend-color';
                colorBox.style.backgroundColor = colorScale(type);
                
                const label = document.createElement('span');
                label.textContent = type;
                
                legendItem.appendChild(colorBox);
                legendItem.appendChild(label);
                eventLegendEl.appendChild(legendItem);
            });
        }

        // Create the visualization
        function createVisualization() {
            if (!originalData || !originalData.events || originalData.events.length === 0) {
                visualizationEl.innerHTML = '<p>Keine Daten verfügbar.</p>';
                return;
            }
            
            // Clear previous visualization
            visualizationEl.innerHTML = '';
            
            // Determine time range
            const timeExtent = d3.extent(originalData.events, d => d.date);
            timeExtent[0] = new Date(timeExtent[0].getTime() - 1000 * 60 * 60); // 1 hour before first event
            timeExtent[1] = new Date(timeExtent[1].getTime() + 1000 * 60 * 60); // 1 hour after last event
            
            // Determine visualization dimensions
            const width = visualizationEl.clientWidth - config.margin.left - config.margin.right;
            const height = (config.barHeight + config.barPadding) * visibleEventTypes.length + config.margin.top + config.margin.bottom;
            
            // Create the SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', height);
            svg.setAttribute('viewBox', \`0 0 \${width + config.margin.left + config.margin.right} \${height}\`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            visualizationEl.appendChild(svg);
            
            // Create the main group element
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', \`translate(\${config.margin.left},\${config.margin.top})\`);
            svg.appendChild(g);
            
            // Create scales
            const xScale = d3.scaleTime()
                .domain(timeExtent)
                .range([0, width]);
            
            const yScale = d3.scaleBand()
                .domain(visibleEventTypes)
                .range([0, (config.barHeight + config.barPadding) * visibleEventTypes.length])
                .padding(0.1);
            
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(eventTypes);
                
            // Add zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.5, 5])  // Limit zoom level between 0.5x and 5x
                .on('zoom', zoomed);
                
            // Apply zoom behavior to SVG
            d3.select(svg).call(zoom);
            
            // Create a group for all elements that should be zoomed
            const zoomGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            zoomGroup.setAttribute('class', 'zoom-group');
            g.appendChild(zoomGroup);
            
            // Create a separate group for circles to maintain their aspect ratio
            const circlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            circlesGroup.setAttribute('class', 'circles-group');
            zoomGroup.appendChild(circlesGroup);
            
            // Create a separate group for lines
            const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            linesGroup.setAttribute('class', 'lines-group');
            zoomGroup.appendChild(linesGroup);
            
            // Create a separate group for medication markers
            const markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            markersGroup.setAttribute('class', 'markers-group');
            zoomGroup.appendChild(markersGroup);
            
            // Track current zoom level
            let currentZoomLevel = 1;
            
            // Update zoom level display
            function updateZoomLevel(level) {
                currentZoomLevel = level;
                const zoomLevelEl = document.querySelector('.zoom-level');
                if (zoomLevelEl) {
                    zoomLevelEl.textContent = \`Zoom: \${Math.round(level * 100)}%\`;
                }
            }
            
            // Enhanced zoom function
            function zoomed(event) {
                const transform = event.transform;
                
                // Update zoom level indicator
                updateZoomLevel(transform.k);
                
                // Create the new x scale based on the zoom transform
                const newXScale = transform.rescaleX(xScale);
                
                // Update the x-axis with proper rotated labels
                const xAxis = d3.axisBottom(newXScale)
                    .ticks(d3.timeHour.every(4))
                    .tickFormat(d3.timeFormat("%d.%m %H:%M"));
                
                d3.select(xAxisGroup).call(xAxis);
                
                // Re-apply the rotation to the axis labels after update
                d3.select(xAxisGroup).selectAll("text")
                    .attr("y", 10)
                    .attr("x", -8)
                    .attr("dy", ".35em")
                    .attr("transform", "rotate(-45)")
                    .style("text-anchor", "end");
                
                // Apply the zoom transform to the entire zoom group for smoother zooming
                d3.select('.zoom-group').attr('transform', 'scale(' + transform.k + ') translate(' + (transform.x / transform.k) + ', 0)');
            }
            
            // Draw x-axis
            const xAxis = d3.axisBottom(xScale)
                .ticks(d3.timeHour.every(4))
                .tickFormat(d3.timeFormat("%d.%m %H:%M"));
            
            const xAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            xAxisGroup.setAttribute('transform', \`translate(0,\${(config.barHeight + config.barPadding) * visibleEventTypes.length})\`);
            xAxisGroup.setAttribute('class', 'x-axis');
            g.appendChild(xAxisGroup);
            
            d3.select(xAxisGroup).call(xAxis)
                .selectAll("text")
                .attr("y", 10)
                .attr("x", -8)
                .attr("dy", ".35em")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");
            
            // Draw y-axis
            const yAxis = d3.axisLeft(yScale);
            
            const yAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            yAxisGroup.setAttribute('class', 'y-axis');
            g.appendChild(yAxisGroup);
            
            d3.select(yAxisGroup).call(yAxis);
            
            // Add enhanced zoom controls
            const zoomControls = document.createElement('div');
            zoomControls.className = 'zoom-controls';
            zoomControls.innerHTML = \`
                <button id="zoom-out" title="Zoom Out (Keyboard: -)">−</button>
                <div class="zoom-level">Zoom: 100%</div>
                <button id="zoom-in" title="Zoom In (Keyboard: +)">+</button>
                <button id="zoom-reset" title="Reset Zoom (Keyboard: 0)">Reset</button>
            \`;
            visualizationEl.appendChild(zoomControls);
            
            // Add zoom tooltip with instructions
            const zoomTooltip = document.createElement('div');
            zoomTooltip.className = 'zoom-tooltip';
            zoomTooltip.innerHTML = \`
                <strong>Zoom Controls:</strong><br>
                • Mouse wheel to zoom in/out<br>
                • Drag timeline to pan<br>
                • Double-click to reset zoom<br>
                • Keyboard: + to zoom in, - to zoom out, 0 to reset
            \`;
            visualizationEl.appendChild(zoomTooltip);
            
            // Add event listeners for zoom buttons
            document.getElementById('zoom-in').addEventListener('click', () => {
                d3.select(svg).transition().call(zoom.scaleBy, 1.2);
            });
            
            document.getElementById('zoom-out').addEventListener('click', () => {
                d3.select(svg).transition().call(zoom.scaleBy, 0.8);
            });
            
            document.getElementById('zoom-reset').addEventListener('click', () => {
                d3.select(svg).transition().call(zoom.transform, d3.zoomIdentity);
            });
            
            // Add keyboard shortcuts for zooming
            document.addEventListener('keydown', (e) => {
                // Only process if we're not in an input field
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    if (e.key === '+' || e.key === '=') {
                        d3.select(svg).transition().call(zoom.scaleBy, 1.2);
                        e.preventDefault();
                    } else if (e.key === '-' || e.key === '_') {
                        d3.select(svg).transition().call(zoom.scaleBy, 0.8);
                        e.preventDefault();
                    } else if (e.key === '0') {
                        d3.select(svg).transition().call(zoom.transform, d3.zoomIdentity);
                        e.preventDefault();
                    }
                }
            });
            
            // Add double-click to reset zoom
            svg.addEventListener('dblclick', () => {
                d3.select(svg).transition().call(zoom.transform, d3.zoomIdentity);
            });
            
            // Draw event data
            visibleEventTypes.forEach(type => {
                const typeEvents = filteredData.filter(event => event.type === type);
                
                typeEvents.forEach(event => {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', xScale(event.date));
                    // Store original date for zoom calculations
                    circle.setAttribute('data-x', event.date.getTime());
                    circle.setAttribute('cy', yScale(event.type) + config.barHeight / 2);
                    circle.setAttribute('r', 5);
                    circle.setAttribute('fill', colorScale(event.type));
                    
                    // Add interactivity
                    circle.addEventListener('mouseover', (e) => {
                        tooltipEl.style.opacity = 1;
                        tooltipEl.style.left = \`\${e.pageX + 10}px\`;
                        tooltipEl.style.top = \`\${e.pageY + 10}px\`;
                        
                        // Format tooltip content
                        let content = \`<h3>\${event.type}</h3>\`;
                        content += \`<p><strong>Datum:</strong> \${config.timeFormat(event.date)}</p>\`;
                        content += \`<p><strong>Status:</strong> \${event.status}</p>\`;
                        
                        if (event.details) {
                            content += \`<p><strong>Details:</strong> \${event.details}</p>\`;
                        }
                        
                        tooltipEl.innerHTML = content;
                    });
                    
                    circle.addEventListener('mouseout', () => {
                        tooltipEl.style.opacity = 0;
                    });
                    
                    circlesGroup.appendChild(circle);
                    
                    // Connect points within the same event type with dotted lines
                    if (typeEvents.length > 1 && typeEvents.indexOf(event) < typeEvents.length - 1) {
                        const nextEvent = typeEvents[typeEvents.indexOf(event) + 1];
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', xScale(event.date));
                        line.setAttribute('x2', xScale(nextEvent.date));
                        // Store original dates for zoom calculations
                        line.setAttribute('data-x1', event.date.getTime());
                        line.setAttribute('data-x2', nextEvent.date.getTime());
                        line.setAttribute('y1', yScale(event.type) + config.barHeight / 2);
                        line.setAttribute('y2', yScale(event.type) + config.barHeight / 2);
                        line.setAttribute('stroke', colorScale(event.type));
                        line.setAttribute('stroke-width', 1);
                        line.setAttribute('stroke-dasharray', '3,3');
                        linesGroup.appendChild(line);
                    }
                });
            });
            
            // Add special marking for medication intake (Einnahme)
            const medicationEvents = filteredData.filter(event => event.type === 'Einnahme');
            medicationEvents.forEach(event => {
                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                marker.setAttribute('x', xScale(event.date) - 2);
                // Store original date for zoom calculations
                marker.setAttribute('data-x', event.date.getTime());
                marker.setAttribute('y', 0);
                marker.setAttribute('width', 4);
                marker.setAttribute('height', (config.barHeight + config.barPadding) * visibleEventTypes.length);
                marker.setAttribute('fill', 'rgba(255, 0, 0, 0.1)');
                markersGroup.appendChild(marker);
            });
        }

        // Update the visualization
        function updateVisualization() {
            createVisualization();
        }

        // Analyze patterns in the data
        function analyzeData() {
            if (!originalData || !originalData.events || originalData.events.length === 0) {
                analysisDetailsEl.innerHTML = '<p>Keine Daten für die Analyse verfügbar.</p>';
                return;
            }

            let analysisHTML = '';
            
            // 1. Count events by type
            const eventCounts = {};
            eventTypes.forEach(type => {
                eventCounts[type] = originalData.events.filter(e => e.type === type).length;
            });
            
            // Sort event types by count (descending)
            const sortedEventTypes = [...eventTypes].sort((a, b) => eventCounts[b] - eventCounts[a]);
            
            analysisHTML += '<h3>Ereignishäufigkeit</h3>';
            analysisHTML += '<ul>';
            sortedEventTypes.forEach(type => {
                analysisHTML += '<li><strong>' + type + ':</strong> ' + eventCounts[type] + ' Ereignisse</li>';
            });
            analysisHTML += '</ul>';
            
            // 2. Look at patterns between Einnahme and symptoms
            const medicationEvents = originalData.events.filter(e => e.type === 'Einnahme');
            
            if (medicationEvents.length > 0) {
                analysisHTML += '<h3>Muster nach Einnahme</h3>';
                
                // Check for symptom patterns after medication intake
                analysisHTML += '<p>Beobachtungen nach Mestinon-Einnahme:</p>';
                analysisHTML += '<ul>';
                
                // Track improvements and side effects
                const improvements = [];
                const sideEffects = [];
                
                // Analyze events after each medication intake
                medicationEvents.forEach(med => {
                    // Look at events within 4 hours after medication
                    const fourHoursLater = new Date(med.date.getTime() + 4 * 60 * 60 * 1000);
                    const eventsAfterMed = originalData.events.filter(e => 
                        e.date > med.date && e.date <= fourHoursLater && e.type !== 'Einnahme'
                    );
                    
                    eventsAfterMed.forEach(event => {
                        const timeDiff = (event.date - med.date) / (1000 * 60); // Time difference in minutes
                        
                        // Check if this is a positive effect
                        if (event.status.toLowerCase().includes('besser') || 
                            event.status.toLowerCase().includes('gut') || 
                            event.status.toLowerCase().includes('kein')) {
                            
                            if (!improvements.some(i => i.type === event.type)) {
                                improvements.push({
                                    type: event.type,
                                    timeRange: [timeDiff],
                                    status: [event.status]
                                });
                            } else {
                                const idx = improvements.findIndex(i => i.type === event.type);
                                improvements[idx].timeRange.push(timeDiff);
                                improvements[idx].status.push(event.status);
                            }
                        }
                        
                        // Check if this is a side effect
                        else if (event.type.toLowerCase().includes('durchfall') || 
                                event.type.toLowerCase().includes('übelkeit') || 
                                event.type.toLowerCase().includes('bauch') ||
                                event.status.toLowerCase().includes('schlecht')) {
                            
                            if (!sideEffects.some(i => i.type === event.type)) {
                                sideEffects.push({
                                    type: event.type,
                                    timeRange: [timeDiff],
                                    status: [event.status]
                                });
                            } else {
                                const idx = sideEffects.findIndex(i => i.type === event.type);
                                sideEffects[idx].timeRange.push(timeDiff);
                                sideEffects[idx].status.push(event.status);
                            }
                        }
                    });
                });
                
                // Calculate average times for improvements
                if (improvements.length > 0) {
                    analysisHTML += '<li><strong>Verbesserungen:</strong><ul>';
                    improvements.forEach(imp => {
                        const avgTime = imp.timeRange.reduce((a, b) => a + b, 0) / imp.timeRange.length;
                        analysisHTML += \`<li>\${imp.type}: Durchschnittlich \${Math.round(avgTime)} Minuten nach Einnahme</li>\`;
                    });
                    analysisHTML += '</ul></li>';
                }
                
                // Calculate average times for side effects
                if (sideEffects.length > 0) {
                    analysisHTML += '<li><strong>Mögliche Nebenwirkungen:</strong><ul>';
                    sideEffects.forEach(side => {
                        const avgTime = side.timeRange.reduce((a, b) => a + b, 0) / side.timeRange.length;
                        analysisHTML += \`<li>\${side.type}: Durchschnittlich \${Math.round(avgTime)} Minuten nach Einnahme</li>\`;
                    });
                    analysisHTML += '</ul></li>';
                }
                
                analysisHTML += '</ul>';
            }
            
            // Display the analysis results
            analysisDetailsEl.innerHTML = analysisHTML;
            
            // Estimate elimination half-life
            estimateHalfLife();
        }

        // Estimate elimination half-life
        function estimateHalfLife() {
            if (!originalData || !originalData.events || originalData.events.length === 0) {
                halfLifeEstimationEl.innerHTML = '<p>Keine Daten für die Schätzung verfügbar.</p>';
                return;
            }

            let halfLifeHTML = '';
            
            // Information from meta data
            halfLifeHTML += '<p><strong>Aus den Metadaten:</strong> Mittlere Halbwertszeit ca. 1.7 Stunden, bei Dialyse bis zu 2-3 fach verlängert.</p>';
            
            // Look for patterns of symptom recurrence
            const doppelsehenEvents = originalData.events.filter(e => e.type.includes('Doppelsehen'));
            const medicationEvents = originalData.events.filter(e => e.type === 'Einnahme');
            
            if (doppelsehenEvents.length > 0 && medicationEvents.length > 0) {
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
                
                if (symptomsReturn.length > 0) {
                    // Calculate average time to symptom return
                    const avgTimeToDeterioration = symptomsReturn.reduce((sum, item) => sum + item.timeToDeterioration, 0) / symptomsReturn.length;
                    
                    // Estimate half-life based on symptom return
                    // Half-life is approximately time to deterioration divided by 5 (assuming 5 half-lives for significant deterioration)
                    const estimatedHalfLife = avgTimeToDeterioration / 5;
                    
                    halfLifeHTML += \`<p><strong>Geschätzte Halbwertszeit basierend auf Symptomwiederkehr:</strong> Ungefähr \${estimatedHalfLife.toFixed(2)} Stunden</p>\`;
                    
                    // Consider dialysis effect
                    const patientInfo = originalData.meta['medical-status'] || [];
                    const dialysisPatient = patientInfo.some(info => info.toLowerCase().includes('dialyse'));
                    
                    if (dialysisPatient) {
                        halfLifeHTML += '<p><strong>Mögliche Werte unter Berücksichtigung der Dialyse:</strong></p>';
                        halfLifeHTML += '<ul>';
                        halfLifeHTML += '<li>Minimum (ohne Dialyseeffekt): ' + (estimatedHalfLife / 3).toFixed(2) + ' Stunden</li>';
                        halfLifeHTML += '<li>Maximum (mit Dialyseeffekt): ' + estimatedHalfLife.toFixed(2) + ' Stunden</li>';
                        halfLifeHTML += '<li>Wahrscheinlichster Wert: ' + (estimatedHalfLife / 2).toFixed(2) + ' Stunden</li>';
                        halfLifeHTML += '</ul>';
                    }
                } else {
                    halfLifeHTML += '<p>Keine eindeutigen Muster für eine präzise Schätzung gefunden.</p>';
                    halfLifeHTML += '<p>Basierend auf der Literatur und den Patientendaten:</p>';
                    halfLifeHTML += '<ul>';
                    halfLifeHTML += '<li>Normale Halbwertszeit: 1.5-2 Stunden</li>';
                    halfLifeHTML += '<li>Bei Niereninsuffizienz/Dialyse: 3-6 Stunden (verlängert)</li>';
                    halfLifeHTML += '</ul>';
                }
            } else {
                halfLifeHTML += '<p>Nicht genügend Daten für eine Schätzung verfügbar.</p>';
            }
            
            // Display the half-life estimation
            halfLifeEstimationEl.innerHTML = halfLifeHTML;
        }

        // Initialize the dashboard
        function initDashboard() {
            // Process data
            originalData = processData(protocolData);
            filteredData = originalData.events;
            
            // Create filters and legend
            createFilters();
            createLegend();
            
            // Directly create visualization and analysis without relying on button clicks
            createVisualization();
            analyzeData();
            
            // Handle window resize
            window.addEventListener('resize', debounce(updateVisualization, 250));
        }

        // Helper function to debounce resize events
        function debounce(func, wait) {
            let timeout;
            return function() {
                const context = this, args = arguments;
                const later = function() {
                    timeout = null;
                    func.apply(context, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Initialize when the page is loaded
        document.addEventListener('DOMContentLoaded', initDashboard);
    </script>
</body>
</html>`;
        
        // Save HTML to file
        fs.writeFileSync(outputFile, dashboardHTML);
        
        log.success(`Interactive dashboard saved to ${outputFile}`);
        return outputFile;
    } catch (error) {
        log.error(`Failed to generate interactive dashboard: ${error.message}`);
        return null;
    }
}

/**
 * Update the index.html file to include links to all files in the docs directory
 */
function updateIndexFile(outputDir) {
    log.info('Updating index.html with links to all generated files...');
    
    try {
        // Read the current index.html file
        const indexContent = fs.readFileSync(CONFIG.indexFile, 'utf8');
        
        // Find the section for protocol analyses
        const protocolAnalysisStartTag = '<div class="section">\n        <h2>Aktuelle Protokoll-Analysen</h2>';
        const protocolAnalysisEndTag = '</div>';
        
        // Extract the start part of the file before the protocol analyses section
        const startSection = indexContent.substring(0, indexContent.indexOf(protocolAnalysisStartTag));
        
        // Find where the next section starts
        const nextSectionStart = indexContent.indexOf('<div class="section">', 
            indexContent.indexOf(protocolAnalysisStartTag) + protocolAnalysisStartTag.length);
        
        // Extract the end part of the file after the protocol analyses section
        const endSection = indexContent.substring(nextSectionStart);
        
        // Get all files in the output directory
        const docsPath = path.relative(__dirname, outputDir);
        let files = [];
        
        try {
            files = fs.readdirSync(outputDir)
                .filter(file => 
                    file.endsWith('.html') || 
                    file.endsWith('.svg') || 
                    file.endsWith('.png')
                )
                .sort((a, b) => {
                    // Sort most recent files first (based on date in filename)
                    const dateA = a.match(/\d{4}-\d{2}-\d{2}/);
                    const dateB = b.match(/\d{4}-\d{2}-\d{2}/);
                    
                    if (dateA && dateB) {
                        return dateB[0].localeCompare(dateA[0]);
                    }
                    return a.localeCompare(b);
                });
        } catch (err) {
            log.error(`Error reading output directory: ${err.message}`);
        }
        
        // Generate new links for protocol analyses
        let newProtocolAnalysisSection = `${protocolAnalysisStartTag}
        <p>Generierte Visualisierungen aus dem Protokoll:</p>
        <ul>`;
        
        // Add links to all files
        files.forEach(file => {
            const fileDate = file.match(/\d{4}-\d{2}-\d{2}/);
            const dateStr = fileDate ? fileDate[0] : 'unknown-date';
            
            // Format the date for display (YYYY-MM-DD to DD.MM.YYYY)
            const formattedDate = fileDate ? 
                dateStr.split('-').reverse().join('.') : 
                'Unbekanntes Datum';
            
            // Different icon based on file type
            let icon = '📄';
            if (file.endsWith('.svg') || file.endsWith('.png')) {
                icon = '📈';
            } else if (file.endsWith('.html')) {
                icon = '📊';
            }
            
            // Generate link
            newProtocolAnalysisSection += `
            <li><a href="./${docsPath}/${file}" target="_blank">${icon} ${file.replace(/\.\w+$/, '')} (${formattedDate})</a></li>`;
        });
        
        newProtocolAnalysisSection += `
        </ul>
    ${protocolAnalysisEndTag}`;
        
        // Combine the sections to create the updated index.html
        const updatedIndexContent = startSection + newProtocolAnalysisSection + endSection;
        
        // Write the updated index.html
        fs.writeFileSync(CONFIG.indexFile, updatedIndexContent);
        
        log.success('Index.html updated with links to all artifacts');
        return true;
    } catch (error) {
        log.error(`Failed to update index.html: ${error.message}`);
        return false;
    }
}

/**
 * Update all artifacts based on the protocol file
 */
function updateArtifacts() {
    log.info('Updating artifacts based on protocol file...');
    
    try {
        // Read the protocol file
        const protocol = readProtocolFile();
        if (!protocol) {
            log.error('Failed to read protocol file - null result');
            return false;
        }
        
        // Debug log protocol structure
        log.info(`Protocol contains ${protocol.events ? protocol.events.length : 0} events`);
        if (protocol.events && protocol.events.length > 0) {
            log.info(`First event date: ${protocol.events[0].date}`);
            log.info(`First event type: ${protocol.events[0].type}`);
            log.info(`First event fields: ${Object.keys(protocol.events[0]).join(', ')}`);
        }
        
        // Get and ensure output directory
        const outputDir = getOutputDirectory(protocol);
        log.info(`Using output directory: ${outputDir}`);
        ensureOutputDirectory(outputDir);
        
        // Generate artifacts
        const svgFile = generateVisualization(protocol, outputDir);
        const dashboardFile = generateInteractiveDashboard(protocol, outputDir);
        
        // Update index.html with links to generated files
        const indexUpdateSuccess = updateIndexFile(outputDir);
        if (!indexUpdateSuccess) {
            log.error('Failed to update index.html');
        }
        
        if (svgFile && dashboardFile) {
            log.success('All artifacts updated successfully');
            return true;
        } else {
            log.error('Some artifacts failed to update');
            return false;
        }
    } catch (error) {
        log.error(`Unexpected error in updateArtifacts: ${error.message}`);
        if (error.stack) {
            log.error(`Stack trace: ${error.stack}`);
        }
        return false;
    }
}

/**
 * Watch for changes to the protocol file
 */
function watchProtocolFile() {
    log.info(`Watching for changes to ${CONFIG.protocolFile}`);
    
    fs.watch(CONFIG.protocolFile, (eventType) => {
        if (eventType === 'change') {
            log.info('Protocol file changed, updating artifacts...');
            updateArtifacts();
        }
    });
}

/**
 * Main function
 */
async function main() {
    log.info('Mestinon Protocol Update Script');
    
    if (CONFIG.forceUpdate) {
        log.info('Force update mode enabled. Regenerating all artifacts regardless of changes...');
    }
    
    // First, update artifacts
    updateArtifacts();
    
    // If watch mode is enabled, watch for changes
    if (CONFIG.watchMode) {
        watchProtocolFile();
    } else if (!CONFIG.forceUpdate) {
        log.info('Run with --watch to continuously monitor for changes');
        log.info('Run with --force to regenerate artifacts regardless of changes');
    }
}

// Run the main function
main().catch(error => {
    log.error(`Unhandled error: ${error.message}`);
    process.exit(1);
});