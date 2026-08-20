import { describe, expect, it } from 'vitest';
import {
  IMPACT_CALIBRATION_CASES,
  assertImpactCalibration,
  evaluateImpactCalibration
} from './impactCalibration';

describe('impactCalibration', () => {
  it('locks risk/confidence/factor ids for every golden scenario', () => {
    expect(IMPACT_CALIBRATION_CASES.length).toBeGreaterThanOrEqual(5);
    for (const scenario of IMPACT_CALIBRATION_CASES) {
      const actual = evaluateImpactCalibration(scenario.input);
      expect(actual.risk, scenario.id).toBe(scenario.expect.risk);
      expect(actual.confidence, scenario.id).toBe(scenario.expect.confidence);
      for (const factorId of scenario.expect.factorIds) {
        expect(actual.factorIds, `${scenario.id}:${factorId}`).toContain(factorId);
      }
    }
  });

  it('reports no failures via assertImpactCalibration', () => {
    expect(assertImpactCalibration()).toEqual([]);
  });
});
