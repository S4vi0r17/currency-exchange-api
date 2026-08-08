// NOTE: redondeo a 2 decimales para no arrastrar el ruido de precisión de floats
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
