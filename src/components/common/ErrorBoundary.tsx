import { Component, type ErrorInfo, type ReactNode } from 'react';
import { strings } from '@/strings';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches unhandled render errors so the whole app never shows a blank page.
 * (Class component — React requires classes for error boundaries.)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{strings.errors.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            An unexpected error occurred. Your data was not lost — reload the page to continue.
          </p>
          <pre className="mt-4 overflow-auto rounded bg-slate-50 p-3 text-left text-xs text-slate-500">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            {strings.common.reload}
          </button>
        </div>
      </div>
    );
  }
}
