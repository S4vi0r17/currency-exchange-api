// NOTE: redondeo genérico -- evita arrastrar el ruido de precisión de floats
function roundToDecimals(amount: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

// monto_enviar / monto_recibir: 2 decimales (pseudo-esquema del enunciado)
export function roundToCents(amount: number): number {
  return roundToDecimals(amount, 2);
}

// purchase_price / sale_price: 4 decimales (pseudo-esquema del enunciado)
export function roundToRatePrecision(amount: number): number {
  return roundToDecimals(amount, 4);
}
