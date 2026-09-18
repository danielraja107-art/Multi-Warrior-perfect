import React from 'react';
import { reportError } from '../../network/telemetry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportError('render', error, 'react error boundary');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-storm-900">
          <div className="panel p-8 max-w-sm text-center">
            <h2 className="font-display text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="font-body text-sm text-storm-300 mb-4">
              An unexpected error occurred. Try again, or return to the main menu.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => this.setState({ hasError: false })} className="btn-primary">
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="btn-secondary"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
