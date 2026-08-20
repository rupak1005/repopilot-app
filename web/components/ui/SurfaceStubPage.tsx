import Link from 'next/link';
import { SURFACE_STUBS, stubHref, type SurfaceStub } from '../../lib/surfaceStubs';

type SurfaceStubPageProps = {
  stubId: SurfaceStub['id'];
  repoId: string | null;
};

/** Shared Planning / Wiki stub chrome — honest roadmap + useful exits. */
export function SurfaceStubPage({ stubId, repoId }: SurfaceStubPageProps) {
  const stub = SURFACE_STUBS[stubId];

  return (
    <div className="canvas-inner ui-surface-stub">
      <div className="page-title-block">
        <p className="label-caps ui-surface-stub__status">{stub.statusLabel}</p>
        <h1>{stub.title}</h1>
        <p>{stub.lede}</p>
      </div>

      <section className="ui-surface-stub__panel" aria-labelledby={`${stubId}-roadmap`}>
        <h2 id={`${stubId}-roadmap`} className="ui-surface-stub__heading">
          Planned for this surface
        </h2>
        <ol className="ui-surface-stub__roadmap">
          {stub.roadmap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="ui-surface-stub__panel" aria-labelledby={`${stubId}-related`}>
        <h2 id={`${stubId}-related`} className="ui-surface-stub__heading">
          Use these meanwhile
        </h2>
        <ul className="ui-surface-stub__links">
          {stub.related.map((link) => {
            const href = repoId ? stubHref(repoId, link.path) : link.path;
            return (
              <li key={link.id}>
                <Link className="ui-surface-stub__card" href={href}>
                  <span className="ui-surface-stub__card-title">{link.label}</span>
                  <span className="ui-surface-stub__card-desc">{link.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
