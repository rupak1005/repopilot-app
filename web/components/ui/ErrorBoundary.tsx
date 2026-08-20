import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { WarningCircle } from '@phosphor-icons/react';

type Props = {
  children: ReactNode;
  /** Optional label for logs / UI */
  name?: string;
};

type State = {
  error: Error | null;
};

/** Catches render crashes in a subtree and offers reload. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      JSON.stringify({
        event: 'ui.error_boundary',
        name: this.props.name ?? 'app',
        message: error.message,
        componentStack: info.componentStack?.slice(0, 500)
      })
    );
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="ui-error-boundary">
        <EmptyState
          icon={WarningCircle}
          title="Something broke in this view"
          description={
            process.env.NODE_ENV === 'development'
              ? this.state.error.message
              : 'Try again. If it keeps failing, reload the page.'
          }
          action={
            <div className="ui-error-boundary__actions">
              <Button type="button" variant="primary" size="sm" onClick={this.retry}>
                Try again
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </div>
          }
        />
      </div>
    );
  }
}
