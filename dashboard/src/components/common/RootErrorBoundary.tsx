import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Last-resort catch for a FRONTEND render crash (as opposed to
 * `ExceptionModal`, which surfaces BACKEND exceptions). Without this,
 * React 19 unmounts the entire tree on any uncaught render error and the
 * app goes silently blank — this renders the error + component stack
 * in-place instead, so a bug is always visible, never a white screen.
 */
export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error('RootErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0f19] p-8 text-white">
        <h1 className="text-xl font-bold text-red-400">Frontend crashed</h1>
        <p className="max-w-2xl break-words font-mono text-sm text-red-200">{error.message}</p>
        {error.stack && (
          <pre className="max-h-64 max-w-3xl overflow-auto rounded-md border border-red-900 bg-black/40 p-3 font-mono text-xs text-red-100">
            {error.stack}
          </pre>
        )}
        {info?.componentStack && (
          <pre className="max-h-64 max-w-3xl overflow-auto rounded-md border border-white/10 bg-black/40 p-3 font-mono text-xs text-white/70">
            {info.componentStack}
          </pre>
        )}
      </div>
    );
  }
}
