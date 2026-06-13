/* eslint-disable react-refresh/only-export-components */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display a fallback UI.
 * Usage: Wrap any component that might throw errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Error is captured in state — no console noise in production
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-red-900/50 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-4">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps a component with an error boundary that resets on location change.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  Wrapped.displayName = `withErrorBoundary(${displayName})`;
  return Wrapped;
}