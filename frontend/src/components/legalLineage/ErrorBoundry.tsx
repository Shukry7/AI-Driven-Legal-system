import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export default class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // log to console for now
    // In production, send to monitoring service
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 rounded border text-sm">
          <div className="font-semibold text-red-700">Something went wrong rendering the lineage map.</div>
          <div className="mt-2 text-slate-700">Try rerunning the analysis or refresh the page.</div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}