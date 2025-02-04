# Warhammer 40K Mission Map Designer

A web-based WYSIWYG map designer for creating Warhammer 40K mission maps. This tool allows you to design mission layouts with objective markers, deployment zones, and custom shapes.

## Features

- 60" x 44" grid-based canvas
- Grid snapping for precise placement
- Place and manipulate objective markers
- Create rectangular deployment zones for attackers and defenders
- Draw custom-shaped deployment zones
- Measure distances from objects to map edges
- Save/load maps using local storage
- Export maps as PNG files

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Click "Add Objective Marker" to place objective markers
- Use "Add Attacker Zone" or "Add Defender Zone" for rectangular deployment zones
- Click "Draw Custom Zone" to create custom-shaped deployment zones
- Select an object and click "Measure Distance" to see distances to map edges
- Use "Save Map" and "Load Map" to persist your work
- Click "Export as PNG" to download the map as an image

## Technical Details

Built with:
- React
- Fabric.js for canvas manipulation
- Local Storage for map persistence
