const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { loadTemporalData, loadHistoricalBoundaries } = require('./temporal-data-processor');
const { loadWaterQualityData, calculateWaterQualityTrends, determineOverallQuality } = require('./water-quality-processor');


const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());

// Serve static files from the data directory
app.use('/data', express.static(path.join(__dirname, 'data')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get lake data for a specific year
app.get('/api/lakes/:year', (req, res) => {
  const year = req.params.year;
  const filePath = path.join(__dirname, 'data', 'lakes', `lakes_${year}.geojson`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: `Lake data not found for year ${year}` });
  }
});

// Get Hyderabad-specific lake data for a specific year
app.get('/api/hyderabad-lakes/:year', (req, res) => {
  const year = req.params.year;
  const filePath = path.join(__dirname, 'data', 'lakes', `hyderabad_lakes_${year}.geojson`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: `Hyderabad lake data not found for year ${year}` });
  }
});

// Water quality endpoint - using the water quality processor
app.get('/api/lakes/:id/water-quality', async (req, res) => {
  try {
    const lakeId = req.params.id;
    
    // Load all water quality data
    const allData = await loadWaterQualityData();
    
    // Get data for specific lake
    const lakeReadings = allData[lakeId];
    
    if (!lakeReadings || lakeReadings.length === 0) {
      return res.status(404).json({ 
        error: 'No water quality data found for this lake',
        lakeId 
      });
    }
    
    // Calculate trends
    const trends = calculateWaterQualityTrends(lakeReadings);
    
    // Get latest reading
    const latestReading = lakeReadings[lakeReadings.length - 1];
    const overallQuality = determineOverallQuality(latestReading);
    
    const response = {
      lakeId,
      lakeName: latestReading.lakeName,
      readings: lakeReadings,
      latestReading,
      overallQuality,
      trends
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch water quality data' 
    });
  }
});

// Temporal data endpoint - using the working temporal data processor
app.get('/api/lakes/:id/temporal-data', async (req, res) => {
  try {
    const lakeId = req.params.id;
    
    // Load temporal data from Bhuvan
    const temporalData = await loadTemporalData(lakeId);
    
    // Load historical boundaries from GeoJSON files
    const historicalBoundaries = await loadHistoricalBoundaries(lakeId);
    
    if (!temporalData && historicalBoundaries.length === 0) {
      return res.status(404).json({ 
        error: 'No temporal data found for this lake',
        lakeId 
      });
    }
    
    const response = {
      lakeId,
      temporalData,
      historicalBoundaries,
      dataAvailable: {
        hasDailyData: temporalData?.dailyData && temporalData.dailyData.length > 0,
        hasHistoricalBoundaries: historicalBoundaries.length > 0,
        yearRange: {
          start: temporalData?.statistics?.dateRange.start 
            ? new Date(temporalData.statistics.dateRange.start).getFullYear()
            : historicalBoundaries.length > 0 ? historicalBoundaries[0].year : null,
          end: temporalData?.statistics?.dateRange.end
            ? new Date(temporalData.statistics.dateRange.end).getFullYear()
            : historicalBoundaries.length > 0 ? historicalBoundaries[historicalBoundaries.length - 1].year : null
        }
      }
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch temporal data' 
    });
  }
});

app.listen(PORT, () => {
});