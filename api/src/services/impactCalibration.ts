import {
  buildRiskFactors,
  computeImpactConfidence,
  computeRisk,
  type ImpactConfidence,
  type ImpactRisk,
  type ImpactRiskFactor
} from './impactAnalysis';

export type ImpactCalibrationInput = {
  directCount: number;
  transitiveCount: number;
  hotspotScore: number;
  testCount: number;
  coChangeCount: number;
  hasHotspot: boolean;
};

export type ImpactCalibrationCase = {
  id: string;
  label: string;
  input: ImpactCalibrationInput;
  expect: {
    risk: ImpactRisk;
    confidence: ImpactConfidence;
    /** Factor ids that must appear (order-independent). */
    factorIds: string[];
  };
};

export const IMPACT_CALIBRATION_CASES: ImpactCalibrationCase[] = [
  {
    id: 'leaf-quiet',
    label: 'Leaf module with no dependents or hotspot',
    input: {
      directCount: 0,
      transitiveCount: 0,
      hotspotScore: 0,
      testCount: 0,
      coChangeCount: 0,
      hasHotspot: false
    },
    expect: {
      risk: 'LOW',
      confidence: 'MEDIUM',
      factorIds: ['tests']
    }
  },
  {
    id: 'untested-blast',
    label: 'Small blast radius with no related tests',
    input: {
      directCount: 2,
      transitiveCount: 0,
      hotspotScore: 0,
      testCount: 0,
      coChangeCount: 0,
      hasHotspot: false
    },
    expect: {
      risk: 'HIGH',
      confidence: 'HIGH',
      factorIds: ['direct', 'tests']
    }
  },
  {
    id: 'tested-blast',
    label: 'Same blast radius with at least one test',
    input: {
      directCount: 2,
      transitiveCount: 0,
      hotspotScore: 0,
      testCount: 1,
      coChangeCount: 1,
      hasHotspot: false
    },
    expect: {
      risk: 'MEDIUM',
      confidence: 'HIGH',
      factorIds: ['direct', 'tests', 'cochange']
    }
  },
  {
    id: 'wide-blast',
    label: 'Wide transitive blast forces HIGH regardless of tests',
    input: {
      directCount: 1,
      transitiveCount: 12,
      hotspotScore: 10,
      testCount: 3,
      coChangeCount: 0,
      hasHotspot: true
    },
    expect: {
      risk: 'HIGH',
      confidence: 'HIGH',
      factorIds: ['direct', 'transitive', 'tests', 'churn']
    }
  },
  {
    id: 'hotspot-hub',
    label: 'Hotspot score alone widens risk',
    input: {
      directCount: 0,
      transitiveCount: 0,
      hotspotScore: 45,
      testCount: 2,
      coChangeCount: 4,
      hasHotspot: true
    },
    expect: {
      risk: 'HIGH',
      confidence: 'HIGH',
      factorIds: ['tests', 'churn', 'cochange']
    }
  }
];

export type ImpactCalibrationResult = {
  risk: ImpactRisk;
  confidence: ImpactConfidence;
  factorIds: string[];
  factors: ImpactRiskFactor[];
};

export function evaluateImpactCalibration(
  input: ImpactCalibrationInput
): ImpactCalibrationResult {
  const risk = computeRisk({
    directCount: input.directCount,
    transitiveCount: input.transitiveCount,
    hotspotScore: input.hotspotScore,
    testCount: input.testCount
  });
  const confidence = computeImpactConfidence({
    directCount: input.directCount,
    transitiveCount: input.transitiveCount,
    testCount: input.testCount,
    hasHotspot: input.hasHotspot
  });
  const factors = buildRiskFactors({
    directCount: input.directCount,
    transitiveCount: input.transitiveCount,
    testCount: input.testCount,
    hotspotScore: input.hotspotScore,
    coChangeCount: input.coChangeCount
  });
  return {
    risk,
    confidence,
    factorIds: factors.map((factor) => factor.id),
    factors
  };
}

export function assertImpactCalibration(
  cases: ImpactCalibrationCase[] = IMPACT_CALIBRATION_CASES
): string[] {
  const failures: string[] = [];
  for (const scenario of cases) {
    const actual = evaluateImpactCalibration(scenario.input);
    const missing = scenario.expect.factorIds.filter((id) => !actual.factorIds.includes(id));
    if (
      actual.risk !== scenario.expect.risk ||
      actual.confidence !== scenario.expect.confidence ||
      missing.length > 0
    ) {
      failures.push(scenario.id);
    }
  }
  return failures;
}
