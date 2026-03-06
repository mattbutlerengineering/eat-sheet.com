import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Slurms } from "./Slurms";

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <Slurms variant="snarky" size={64} />
          <h2 className="font-display font-bold text-xl text-stone-200">
            Well, that's not great...
          </h2>
          <p className="text-stone-400 text-sm max-w-xs">
            Something went wrong. Slurms is embarrassed.
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
