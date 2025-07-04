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
  schemaFile: path.join(__dirname, 'schema', 'protocol-schema.json'),
  defaultOutputDir: path.join(__dirname, 'docs', 'up-to-date-protocol-analysis'),
  templateDir: path.join(__dirname),
  indexFile: path.join(__dirname, 'index.html'),
  srcDir: path.join(__dirname, 'src'),
  watchMode: process.argv.includes('--watch'),
  forceUpdate: process.argv.includes('--force'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  width: 1200,
  height: 600
};

// Logging utilities
const log = {
  info: message => console.log(`[INFO] ${message}`),
  success: message => console.log(`[SUCCESS] ${message}`),
  error: message => console.error(`[ERROR] ${message}`),
  verbose: message => {
    if (CONFIG.verbose) {
      console.log(`[VERBOSE] ${message}`);
    }
  }
};

/**
 * Validate protocol data against JSON schema
 */
function validateProtocolData(data) {
  try {
    // In a real implementation, this would use a proper JSON schema validator like Ajv
    // For now, we'll do basic structure validation
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Data must be an object'] };
    }

    if (!data.meta || typeof data.meta !== 'object') {
      return { valid: false, errors: ['Missing or invalid meta section'] };
    }

    if (!data.events || !Array.isArray(data.events)) {
      return { valid: false, errors: ['Missing or invalid events array'] };
    }

    const eventErrors = [];
    data.events.forEach((event, index) => {
      if (!event.date) {
        eventErrors.push(`Event at index ${index} is missing date`);
      }
      if (!event.type) {
        eventErrors.push(`Event at index ${index} is missing type`);
      }
      if (!event.status) {
        eventErrors.push(`Event at index ${index} is missing status`);
      }
    });

    if (eventErrors.length > 0) {
      return { valid: false, errors: eventErrors };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

/**
 * Standardize event types based on event taxonomy
 */
function standardizeEventTypes(events) {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  return events.map(event => {
    // Clone event to avoid modifying original
    const standardizedEvent = { ...event };

    // Normalize event type based on common patterns
    const normalizedType = event.type.toLowerCase().trim();

    // Apply standardization rules
    if (normalizedType.includes('einnahme')) {
      standardizedEvent.standardType = 'Einnahme';
      standardizedEvent.category = 'medication';
    } else if (normalizedType.includes('doppelsehen')) {
      standardizedEvent.standardType = 'Doppelsehen';
      standardizedEvent.category = 'vision';
      // Add subcategory based on specifics
      if (normalizedType.includes('nah')) {
        standardizedEvent.subtype = 'nah';
      } else if (normalizedType.includes('fern')) {
        standardizedEvent.subtype = 'fern';
      } else if (normalizedType.includes('alle')) {
        standardizedEvent.subtype = 'alle_entfernungen';
      }
    } else if (normalizedType.includes('zeilenmix') || normalizedType.includes('zeilemix')) {
      standardizedEvent.standardType = 'Zeilenmix';
      standardizedEvent.category = 'vision';
      if (normalizedType.includes('laptop')) {
        standardizedEvent.subtype = 'laptop';
      }
    } else if (normalizedType.includes('durchfall')) {
      standardizedEvent.standardType = 'Durchfall';
      standardizedEvent.category = 'gastrointestinal';
      if (normalizedType.includes('wasser')) {
        standardizedEvent.subtype = 'wasser';
      }
    } else if (normalizedType.includes('bauch')) {
      standardizedEvent.standardType = 'Bauch';
      standardizedEvent.category = 'gastrointestinal';
      // Differentiate types of abdominal symptoms
      if (normalizedType.includes('schmerz')) {
        standardizedEvent.subtype = 'schmerz';
      } else if (normalizedType.includes('grummeln')) {
        standardizedEvent.subtype = 'grummeln';
      } else if (normalizedType.includes('gluckern')) {
        standardizedEvent.subtype = 'gluckern';
      } else if (normalizedType.includes('druck')) {
        standardizedEvent.subtype = 'druck';
      }
    } else {
      // For any other type, just keep original but add metadata
      standardizedEvent.standardType = event.type;
      standardizedEvent.category = 'other';
    }

    return standardizedEvent;
  });
}

/**
 * Standardize status values based on status scale
 */
function standardizeStatusValues(events) {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  return events.map(event => {
    // Clone event to avoid modifying original
    const standardizedEvent = { ...event };

    // Normalize status based on common patterns
    const normalizedStatus = event.status.toLowerCase().trim();

    // For medication events, extract dosage
    if (event.standardType === 'Einnahme' || event.type.toLowerCase().includes('einnahme')) {
      if (normalizedStatus.match(/\d+mg/)) {
        standardizedEvent.standardStatus = 'medication';
        standardizedEvent.dosage = normalizedStatus;
        standardizedEvent.value = parseInt(normalizedStatus.match(/(\d+)mg/)[1], 10);
      }
    }
    // Check for improvement terms
    else if (normalizedStatus.includes('besser')) {
      standardizedEvent.standardStatus = 'improvement';
      if (normalizedStatus.includes('deutlich')) {
        standardizedEvent.value = 3; // significant improvement
        standardizedEvent.severity = 'significant';
      } else if (normalizedStatus.includes('leicht')) {
        standardizedEvent.value = 1; // slight improvement
        standardizedEvent.severity = 'slight';
      } else {
        standardizedEvent.value = 2; // moderate improvement
        standardizedEvent.severity = 'moderate';
      }
    }
    // Check for quality terms
    else if (normalizedStatus.includes('gut')) {
      standardizedEvent.standardStatus = 'quality';
      if (normalizedStatus.includes('sehr')) {
        standardizedEvent.value = 5; // very good
        standardizedEvent.quality = 'very_good';
      } else {
        standardizedEvent.value = 4; // good
        standardizedEvent.quality = 'good';
      }
    } else if (normalizedStatus.includes('schlecht')) {
      standardizedEvent.standardStatus = 'quality';
      if (normalizedStatus.includes('sehr')) {
        standardizedEvent.value = 1; // very poor
        standardizedEvent.quality = 'very_poor';
      } else {
        standardizedEvent.value = 2; // poor
        standardizedEvent.quality = 'poor';
      }
    } else if (normalizedStatus.includes('befriedigend')) {
      standardizedEvent.standardStatus = 'quality';
      standardizedEvent.value = 3; // fair
      standardizedEvent.quality = 'fair';
    }
    // Check for severity terms
    else if (normalizedStatus.includes('keine') || normalizedStatus.includes('kein')) {
      standardizedEvent.standardStatus = 'severity';
      standardizedEvent.value = 0; // none
      standardizedEvent.severity = 'none';
    } else if (normalizedStatus.includes('leicht')) {
      standardizedEvent.standardStatus = 'severity';
      if (normalizedStatus.includes('sehr')) {
        standardizedEvent.value = 1; // very mild
        standardizedEvent.severity = 'very_mild';
      } else {
        standardizedEvent.value = 2; // mild
        standardizedEvent.severity = 'mild';
      }
    } else if (normalizedStatus.includes('mittel')) {
      standardizedEvent.standardStatus = 'severity';
      standardizedEvent.value = 3; // moderate
      standardizedEvent.severity = 'moderate';
    } else if (normalizedStatus.includes('stark')) {
      standardizedEvent.standardStatus = 'severity';
      if (normalizedStatus.includes('sehr')) {
        standardizedEvent.value = 5; // very severe
        standardizedEvent.severity = 'very_severe';
      } else {
        standardizedEvent.value = 4; // severe
        standardizedEvent.severity = 'severe';
      }
    } else if (normalizedStatus.includes('wechselnd')) {
      standardizedEvent.standardStatus = 'fluctuating';
    } else {
      // For any other status, just keep original
      standardizedEvent.standardStatus = 'unclassified';
    }

    return standardizedEvent;
  });
}

/**
 * Read the protocol file, validate and standardize its content
 */
function readProtocolFile() {
  try {
    // Read file
    const data = fs.readFileSync(CONFIG.protocolFile, 'utf8');
    const protocol = JSON.parse(data);

    // Validate against schema
    const validation = validateProtocolData(protocol);
    if (!validation.valid) {
      log.error('Protocol data validation failed:');
      validation.errors.forEach(error => {
        log.error(`- ${error}`);
      });

      // Continue with warnings if errors are not critical
      if (validation.errors.some(e => e.includes('missing date') ||
                                           e.includes('missing type') ||
                                           e.includes('missing status'))) {
        log.error('Critical errors found, cannot continue');
        return null;
      }

      log.error('Continuing with warnings - data may be inconsistent');
    }

    // Standardize events if present
    if (protocol.events && Array.isArray(protocol.events)) {
      // First standardize event types
      const eventsWithStandardTypes = standardizeEventTypes(protocol.events);

      // Then standardize status values
      protocol.events = standardizeStatusValues(eventsWithStandardTypes);

      log.info(`Standardized ${protocol.events.length} events`);
    }

    return protocol;
  } catch (error) {
    log.error(`Failed to read or parse protocol file: ${error.message}`);
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
      const y = topMargin + (index * ySpacing);

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

    // Path to external CSS and JavaScript files
    const cssPath = path.relative(outputDir, path.join(CONFIG.srcDir, 'styles', 'dashboard.css'));
    const jsPath = path.relative(outputDir, path.join(CONFIG.srcDir, 'index.js'));

    // Create the interactive HTML dashboard with modular architecture
    const dashboardHTML = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mestinon Einnahme Protokoll Dashboard - ${currentDate}</title>
    <!-- External CSS -->
    <link rel="stylesheet" href="../${cssPath}">
    <!-- D3.js library -->
    <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
    <a href="../../../index.html" class="back-to-index">← Zurück zur Übersicht</a>
    
    <header>
        <h1 id="title">Mestinon Einnahme Protokoll</h1>
        <p id="description">Erfahrungen mit Mestinon</p>
    </header>
    
    <!-- Container for the dashboard application -->
    <div id="app-root">
        <div class="loading-indicator">Lade Dashboard...</div>
    </div>
    
    <!-- Embed protocol data as global variable -->
    <script>
        window.PROTOCOL_DATA = ${protocolJSON};
    </script>
    
    <!-- Import modular JavaScript application -->
    <script type="module" src="../${jsPath}"></script>
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

  fs.watch(CONFIG.protocolFile, eventType => {
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
