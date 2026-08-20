import Link from 'next/link';

type ImpactBlastMapProps = {
  target: string;
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports: string[];
  baseHref: string;
};

function shortName(path: string): string {
  const parts = path.split('/');
  return parts.length <= 2 ? path : parts.slice(-2).join('/');
}

/** Lightweight blast-radius map — no canvas dependency. */
export function ImpactBlastMap({
  target,
  directDependents,
  transitiveDependents,
  outboundImports,
  baseHref
}: ImpactBlastMapProps) {
  const direct = directDependents.slice(0, 8);
  const transitive = transitiveDependents.slice(0, 6);
  const imports = outboundImports.slice(0, 6);

  return (
    <div className="ui-impact-blast" aria-label="Blast radius map">
      <div className="ui-impact-blast__col">
        <p className="label-caps">Imports</p>
        <ul>
          {imports.length === 0 ? (
            <li className="ui-impact-blast__empty">None</li>
          ) : (
            imports.map((mod) => (
              <li key={mod}>
                <span className="mono" title={mod}>
                  {shortName(mod)}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="ui-impact-blast__seed" title={target}>
        <span className="label-caps">Target</span>
        <p className="mono">{shortName(target)}</p>
      </div>
      <div className="ui-impact-blast__col">
        <p className="label-caps">Direct dependents</p>
        <ul>
          {direct.length === 0 ? (
            <li className="ui-impact-blast__empty">None</li>
          ) : (
            direct.map((mod) => (
              <li key={mod}>
                <Link className="mono" href={`${baseHref}/impact?file=${encodeURIComponent(mod)}`} title={mod}>
                  {shortName(mod)}
                </Link>
              </li>
            ))
          )}
        </ul>
        {transitive.length > 0 ? (
          <>
            <p className="label-caps">Transitive</p>
            <ul>
              {transitive.map((mod) => (
                <li key={mod}>
                  <Link
                    className="mono ui-impact-blast__muted"
                    href={`${baseHref}/impact?file=${encodeURIComponent(mod)}`}
                    title={mod}
                  >
                    {shortName(mod)}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
