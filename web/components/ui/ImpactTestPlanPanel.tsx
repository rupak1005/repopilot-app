import { useState } from 'react';
import { buildImpactTestPlan, type ImpactTestPlan } from '@repopilot/common';
import type { ImpactTestRecommendation } from '../../lib/types';

type ImpactTestPlanPanelProps = {
  tests: ImpactTestRecommendation[];
  testPlan?: ImpactTestPlan | null;
};

export function ImpactTestPlanPanel({ tests, testPlan }: ImpactTestPlanPanelProps) {
  const [hint, setHint] = useState<string | null>(null);
  const plan =
    testPlan ??
    (tests.length > 0 ? buildImpactTestPlan(tests.map((t) => t.filePath)) : null);

  async function copyScript() {
    if (!plan?.shellScript || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(plan.shellScript);
      setHint('Copied');
      window.setTimeout(() => setHint(null), 1600);
    } catch {
      setHint('Copy failed');
      window.setTimeout(() => setHint(null), 1600);
    }
  }

  if (tests.length === 0) {
    return (
      <p className="ui-finding-card__desc">
        No test files import these modules in the dependency graph.
      </p>
    );
  }

  return (
    <div className="ui-impact-test-plan">
      <ul className="ui-impact-tests">
        {tests.map((test) => {
          const cls = plan?.classes.find((c) => c.filePath === test.filePath);
          return (
            <li key={test.filePath} className="ui-impact-test">
              <p className="mono ui-impact-test__path">{test.filePath}</p>
              <p className="ui-impact-test__reason">{test.reason}</p>
              <div className="ui-impact-test__meta">
                <span className="label-caps">{test.confidence} confidence</span>
                {cls?.packageName ? (
                  <span className="label-caps ui-impact-test__pkg">{cls.packageName}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {plan && plan.commands.length > 0 ? (
        <div className="ui-impact-test-plan__run">
          <p className="label-caps">Local run commands</p>
          <pre className="ui-impact-test-plan__script mono">{plan.shellScript}</pre>
          <button type="button" className="ui-diagram__action" onClick={() => void copyScript()}>
            {hint ?? 'Copy run commands'}
          </button>
          <p className="ui-impact-test-plan__note">
            RepoPilot classifies and hands off — it does not execute tests remotely.
          </p>
        </div>
      ) : null}
    </div>
  );
}
