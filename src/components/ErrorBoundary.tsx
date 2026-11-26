import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught app error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen pastel-adventure-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/95 rounded-3xl p-8 shadow-xl border border-violet-200 text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">
              🐾
            </div>
            <h2 className="text-2xl font-bold text-[#2e2344]">¡Ups! Tropezamos en el camino</h2>
            <p className="text-sm text-[#5b4d77] leading-relaxed">
              Algo no salió como esperábamos. Puedes recargar la aventura para continuar sin problemas.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Reiniciar aventura
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
