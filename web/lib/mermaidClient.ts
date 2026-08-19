'use client';

type MermaidApi = typeof import('mermaid').default;

declare global {
  interface Window {
    mermaid?: MermaidApi;
  }
}

let loadPromise: Promise<MermaidApi> | null = null;

function loadFromCdn(): Promise<MermaidApi> {
  return new Promise((resolve, reject) => {
    if (window.mermaid) {
      resolve(window.mermaid);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mermaid) resolve(window.mermaid);
      else reject(new Error('Mermaid CDN did not expose window.mermaid'));
    };
    script.onerror = () => reject(new Error('Failed to load Mermaid from CDN'));
    document.head.appendChild(script);
  });
}

/** ponytail: CDN fallback when Turbopack chunk load fails — upgrade path: pin bundled mermaid only */
export function loadMermaid(): Promise<MermaidApi> {
  if (!loadPromise) {
    loadPromise = import('mermaid')
      .then((mod) => mod.default)
      .catch(() => loadFromCdn());
  }
  return loadPromise;
}
