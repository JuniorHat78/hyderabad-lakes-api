const path = require('path');
const fs = require('fs');

// Map lake names to Bhuvan folder IDs
const lakeNameToBhuvanId = {
  'hussain-sagar': '1007878045612624311',
  'osman-sagar': '1000959528031155202',
  'himayat-sagar': '1001150645686139370',
};

async function loadTemporalData(lakeId) {
  const bhuvanId = lakeNameToBhuvanId[lakeId];
  
  if (!bhuvanId) {
    console.log(`No Bhuvan ID mapping found for lake: ${lakeId}`);
    return null;
  }

  // Use the local data directory
  const bhuvanBasePath = path.join(__dirname, 'data', 'bhuvan-wbis', bhuvanId);
  
  if (!fs.existsSync(bhuvanBasePath)) {
    console.error('Bhuvan data directory not found:', bhuvanBasePath);
    return null;
  }

  try {
    // Load metadata
    const metadataPath = path.join(bhuvanBasePath, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const lakeMetadata = metadata[0];

    // Load daily water surface area data
    const wsaDailyPath = path.join(bhuvanBasePath, 'wsa_daily.json');
    const wsaDailyData = JSON.parse(fs.readFileSync(wsaDailyPath, 'utf-8'));

    // Convert Bhuvan data to our format
    const dailyData = wsaDailyData
      .filter(d => d.a > 0) // Filter out zero area entries
      .map(d => ({
        date: d.st,
        area: d.a, // hectares
        sensor: d.s,
        cloudCover: d.clf,
        confidence: d.c
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate monthly aggregates
    const monthlyData = calculateMonthlyAggregates(dailyData);
    
    // Calculate yearly aggregates
    const yearlyData = calculateYearlyAggregates(dailyData);

    // Calculate statistics
    const statistics = calculateStatistics(dailyData, monthlyData, yearlyData);

    return {
      lakeId,
      lakeName: lakeMetadata['Water Body Name'] || lakeId,
      source: 'ISRO Bhuvan WBIS',
      dailyData,
      monthlyData,
      yearlyData,
      statistics
    };
  } catch (error) {
    console.error('Error loading temporal data:', error);
    return null;
  }
}

function calculateMonthlyAggregates(dailyData) {
  const monthlyMap = new Map();

  dailyData.forEach(d => {
    const date = new Date(d.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, []);
    }
    monthlyMap.get(key).push(d);
  });

  const monthlyData = [];
  
  monthlyMap.forEach((days, key) => {
    const [year, month] = key.split('-').map(Number);
    const areas = days.map(d => d.area);
    
    monthlyData.push({
      year,
      month,
      averageArea: areas.reduce((sum, a) => sum + a, 0) / areas.length,
      minArea: Math.min(...areas),
      maxArea: Math.max(...areas),
      dataPoints: areas.length
    });
  });

  return monthlyData.sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
}

function calculateYearlyAggregates(dailyData) {
  const yearlyMap = new Map();

  dailyData.forEach(d => {
    const year = new Date(d.date).getFullYear();
    
    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, []);
    }
    yearlyMap.get(year).push(d);
  });

  const yearlyData = [];
  
  yearlyMap.forEach((days, year) => {
    const areas = days.map(d => d.area);
    
    yearlyData.push({
      year,
      averageArea: areas.reduce((sum, a) => sum + a, 0) / areas.length,
      minArea: Math.min(...areas),
      maxArea: Math.max(...areas),
      dataPoints: areas.length
    });
  });

  return yearlyData.sort((a, b) => a.year - b.year);
}

function calculateStatistics(dailyData, monthlyData, yearlyData) {
  if (dailyData.length === 0) return undefined;

  const areas = dailyData.map(d => d.area);
  const firstYear = yearlyData[0];
  const lastYear = yearlyData[yearlyData.length - 1];
  
  // Calculate seasonal averages
  const seasonalData = {
    monsoon: dailyData.filter(d => {
      const month = new Date(d.date).getMonth() + 1;
      return month >= 6 && month <= 10;
    }),
    winter: dailyData.filter(d => {
      const month = new Date(d.date).getMonth() + 1;
      return month >= 11 || month <= 2;
    }),
    summer: dailyData.filter(d => {
      const month = new Date(d.date).getMonth() + 1;
      return month >= 3 && month <= 5;
    })
  };

  // Determine trend
  let trend = 'stable';
  if (firstYear && lastYear) {
    const change = ((lastYear.averageArea - firstYear.averageArea) / firstYear.averageArea) * 100;
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
  }

  return {
    totalDataPoints: dailyData.length,
    dateRange: {
      start: dailyData[0].date,
      end: dailyData[dailyData.length - 1].date
    },
    areaRange: {
      min: Math.min(...areas),
      max: Math.max(...areas),
      average: areas.reduce((sum, a) => sum + a, 0) / areas.length
    },
    trend,
    percentageChange: firstYear && lastYear 
      ? ((lastYear.averageArea - firstYear.averageArea) / firstYear.averageArea) * 100
      : undefined,
    seasonalPatterns: {
      monsoonAverage: seasonalData.monsoon.length > 0
        ? seasonalData.monsoon.map(d => d.area).reduce((sum, a) => sum + a, 0) / seasonalData.monsoon.length
        : 0,
      winterAverage: seasonalData.winter.length > 0
        ? seasonalData.winter.map(d => d.area).reduce((sum, a) => sum + a, 0) / seasonalData.winter.length
        : 0,
      summerAverage: seasonalData.summer.length > 0
        ? seasonalData.summer.map(d => d.area).reduce((sum, a) => sum + a, 0) / seasonalData.summer.length
        : 0
    }
  };
}

// Load historical yearly boundaries from GeoJSON files
async function loadHistoricalBoundaries(lakeId) {
  const boundaries = [];
  
  // Since boundaries are in the client, we'll return URLs
  // The client will need to fetch these from its own public folder
  for (let year = 1984; year <= 2024; year++) {
    boundaries.push({
      year,
      url: `/data/lakes/lakes_${year}.geojson`,
      note: 'Fetch this URL from the client to get boundary data'
    });
  }
  
  return boundaries;
}

module.exports = {
  loadTemporalData,
  loadHistoricalBoundaries
};