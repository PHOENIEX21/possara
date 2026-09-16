import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("Uncaught render error:", error, info.componentStack); }
  render() {
    if (this.state.error) {
      return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center"><p className="text-lg text-ink">Something went wrong loading this page.</p><p className="max-w-sm text-sm text-ink-light">Reloading usually fixes it. If it keeps happening, note what you were doing right before it happened.</p><button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"><RefreshCw size={15} /> Reload</button></div>;
    }
    return this.props.children;
  }
}
