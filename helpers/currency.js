const DEFAULT_RATE = process.env.USD_TO_COP ? parseFloat(process.env.USD_TO_COP) : 4500;

function convertToCOP(amount, rate = DEFAULT_RATE) {
  const num = Number(amount) || 0;
  return Math.round(num * rate * 100) / 100;
}

function formatCOP(amount, rate) {
  const copValue = convertToCOP(amount, rate);
  // Format without decimals for COP (common in CLP/COP usage)
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(copValue);
}

module.exports = { convertToCOP, formatCOP };
