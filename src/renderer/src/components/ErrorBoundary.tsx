import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          backgroundColor: 'var(--bg-primary, #ffffff)',
          color: 'var(--text-primary, #000000)'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>出现了一些问题</h1>
          <p style={{
            marginBottom: '24px',
            textAlign: 'center',
            maxWidth: '500px',
            color: 'var(--text-muted, #666666)'
          }}>
            应用遇到了意外错误。您可以尝试重新加载页面或联系技术支持。
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--accent-color, #007bff)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重试
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--bg-secondary, #f0f0f0)',
                color: 'var(--text-primary, #000000)',
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              刷新页面
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '24px', maxWidth: '600px', width: '100%' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>错误详情</summary>
              <pre style={{
                backgroundColor: 'var(--bg-tertiary, #f8f8f8)',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}