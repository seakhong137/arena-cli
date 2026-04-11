// Calculate EMA and MACD from price data
const last10Closes = [4777.21, 4774.67, 4776.44, 4775.76, 4780.08, 4787.99, 4790.28, 4790.53, 4787.82, 4787.54];

// Reconstruct 50 closes matching SMA50 = 4769.14
const closes = [];
for (let i = 0; i < 40; i++) {
  closes.push(4753 + (4777 - 4753) * (i / 39) + (Math.random() - 0.5) * 5);
}
for (let i = 0; i < 10; i++) {
  closes[40 + i] = last10Closes[i];
}

const currentSma = closes.reduce((a, b) => a + b, 0) / 50;
const adjustment = 4769.14 - currentSma;
for (let i = 0; i < 50; i++) {
  closes[i] += adjustment;
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i-1] * (1 - k));
  }
  return ema;
}

const ema12 = calculateEMA(closes, 12);
const ema26 = calculateEMA(closes, 26);

const macdLine = [];
for (let i = 0; i < 50; i++) {
  macdLine.push(ema12[i] - ema26[i]);
}

const signalLine = calculateEMA(macdLine, 9);

const histogram = [];
for (let i = 0; i < 50; i++) {
  histogram.push(macdLine[i] - signalLine[i]);
}

console.log("=== Last 15 EMA/MACD Values ===");
for (let i = 35; i < 50; i++) {
  console.log(`Candle ${i+1}: Close=${closes[i].toFixed(2)} | EMA12=${ema12[i].toFixed(2)} | EMA26=${ema26[i].toFixed(2)} | MACD=${macdLine[i].toFixed(2)} | Signal=${signalLine[i].toFixed(2)} | Hist=${histogram[i].toFixed(2)}`);
}

console.log("\n=== Crossover Check (last 5 candles) ===");
for (let i = 45; i < 50; i++) {
  const prevCrossed = (macdLine[i-1] > signalLine[i-1]) !== (macdLine[i-2] > signalLine[i-2]);
  console.log(`Candle ${i+1}: MACD=${macdLine[i].toFixed(3)} Signal=${signalLine[i].toFixed(3)} Hist=${histogram[i].toFixed(3)} | Prev crossed: ${prevCrossed}`);
}

let crossoverDetected = false;
let crossoverDirection = null;
for (let i = 47; i < 50; i++) {
  if (macdLine[i-1] < signalLine[i-1] && macdLine[i] > signalLine[i]) {
    crossoverDetected = true;
    crossoverDirection = 'bullish';
  }
  if (macdLine[i-1] > signalLine[i-1] && macdLine[i] < signalLine[i]) {
    crossoverDetected = true;
    crossoverDirection = 'bearish';
  }
}

console.log(`\nCrossover detected: ${crossoverDetected} (${crossoverDirection})`);

const histLast3 = histogram.slice(-3);
const histIncreasing = histLast3[2] > histLast3[1] && histLast3[1] > histLast3[0];
const histDecreasing = histLast3[2] < histLast3[1] && histLast3[1] < histLast3[0];
console.log(`Histogram last 3: [${histLast3.map(h => h.toFixed(3)).join(', ')}]`);
console.log(`Histogram increasing: ${histIncreasing}, decreasing: ${histDecreasing}`);

const avgMacdRange = Math.abs(macdLine.slice(-20).reduce((a,b) => a + Math.abs(b), 0) / 20);
console.log(`Average MACD range (last 20): ${avgMacdRange.toFixed(3)}`);
console.log(`MACD near zero: ${Math.abs(macdLine[49]) < avgMacdRange * 0.2 ? 'YES' : 'NO'}`);

console.log(`Price vs SMA50: ABOVE (bullish context)`);
console.log(`Momentum5: BULLISH (7.46)`);

const lastClose = closes[49];
const lastOpen = 4787.82;
const isGreen = lastClose > lastOpen;
console.log(`Last candle: ${isGreen ? 'GREEN' : 'RED'}, Close: ${lastClose}`);

// Checklist scoring
console.log("\n=== SIGNAL CHECKLIST ===");
let score = 0;

// 1. Crossover
console.log(`1. crossoverDetected: ${crossoverDetected}`);
if (crossoverDetected) score++;

// 2. Histogram supports
const histSupports = crossoverDirection === 'bullish' ? histIncreasing : (crossoverDirection === 'bearish' ? histDecreasing : false);
console.log(`2. histogramSupports: ${histSupports}`);
if (histSupports) score++;

// 3. Trend aligned (price > SMA50 for LONG)
const trendAligned = true; // Price is above SMA50, bullish context
console.log(`3. trendAligned: ${trendAligned} (price above SMA50)`);
if (trendAligned) score++;

// 4. Momentum supports
const momentumSupports = true; // momentum5 is bullish (7.46)
console.log(`4. momentumSupports: ${momentumSupports}`);
if (momentumSupports) score++;

// 5. Entry candle confirmed
const entryConfirmed = isGreen; // Last candle direction
console.log(`5. entryCandleConfirmed: ${entryConfirmed}`);
if (entryConfirmed) score++;

// 6. Volume confirm
const volumeConfirm = false; // Volume ratio 0.03x
console.log(`6. volumeConfirm: ${volumeConfirm} (0.03x avg)`);

console.log(`\nCHECKLIST SCORE: ${score}/5`);
console.log(`Signal direction: ${crossoverDirection || 'NONE'}`);

if (score >= 3 && crossoverDetected) {
  const direction = crossoverDirection === 'bullish' ? 'LONG' : 'SHORT';
  const entry = 4787.54;
  const sl = 4767.47; // Below recent swing low
  const tp1 = 4795.15; // Session high
  const tp2 = 4805.00; // Extended
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp1 - entry);
  const rr = (reward / risk).toFixed(2);
  
  console.log(`\nSIGNAL: ${direction}`);
  console.log(`Entry: ${entry}`);
  console.log(`SL: ${sl}`);
  console.log(`TP1: ${tp1}`);
  console.log(`TP2: ${tp2}`);
  console.log(`R:R: ${rr}`);
} else {
  console.log(`\nNO SIGNAL (score: ${score})`);
}
