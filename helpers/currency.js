// Todos los precios se almacenan y trabajan en COP (pesos colombianos)
// Sin conversiones de moneda

function formatCOP(amount) {
  const num = Number(amount) || 0;
  // Formato exacto sin redondeo: COP siempre entero
  const copValue = Math.round(num);
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(copValue);
}

module.exports = { formatCOP };
