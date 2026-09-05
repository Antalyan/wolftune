/** Rating scale: 1.0 – 10.0 with one decimal precision. */
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

export interface RateActionResult {
  error: string | null;
  success: string | null;
}
