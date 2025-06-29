# Mestinon Intake Protocol Dashboard

This system provides interactive visualizations and monitoring for a patient with Ocular Myasthenia Gravis who is taking Mestinon (Pyridostigminbromid).

## System Overview

The system consists of:

1. A protocol file that contains all events and configuration
2. Dashboard HTML files that provide interactive visualizations
3. An update script that generates updated artifacts when the protocol changes

## Protocol File

The protocol file (`data/mestinon-intake-protocol.json`) contains:

- Patient metadata (weight, height, medical status)
- Treatment history and dosage information
- A chronological log of events (medication intake, symptoms, side effects)
- Configuration for output and visualization

## Dashboard Files

Three dashboard variations are available:

1. **Main Dashboard** (`dashboard.html`) - Full-featured interactive visualization with:
   - Timeline visualization of all events
   - Filtering by event type
   - Detailed information popups
   - Color-coded event representation
   - Responsive design for different screen sizes

2. **Stable Version** (`dashboard-stable.html`) - A stable version with core functionality for testing.

3. **Debug Version** (`dashboard-debug.html`) - A minimal version for debugging data loading issues.

## Update Process

When the protocol file is updated, the system can automatically generate updated artifacts:

1. SVG and PNG visualizations with the current date
2. HTML files with embedded visualizations
3. All artifacts are saved to the output directory specified in the protocol file

The visualization generation process uses a lightweight approach with:
- **d3.js** for data visualization and SVG creation
- **jsdom** for virtual DOM manipulation
- **canvas** module for PNG generation

This efficient approach generates high-quality visualizations directly from the protocol data without requiring a full browser environment.

## Running the System

### Installing Dependencies

```bash
npm install
```

### Updating Artifacts Manually

```bash
npm run update
```

### Watching for Changes

```bash
npm run watch
```

### Starting a Local Server

```bash
npm start
```

## Directory Structure

- `data/` - Contains the protocol file
- `docs/` - Documentation and generated artifacts
- `*.html` - Dashboard files

## Generated Artifacts

The update process generates:

- SVG and PNG visualizations with the current date (e.g., `Wirkungskurve-2025-06-29.png`)
- HTML files with embedded visualizations (e.g., `protocol-analysis-2025-06-29.html`)

These files are saved to the directory specified in the `output-directory` property of the protocol file's meta section.