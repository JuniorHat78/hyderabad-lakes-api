# Hyderabad Lakes API

A simple Express server that serves GeoJSON data for Hyderabad lakes.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
npm run dev
```

The server will start on port 3001 by default.

## Endpoints

- `GET /health` - Health check
- `GET /api/lakes/:year` - Get lake data for a specific year (e.g., `/api/lakes/1990`)
- `GET /api/hyderabad-lakes/:year` - Get Hyderabad-specific lake data
- `GET /api/data-availability` - Get data availability information
- `GET /api/processing-report` - Get processing report
- `GET /api/available-years` - List all available years

## Static Files

All GeoJSON files are also available as static files under `/data/lakes/`

## Deployment

This API can be deployed to GitHub Pages as a static file server, or run as a Node.js server.