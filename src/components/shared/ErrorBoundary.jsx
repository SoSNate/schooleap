import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || 'משהו לא צפוי קרה';
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        <div className="max-w-sm text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="text-6xl">😵</div>
          <h2 className="text-2xl font-black">אוי, משהו נשבר!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            נסה לטעון מחדש. אם זה ממשיך — פנה אלינו.
          </p>
          <pre className="text-[11px] text-left bg-slate-50 dark:bg-slate-900 rounded-xl p-3 overflow-auto max-h-32 text-slate-600 dark:text-slate-400">
            {msg}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.handleHome}
              className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm"
            >
              🏠 לדף הבית
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow"
            >
              🔄 טען מחדש
            </button>
          </div>
        </div>
      </div>
    );
  }
}
