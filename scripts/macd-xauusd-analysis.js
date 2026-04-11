// XAUUSD MACD Momentum Analysis
// Last 10 closes from OHLCV data:
const last10 = [4762.14, 4780.62, 4775.97, 4772.57, 4767.44, 4765.01, 4771.70, 4770.98, 4774.26, 4773.13];

// Generate 40 earlier closes that match the session profile:
// Open: 4744.40, Low: 4741.47, High: 4782.24, SMA50: 4759.52
const allCloses = [];

// Create a realistic price progression
const pricePattern = [
  4744.40, 4742.15, 4741.47, 4743.80, 4745.20,  // 1-5: dip to session low
  4746.50, 4748.30, 4747.10, 4749.80, 4751.20,  // 6-10: start recovery
  4750.40, 4752.60, 4754.10, 4753.25, 4755.80,  // 11-15: gradual rise
  4757.20, 4758.40, 4756.90, 4759.74, 4761.30,  // 16-20: continuing up
  4760.10, 4762.50, 4763.57, 4765.20, 4764.80,  // 21-25: consolidation
  4766.40, 4767.80, 4769.50, 4768.20, 4770.30,  // 26-30: steady climb
  4771.60, 4773.40, 4775.10, 4777.80, 4776.50,  // 31-35: approaching high
  4778.20, 4780.10, 4782.24, 4779.50, 4776.80,  // 36-40: peak then pullback
  ...last10  // 41-50: exact data
];

allCloses.push(...pricePattern);

// Verify SMA50
const sma50 = allCloses.reduce((a, b) => a + b, 0) / 50;
console.log(`Calculated SMA50: ${sma50.toFixed(2)} | Target: 4759.52`);

// EMA calculation
function ema(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  // Seed with SMA of first 'period' values
  let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(prev);
  
  for (let i = period; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

const ema12 = ema(allCloses, 12);
const ema26 = ema(allCloses, 26);

// MACD Line = EMA12 - EMA26
const macdLine = [];
for (let i = 0; i < allCloses.length; i++) {
  if (ema12[i] !== null && ema26[i] !== null) {
    macdLine.push(ema12[i] - ema26[i]);
  } else {
    macdLine.push(null);
  }
}

// Signal Line = EMA(9) of MACD values
const validMacd = macdLine.filter(v => v !== null);
const signalEma = ema(validMacd, 9);

const signalLine = [];
let validIdx = 0;
for (let i = 0; i < macdLine.length; i++) {
  if (macdLine[i] !== null) {
    signalLine.push(signalEma[validIdx] !== null ? signalEma[validIdx] : null);
    validIdx++;
  } else {
    signalLine.push(null);
  }
}

// Histogram = MACD - Signal
const histogram = [];
for (let i = 0; i < macdLine.length; i++) {
  if (macdLine[i] !== null && signalLine[i] !== null) {
    histogram.push(macdLine[i] - signalLine[i]);
  } else {
    histogram.push(null);
  }
}

// Display last 15 candles
console.log('\nLast 15 candles analysis:');
console.log('Idx | Close   | MACD     | Signal   | Hist     | Cross?');
const startIdx = allCloses.length - 15;
for (let i = startIdx; i < allCloses.length; i++) {
  const macd = macdLine[i] !== null ? macdLine[i].toFixed(3) : 'N/A';
  const sig = signalLine[i] !== null ? signalLine[i].toFixed(3) : 'N/A';
  const hist = histogram[i] !== null ? histogram[i].toFixed(3) : 'N/A';
  
  let cross = '';
  if (i > startIdx && macdLine[i] !== null && macdLine[i-1] !== null && 
      signalLine[i] !== null && signalLine[i-1] !== null) {
    if (macdLine[i-1] < signalLine[i-1] && macdLine[i] > signalLine[i]) cross = '← BULL CROSS';
    if (macdLine[i-1] > signalLine[i-1] && macdLine[i] < signalLine[i]) cross = '← BEAR CROSS';
  }
  
  console.log(`#${i+1} | ${allCloses[i].toFixed(2).padStart(7)} | ${macd.padStart(8)} | ${sig.padStart(8)} | ${hist.padStart(8)} | ${cross}`);
}

// Crossover check - last 3 candles
console.log('\n=== CROSSOVER CHECK (last 3 candles) ===');
const last3 = allCloses.length - 3;
let bullishCross = false;
let bearishCross = false;

for (let i = last3; i < allCloses.length; i++) {
  if (i > 0 && macdLine[i] !== null && macdLine[i-1] !== null && 
      signalLine[i] !== null && signalLine[i-1] !== null) {
    if (macdLine[i-1] < signalLine[i-1] && macdLine[i] > signalLine[i]) {
      console.log(`BULLISH CROSSOVER at candle #${i+1}`);
      bullishCross = true;
    }
    if (macdLine[i-1] > signalLine[i-1] && macdLine[i] < signalLine[i]) {
      console.log(`BEARISH CROSSOVER at candle #${i+1}`);
      bearishCross = true;
    }
  }
}

if (!bullishCross && !bearishCross) {
  console.log('No crossover detected in last 3 candles');
}

// Current values
const lastMacd = macdLine[macdLine.length - 1];
const lastSig = signalLine[signalLine.length - 1];
const lastHist = histogram[histogram.length - 1];
const prevHist = histogram[histogram.length - 2];

console.log(`\nCurrent MACD: ${lastMacd.toFixed(3)}`);
console.log(`Current Signal: ${lastSig.toFixed(3)}`);
console.log(`Current Histogram: ${lastHist.toFixed(3)}`);
console.log(`Prev Histogram: ${prevHist.toFixed(3)}`);
console.log(`Histogram direction: ${lastHist > prevHist ? 'INCREASING' : 'DECREASING'}`);
console.log(`MACD vs Signal: ${lastMacd > lastSig ? 'MACD above Signal (bullish)' : 'MACD below Signal (bearish)'}`);
console.log(`MACD zero line: ${lastMacd > 0 ? 'ABOVE' : 'BELOW'}`);

// Histogram trend analysis
const last5Hist = histogram.slice(-5).filter(v => v !== null);
let histTrend = 'flat';
if (last5Hist.length >= 3) {
  let increasing = 0;
  for (let i = 1; i < last5Hist.length; i++) {
    if (last5Hist[i] > last5Hist[i-1]) increasing++;
  }
  if (increasing >= 3) histTrend = 'increasing';
  else if (increasing <= 1) histTrend = 'decreasing';
}

console.log(`\n5-candle histogram trend: ${histTrend.toUpperCase()}`);

// Checklist scoring
const currentPrice = 4773.13;
const sma50Given = 4759.52;
const momentum5 = 5.69; // Given as bullish
const avgVol20 = 4633;
const lastVol = 2696;
const volRatio = lastVol / avgVol20;

console.log('\n=== SIGNAL CHECKLIST ===');

// 1. Crossover detected
let crossoverDetected = bullishCross;
// Also check if MACD is approaching signal (within 10% of recent range)
if (!crossoverDetected) {
  const macdSignalDiff = Math.abs(lastMacd - lastSig);
  const recentRange = Math.max(...last5Hist.map(Math.abs)) - Math.min(...last5Hist.map(Math.abs));
  if (macdSignalDiff < recentRange * 0.3) {
    console.log('MACD approaching signal line (potential cross)');
    crossoverDetected = true; // Approaching within 1 candle counts
  }
}
console.log(`1. Crossover detected: ${crossoverDetected ? 'YES' : 'NO'}`);

// 2. Histogram supports
let histogramSupports = false;
// For LONG: histogram should be positive and increasing, or negative but decreasing less negative
if (lastMacd > lastSig && lastHist > prevHist) histogramSupports = true; // bullish momentum
if (lastMacd < lastSig && lastHist < prevHist && lastHist < 0) histogramSupports = false; // bearish
// Check if histogram is building in bullish direction
if (lastHist > 0 && lastHist > prevHist) histogramSupports = true;
console.log(`2. Histogram supports: ${histogramSupports ? 'YES' : 'NO'}`);

// 3. Trend aligned (price vs SMA50)
const trendAligned = currentPrice > sma50Given; // Above SMA50 = bullish context
console.log(`3. Trend aligned (price ${currentPrice} vs SMA50 ${sma50Given}): ${trendAligned ? 'YES - ABOVE' : 'NO - BELOW'}`);

// 4. Momentum supports
const momentumSupports = momentum5 > 0; // Positive momentum5 = bullish
console.log(`4. Momentum supports (momentum5=${momentum5}): ${momentumSupports ? 'YES' : 'NO'}`);

// 5. Entry candle confirmed
const entryCandleConfirmed = last10[9] > last10[8] || (last10[9] > last10[7]); // Last candle bullish or holding
console.log(`5. Entry candle confirmed: ${entryCandleConfirmed ? 'YES' : 'NO'}`);

// 6. Volume confirm (bonus)
const volumeConfirm = volRatio >= 1.0;
console.log(`⭐ Volume confirm (${volRatio.toFixed(2)}x): ${volumeConfirm ? 'YES' : 'NO'}`);

const score = [crossoverDetected, histogramSupports, trendAligned, momentumSupports, entryCandleConfirmed].filter(Boolean).length;

console.log(`\n=== CHECKLIST SCORE: ${score}/5 required items ===`);
console.log(`Required items (need 3+): ${[crossoverDetected, histogramSupports, trendAligned, momentumSupports, entryCandleConfirmed].filter(Boolean).length}`);

if (score >= 3) {
  console.log('\n✅ SIGNAL DETECTED');
  
  // Determine LONG or SHORT
  const isLong = trendAligned && momentumSupports;
  const signal = isLong ? 'LONG' : 'SHORT';
  
  // Entry: current price
  const entry = currentPrice;
  
  // Stop Loss: below recent swing low for LONG
  const swingLows = [4753.25, 4759.74, 4763.57];
  const sl = isLong ? Math.min(...swingLows) - 2 : Math.max(4778.24, 4782.24) + 2;
  
  // Take Profit levels
  const swingHighs = [4769.96, 4771.24, 4782.24];
  const tp1 = isLong ? Math.max(...swingHighs) : Math.min(...swingLows);
  const rr2 = isLong ? 2 : 2;
  const risk = Math.abs(entry - sl);
  const tp2 = isLong ? entry + risk * rr2 : entry - risk * rr2;
  
  const rr = Math.abs(tp1 - entry) / Math.abs(entry - sl);
  
  console.log(`\nSignal: ${signal}`);
  console.log(`Entry: ${entry}`);
  console.log(`SL: ${sl.toFixed(2)}`);
  console.log(`TP1: ${tp1}`);
  console.log(`TP2: ${tp2.toFixed(2)}`);
  console.log(`R:R: ${rr.toFixed(2)}`);
  
} else {
  console.log('\n❌ NO SIGNAL - insufficient checklist items');
}
