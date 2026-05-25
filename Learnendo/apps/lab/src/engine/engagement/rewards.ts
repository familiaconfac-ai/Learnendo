import { FIRE_WEIGHT, DIAMOND_WEIGHT, ICE_PENALTY } from './config';

/** Central star formula — always use this, never inline the math */
export function computeStars(fire: number, ice: number, diamonds: number): number {
  return Math.max(0, fire * FIRE_WEIGHT + diamonds * DIAMOND_WEIGHT - ice * ICE_PENALTY);
}
