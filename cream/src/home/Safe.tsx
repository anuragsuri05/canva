import { Component, Suspense, type ReactNode } from 'react';
import { Spinner } from '../ui/ui';

/** Suspense + error boundary for modules owned by other agents (stubs may throw while in progress). */
class Boundary extends Component<{ children: ReactNode; label?: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err)
      return (
        <div className="empty" data-testid="module-error">
          {this.props.label ?? 'This section'} couldn’t load: {this.state.err.message}
        </div>
      );
    return this.props.children;
  }
}

export function Safe({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <Boundary label={label}>
      <Suspense fallback={<Spinner />}>{children}</Suspense>
    </Boundary>
  );
}
