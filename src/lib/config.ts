import { BoidConfig } from "@/lib/boid";

export const INITIAL_CONTROLS = {
  count: 1600,
  maxSpeed: 3.2,
  separationWeight: 0.9,
  alignmentWeight: 2.2,
  cohesionWeight: 1.6,
  noiseLevel: 0.01,
  occlusionThreshold: 0.2,
  topoNeighbors: 9,
};

export const BASE_CONFIG: Partial<BoidConfig> = {
  maxSpeed: 3.2,
  maxForce: 0.12,
  topoNeighbors: 9,
  perceptionRadius: 180,
  predatorRadius: 120,
  predatorForce: 10,
};

export function getComputedConfig(controls: typeof INITIAL_CONTROLS): BoidConfig {
  return {
    ...BASE_CONFIG,
    ...controls,
    maxForce: Math.min(0.35, Math.max(0.08, controls.maxSpeed * 0.03)),
  } as BoidConfig;
}
