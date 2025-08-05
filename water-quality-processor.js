const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Map lake names to IDs
const lakeNameToId = {
  'Hussain Sagar': 'hussain-sagar',
  'Osman Sagar (Gandipet)': 'osman-sagar',
  'Himayat Sagar': 'himayat-sagar',
  'Shamirpet': 'shamirpet',
  'Shamirpet Lake': 'shamirpet',
  'Durgam Cheruvu': 'durgam-cheruvu',
  'Secret Lake': 'durgam-cheruvu', // Alias
  'Khajaguda Lake': 'khajaguda',
  'Lotus Pond': 'lotus-pond',
  'Noor Mohammed Kunta': 'noor-mohammed-kunta',
  'Pragathi Nagar Lake': 'pragathi-nagar',
  'Rangadhamuni Cheruvu': 'rangadhamuni',
  'Safilguda Lake': 'safilguda',
  'Malkam Cheruvu': 'malkam-cheruvu'
};

async function loadWaterQualityData() {
  const csvPath = path.join(__dirname, 'data', 'water-quality', 'hyderabad_lakes_water_quality.csv');
  const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const lakeData = {};

  for (const record of records) {
    const lakeName = record['Lake_Name_Standardized'];
    if (!lakeName) continue;

    const lakeId = lakeNameToId[lakeName];
    if (!lakeId) continue;

    const reading = {
      date: record['Date'] || '',
      lakeName,
      stationName: record['Station name'],
      stationCode: record['Station code'],
      parameters: {
        // Physical parameters
        temperature: parseFloat(record['Water Temp. (OC)']) || undefined,
        turbidity: parseFloat(record['Turbidity (NTU)']) || undefined,
        conductivity: parseFloat(record['Conductivity (mS/cm)']) || parseFloat(record['Conductivity (μs/cm)']) || undefined,
        tds: parseFloat(record['TDS (mg/L)']) || undefined,
        tss: parseFloat(record['TSS (mg/L)']) || undefined,
        
        // Chemical parameters
        pH: parseFloat(record['pH']) || undefined,
        do: parseFloat(record['DO (mg/L)']) || undefined,
        bod: parseFloat(record['BOD (mg/L)']) || undefined,
        cod: parseFloat(record['COD (mg/L)']) || parseFloat(record['COD (mg/L).1']) || undefined,
        
        // Nutrients
        nitrateN: parseFloat(record['Nitrate-N (mg/L)']) || parseFloat(record['Nitrate']) || undefined,
        nitriteN: parseFloat(record['Nitrite-N (mg/L)']) || undefined,
        ammoniaN: parseFloat(record['Ammonia-N (mg/L)']) || parseFloat(record['Ammonia-N  (mg/L)']) || undefined,
        phosphate: parseFloat(record['Phosphate (mg/L)']) || parseFloat(record['Total Phosphate (mg/L)']) || undefined,
        tkn: parseFloat(record['TKN (mg/L)']) || undefined,
        
        // Major ions
        chloride: parseFloat(record['Chloride (mg/L)']) || undefined,
        sulphate: parseFloat(record['Sulphate (mg/L)']) || undefined,
        sodium: parseFloat(record['Sodium (mg/L)']) || undefined,
        calcium: parseFloat(record['Calcium (mg/L)']) || parseFloat(record['Calcium as Ca+2(mg/L)']) || undefined,
        magnesium: parseFloat(record['Magnesium (mg/L)']) || parseFloat(record['Magnesium as Mg+2(mg/L)']) || undefined,
        potassium: parseFloat(record['Potassium (mg/L)']) || undefined,
        fluoride: parseFloat(record['Fluoride (mg/L)']) || undefined,
        boron: parseFloat(record['Boron (mg/L)']) || undefined,
        
        // Hardness
        hardness: parseFloat(record['Hardness (mg/L)']) || parseFloat(record['Total Hardness as CaCO3(mg/L)']) || parseFloat(record['Total Hardness as CaCO3 (mg/L)']) || undefined,
        
        // Alkalinity
        totalAlkalinity: parseFloat(record['Total Alk. (mg/L)']) || undefined,
        phenolphthaleinAlkalinity: parseFloat(record['Phen-Alk. (mg/L)']) || undefined,
        
        // Microbiological
        fecalColiform: parseFloat(record['Fecal Coliform (MPN/100ml)']) || parseFloat(record['Faecal Coliform (MPN/100ml)']) || undefined,
        totalColiform: parseFloat(record['Total Coliform (MPN/100ml)']) || parseFloat(record['Total coliform (MPN/100ml)']) || undefined,
        fecalStreptococci: parseFloat(record['Fecal streptococci']) || parseFloat(record['Faecal streptococci']) || undefined,
        
        // Metals
        arsenic: parseFloat(record['Arsenic']) || undefined,
        cadmium: parseFloat(record['Cadmium']) || parseFloat(record['Cadmium (Cd)']) || undefined,
        copper: parseFloat(record['Copper']) || parseFloat(record['Copper (Cu)']) || undefined,
        lead: parseFloat(record['Lead']) || parseFloat(record['Lead (Pb)']) || undefined,
        chromium: parseFloat(record['Total Chromium']) || parseFloat(record['Total Chromium (T. Cr)']) || undefined,
        nickel: parseFloat(record['Nickel']) || parseFloat(record['Nickel (Ni)']) || undefined,
        zinc: parseFloat(record['Zinc']) || parseFloat(record['Zinc (Zn)']) || undefined,
        iron: parseFloat(record['Iron']) || parseFloat(record['Iron (Fe)']) || undefined,
        
        // Other indices
        saprobityIndex: parseFloat(record['Saprobity index']) || undefined,
        diversityIndex: parseFloat(record['Diversity index']) || undefined,
        sodiumPercentage: parseFloat(record['Sodium %']) || parseFloat(record['sodium %']) || parseFloat(record['% Sodium']) || undefined,
        sar: parseFloat(record['SAR']) || undefined,
        prRatio: parseFloat(record['P/R Ratio']) || undefined,
      }
    };

    if (!lakeData[lakeId]) {
      lakeData[lakeId] = [];
    }
    
    lakeData[lakeId].push(reading);
  }

  // Sort readings by date
  for (const lakeId in lakeData) {
    lakeData[lakeId].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  return lakeData;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  
  // Handle formats like "January 2018", "October 2018", etc.
  const monthYear = dateStr.match(/^(\w+)\s+(\d{4})$/);
  if (monthYear) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = monthNames.indexOf(monthYear[1]);
    if (monthIndex !== -1) {
      return new Date(parseInt(monthYear[2]), monthIndex, 1);
    }
  }
  
  // Try standard date parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date(0) : date;
}

function calculateWaterQualityTrends(readings) {
  if (readings.length < 2) return [];

  const parameters = [
    { key: 'pH', name: 'pH Level', unit: '' },
    { key: 'do', name: 'Dissolved Oxygen', unit: 'mg/L' },
    { key: 'bod', name: 'BOD', unit: 'mg/L' },
    { key: 'cod', name: 'COD', unit: 'mg/L' },
    { key: 'turbidity', name: 'Turbidity', unit: 'NTU' },
    { key: 'temperature', name: 'Temperature', unit: '°C' },
    { key: 'totalColiform', name: 'Total Coliform', unit: 'MPN/100ml' }
  ];

  const trends = [];

  parameters.forEach(param => {
    const values = readings
      .map(r => r.parameters[param.key])
      .filter(v => v !== null && v !== undefined && !isNaN(v));

    if (values.length >= 2) {
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
      const change = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;

      // Determine trend direction based on whether increase is good or bad
      let trend = 'stable';
      if (param.key === 'do') {
        // For dissolved oxygen, increase is good
        trend = change > 5 ? 'improving' : change < -5 ? 'degrading' : 'stable';
      } else if (['bod', 'cod', 'turbidity', 'totalColiform'].includes(param.key)) {
        // For these parameters, decrease is good
        trend = change > 5 ? 'degrading' : change < -5 ? 'improving' : 'stable';
      } else if (param.key === 'pH') {
        // For pH, we want it to be stable around 7-8
        const idealPH = 7.5;
        const firstDiff = Math.abs(firstValue - idealPH);
        const lastDiff = Math.abs(lastValue - idealPH);
        trend = lastDiff < firstDiff ? 'improving' : lastDiff > firstDiff ? 'degrading' : 'stable';
      } else {
        // For other parameters, use default logic
        trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
      }

      trends.push({
        parameter: param.name,
        unit: param.unit,
        trend,
        changePercentage: change,
        latestValue: lastValue,
        averageValue: avgValue
      });
    }
  });

  return trends;
}

function determineOverallQuality(reading) {
  if (!reading || !reading.parameters) return 'Unknown';

  const params = reading.parameters;
  let score = 0;
  let factors = 0;

  // pH (ideal range: 6.5-8.5)
  if (params.pH !== null && params.pH !== undefined) {
    if (params.pH >= 6.5 && params.pH <= 8.5) score += 1;
    factors += 1;
  }

  // Dissolved Oxygen (ideal: > 6 mg/L)
  if (params.do !== null && params.do !== undefined) {
    if (params.do > 6) score += 1;
    factors += 1;
  }

  // BOD (ideal: < 3 mg/L)
  if (params.bod !== null && params.bod !== undefined) {
    if (params.bod < 3) score += 1;
    factors += 1;
  }

  // COD (ideal: < 10 mg/L)
  if (params.cod !== null && params.cod !== undefined) {
    if (params.cod < 10) score += 1;
    factors += 1;
  }

  // Turbidity (ideal: < 5 NTU)
  if (params.turbidity !== null && params.turbidity !== undefined) {
    if (params.turbidity < 5) score += 1;
    factors += 1;
  }

  // Total Coliform (ideal: < 50 MPN/100ml)
  if (params.totalColiform !== null && params.totalColiform !== undefined) {
    if (params.totalColiform < 50) score += 1;
    factors += 1;
  }

  const percentage = factors > 0 ? (score / factors) * 100 : 0;

  if (percentage >= 80) return 'Good';
  if (percentage >= 50) return 'Moderate';
  return 'Poor';
}

module.exports = {
  loadWaterQualityData,
  calculateWaterQualityTrends,
  determineOverallQuality
};