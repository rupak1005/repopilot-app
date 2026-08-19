import { useState } from 'react';
import { Check, Copy } from '@phosphor-icons/react';
import {
  MCP_SETUP_STEPS,
  MCP_TOOLS,
  buildMcpCursorConfig,
  type McpConnectContext
} from '../../lib/mcpConnect';

type McpConnectPanelProps = {
  context?: McpConnectContext;
};

export function McpConnectPanel({ context }: McpConnectPanelProps) {
  const [copied, setCopied] = useState(false);
  const config = buildMcpCursorConfig(context ?? {});

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
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
              {step.id === 'env' && context?.repositoryId ? (
                <dl className="mcp-connect__ids">
                  <div>
                    <dt>RepoPilot ID</dt>
                    <dd className="mono">{context.repositoryId}</dd>
                  </div>
                  {context.repoSlug ? (
                    <div>
                      <dt>GitHub slug</dt>
                      <dd className="mono">{context.repoSlug}</dd>
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
          <h3>Cursor MCP config</h3>
          <button type="button" className="mcp-connect__copy" onClick={() => void copyConfig()}>
            {copied ? <Check size={16} weight="bold" aria-hidden /> : <Copy size={16} weight="bold" aria-hidden />}
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        <pre className="mcp-connect__pre mono">{config}</pre>
        <p className="mcp-connect__hint">
          Run from your RepoPilot monorepo root. Claude Desktop uses the same JSON under its MCP
          settings path.
        </p>
      </div>

      <div className="mcp-connect__tools">
        <h3>Available tools</h3>
        <ul>
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name}>
              <span className="mono">{tool.name}</span>
              <span>{tool.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
