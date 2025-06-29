#!/usr/bin/env node

/**
 * Mestinon Protocol Update Script
 * 
 * This script watches for changes to the mestinon-intake-protocol.json file
 * and automatically generates updated visualizations and artifacts as specified
 * in the protocol file.
 * 
 * Usage:
 *   node update-protocol.js [--watch]
 * 
 * Options:
 *   --watch    Keep running and watch for file changes (default: false)
 */

const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const { JSDOM } = require('jsdom');
// Canvas dependency removed

// Configuration
const CONFIG = {
    protocolFile: path.join(__dirname, 'data', 'mestinon-intake-protocol.json'),
    defaultOutputDir: path.join(__dirname, 'docs', 'up-to-date-protocol-analysis'),
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
    log.info('Generating visualization...');
    
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
        const timeExtent = d3.extent(events, d => new Date(d.date)); // Changed from timestamp to date
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
                .attr('cx', xScale(new Date(event.date))) // Changed from timestamp to date
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
        
        log.success(`Visualization saved to ${outputFile}`);
        return true;
    } catch (error) {
        log.error(`Failed to generate visualization: ${error.message}`);
        return false;
    }
}

/**
 * Generate an HTML file with the embedded visualization
 */
function generateHtmlOutput(protocol, outputDir) {
    log.info('Generating HTML output...');
    
    try {
        // Create HTML content with embedded visualization
        const currentDate = new Date().toISOString().split('T')[0];
        const svgFileName = `Wirkungskurve-${currentDate}.svg`;
        
        // Create simple HTML that embeds the SVG
        const htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mestinon Protokoll Analyse - ${currentDate}</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2em;
        }
        h1 {
            color: #2c3e50;
        }
        .container {
            border: 1px solid #eee;
            padding: 1em;
            margin: 1em 0;
        }
        .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1em;
        }
        .summary {
            margin: 2em 0;
        }
        .visualization {
            text-align: center;
            margin: 2em 0;
        }
        .visualization img {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    <h1>Mestinon Protokoll Analyse</h1>
    <p>Generiert am: ${currentDate}</p>
    
    <div class="container patient-info">
        <div>
            <h2>Patienteninformationen</h2>
            <p><strong>Gewicht:</strong> ${protocol.meta.weight || 'Nicht angegeben'} kg</p>
            <p><strong>Größe:</strong> ${protocol.meta.size || 'Nicht angegeben'} cm</p>
        </div>
        <div>
            <h2>Medizinischer Status</h2>
            <p><strong>Diagnose:</strong> ${protocol.meta.diagnosis || 'Okuläre Myasthenia Gravis'}</p>
            ${protocol.meta['medical-status'] ? `<p><strong>Status:</strong> ${Array.isArray(protocol.meta['medical-status']) ? protocol.meta['medical-status'].join(', ') : protocol.meta['medical-status']}</p>` : ''}
        </div>
    </div>
    
    <div class="summary">
        <h2>Zusammenfassung</h2>
        <p>Anzahl der Ereignisse: ${protocol.events ? protocol.events.length : 0}</p>
        <p>Zeitraum: ${protocol.events && protocol.events.length > 0 ? 
            `${new Date(protocol.events[0].date).toLocaleDateString('de-DE')} bis ${new Date(protocol.events[protocol.events.length-1].date).toLocaleDateString('de-DE')}` : 
            'Keine Ereignisse'}
        </p>
    </div>
    
    <div class="visualization">
        <h2>Visualisierung</h2>
        <object data="${svgFileName}" type="image/svg+xml" style="width:100%; height:auto;">
            <p>Your browser does not support SVG</p>
        </object>
    </div>
</body>
</html>`;
        
        // Create the output HTML file
        const outputFile = path.join(outputDir, `protocol-analysis-${currentDate}.html`);
        
        // Save HTML to file
        fs.writeFileSync(outputFile, htmlContent);
        
        log.success(`HTML output saved to ${outputFile}`);
        return true;
    } catch (error) {
        log.error(`Failed to generate HTML output: ${error.message}`);
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
        const visualizationSuccess = generateVisualization(protocol, outputDir);
        if (!visualizationSuccess) {
            log.error('Failed to generate visualization');
        }
        
        const htmlSuccess = generateHtmlOutput(protocol, outputDir);
        if (!htmlSuccess) {
            log.error('Failed to generate HTML output');
        }
        
        if (visualizationSuccess && htmlSuccess) {
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