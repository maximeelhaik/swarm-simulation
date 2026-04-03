import { BoidConfig } from "./boid";

export const INITIAL_CONTROLS = {
  count: 670,
  maxSpeed: 3.3,
  topoNeighbors: 7,
  separationWeight: 4.0,
  alignmentWeight: 4.0,
  cohesionWeight: 0.9,
  noiseLevel: 0.0,
  occlusionThreshold: 0.39,
};

export const BASE_CONFIG: Partial<BoidConfig> = {
  maxSpeed: 2.8,
  maxForce: 0.1,
  topoNeighbors: 7,
  perceptionRadius: 170,
  predatorRadius: 110,
  predatorForce: 6.2,
};

export function getComputedConfig(controls: typeof INITIAL_CONTROLS): BoidConfig {
  return {
    ...BASE_CONFIG,
    ...controls,
    maxForce: Math.min(0.22, Math.max(0.08, controls.maxSpeed * 0.028)),
  } as BoidConfig;
}
