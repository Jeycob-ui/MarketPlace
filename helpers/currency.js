const DEFAULT_RATE = process.env.USD_TO_COP ? parseFloat(process.env.USD_TO_COP) : 4500;
const DB_CURRENCY = process.env.DB_CURRENCY ? process.env.DB_CURRENCY.toUpperCase() : 'USD';

function convertToCOP(amount, rate = DEFAULT_RATE) {
  const num = Number(amount) || 0;
  return Math.round(num * rate * 100) / 100;
}

function copToUsd(amountCOP, rate = DEFAULT_RATE) {
  const num = Number(amountCOP) || 0;
  if (rate === 0) return 0;
  return Math.round((num / rate) * 100) / 100;
}

function formatCOP(amount, rate) {
  const num = Number(amount) || 0;
  let copValue;
  if (DB_CURRENCY === 'USD') {
    copValue = convertToCOP(num, rate);
  } else {
    // assume stored values are already in COP
    copValue = Math.round(num * 100) / 100;
  }
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(copValue);
}

module.exports = { convertToCOP, copToUsd, formatCOP };
