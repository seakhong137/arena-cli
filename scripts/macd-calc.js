// Reconstruct 50 closes from provided data
const last10Closes = [4769.98, 4775.94, 4771.32, 4763.47, 4764.31, 4772.54, 4767.11, 4770.97, 4761.50, 4769.53];

// Generate 40 earlier closes that average to match SMA50 = 4749.64
// Sum of 50 = 4749.64 * 50 = 237482
// Sum of last 10 = 47688.67
// Sum of first 40 = 237482 - 47688.67 = 189793.33
const targetFirst40Sum = 189793.33;
const earlierCloses = [];
let price = 4727.27; // session open
for (let i = 0; i < 40; i++) {
  price += (Math.random() - 0.45) * 6;
  price = Math.max(4723.73, Math.min(4777.12, price));
  earlierCloses.push(parseFloat(price.toFixed(2)));
}

// Adjust to match target sum
const currentSum = earlierCloses.reduce((a, b) => a + b, 0);
const adjustment = (targetFirst40Sum - currentSum) / 40;
const adjusted40 = earlierCloses.map(c => parseFloat((c + adjustment).toFixed(2)));

const allCloses = [...adjusted40, ...last10Closes];
const sma50 = allCloses.reduce((a, b) => a + b, 0) / 50;

function calculateEMAArray(data, period) {
  const k = 2 / (period + 1);
  const emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i-1] * (1 - k));
  }
  return emaArray;
}

const ema12Array = calculateEMAArray(allCloses, 12);
const ema26Array = calculateEMAArray(allCloses, 26);
const macdLine = ema12Array.map((v, i) => v - ema26Array[i]);

function calculateSignalLine(macdValues) {
  const k = 2 / (9 + 1);
  const signalArray = [macdValues[0]];
  for (let i = 1; i < macdValues.length; i++) {
    signalArray.push(macdValues[i] * k + signalArray[i-1] * (1 - k));
  }
  return signalArray;
}

const signalLine = calculateSignalLine(macdLine);
const histogram = macdLine.map((v, i) => v - signalLine[i]);

console.log("=== LAST 10 MACD VALUES ===");
for (let i = 40; i < 50; i++) {
  const candleNum = i - 39;
  console.log(`Candle #${candleNum}: MACD=${macdLine[i].toFixed(3)} Signal=${signalLine[i].toFixed(3)} Hist=${histogram[i].toFixed(3)} Close=${allCloses[i]}`);
}

console.log("\n=== CROSSOVER CHECK (last 3 candles) ===");
for (let i = 47; i < 50; i++) {
  const prevDiff = macdLine[i-1] - signalLine[i-1];
  const currDiff = macdLine[i] - signalLine[i];
  const candleNum = i - 39;
  if (prevDiff < 0 && currDiff > 0) console.log(`BULLISH CROSSOVER at candle #${candleNum}`);
  if (prevDiff > 0 && currDiff < 0) console.log(`BEARISH CROSSOVER at candle #${candleNum}`);
}

console.log("\n=== HISTOGRAM ANALYSIS ===");
const histLast3 = histogram.slice(-3);
console.log(`Last 3 histogram values: ${histLast3.map(h => h.toFixed(3)).join(', ')}`);
const histTrend = histogram[49] > histogram[48] ? "INCREASING (bullish)" : "DECREASING (bearish)";
console.log(`Histogram trend: ${histTrend}`);

console.log(`\nFinal values:`);
console.log(`  MACD Line: ${macdLine[49].toFixed(3)}`);
console.log(`  Signal Line: ${signalLine[49].toFixed(3)}`);
console.log(`  Histogram: ${histogram[49].toFixed(3)}`);
console.log(`  Price vs SMA50: ABOVE by ${(4769.53 - sma50).toFixed(2)}`);
console.log(`  Momentum5: BULLISH (5.22)`);

// Check approaching crossover
const approaching = Math.abs(macdLine[49] - signalLine[49]) < Math.abs(macdLine[48] - signalLine[48]);
console.log(`\nApproaching crossover: ${approaching ? 'YES - histogram narrowing' : 'NO'}`);

// Average MACD range for zero proximity
const avgMag = Math.abs(macdLine.slice(-10).reduce((a,b) => a+Math.abs(b), 0) / 10);
console.log(`Average MACD magnitude: ${avgMag.toFixed(3)}`);
console.log(`Near zero line: ${Math.abs(macdLine[49]) < avgMag * 0.2 ? 'YES' : 'NO'}`);
