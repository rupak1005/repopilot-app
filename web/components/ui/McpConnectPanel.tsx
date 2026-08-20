import Link from 'next/link';
import { useState } from 'react';
import { Check, Copy } from '@phosphor-icons/react';
import {
  MCP_SETUP_STEPS,
  MCP_TOOLS,
  buildMcpCursorConfig,
  mcpToolExample,
  type McpConnectContext
} from '../../lib/mcpConnect';

type McpConnectPanelProps = {
  context?: McpConnectContext;
};

export function McpConnectPanel({ context }: McpConnectPanelProps) {
  const [copied, setCopied] = useState<'config' | 'repoId' | null>(null);
  const ctx = context ?? {};
  const config = buildMcpCursorConfig(ctx);
  const base = ctx.repositoryId ? `/dashboard/${ctx.repositoryId}` : null;

  async function copyText(text: string, kind: 'config' | 'repoId') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // ponytail: user can still select the pre block manually
    }
  }

  return (
    <div className="mcp-connect">
      <ol className="mcp-connect__steps">
        {MCP_SETUP_STEPS.map((step, index) => (
          <li key={step.id} className="mcp-connect__step">
            <span className="mcp-connect__step-num">{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {step.id === 'env' && ctx.repositoryId ? (
                <dl className="mcp-connect__ids">
                  <div>
                    <dt>RepoPilot ID</dt>
                    <dd className="mcp-connect__id-row">
                      <span className="mono">{ctx.repositoryId}</span>
                      <button
                        type="button"
                        className="mcp-connect__copy mcp-connect__copy--inline"
                        onClick={() => void copyText(ctx.repositoryId!, 'repoId')}
                      >
                        {copied === 'repoId' ? (
                          <Check size={14} weight="bold" aria-hidden />
                        ) : (
                          <Copy size={14} weight="bold" aria-hidden />
                        )}
                        {copied === 'repoId' ? 'Copied' : 'Copy'}
                      </button>
                    </dd>
                  </div>
                  {ctx.repoSlug ? (
                    <div>
                      <dt>GitHub slug</dt>
                      <dd className="mono">{ctx.repoSlug}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mcp-connect__config">
        <div className="mcp-connect__config-head">
          <h3>MCP server config</h3>
          <button type="button" className="mcp-connect__copy" onClick={() => void copyText(config, 'config')}>
            {copied === 'config' ? (
              <Check size={16} weight="bold" aria-hidden />
            ) : (
              <Copy size={16} weight="bold" aria-hidden />
            )}
            {copied === 'config' ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        <pre className="mcp-connect__pre mono">{config}</pre>
        <p className="mcp-connect__hint">
          Run from your RepoPilot monorepo root. Works with Cursor, Claude Desktop, and other MCP
          clients that accept the same JSON shape.
        </p>
      </div>

      <div className="mcp-connect__tools">
        <h3>Available tools</h3>
        <ul className="mcp-connect__tool-list">
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name} className="mcp-connect__tool">
              <div className="mcp-connect__tool-head">
                <span className="mono">{tool.name}</span>
                {base ? (
                  <Link className="mcp-connect__tool-link" href={`${base}${tool.dashboardPath}`}>
                    Open in dashboard
                  </Link>
                ) : null}
              </div>
              <span className="mcp-connect__tool-desc">{tool.description}</span>
              <pre className="mcp-connect__tool-example mono">{mcpToolExample(tool.name, ctx)}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
