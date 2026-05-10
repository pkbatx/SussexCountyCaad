import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // pino has no frontend equivalent; console.error is the boundary log.
    console.error("route error", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = String(this.state.error.message || this.state.error);
    return (
      <div className="route-error" role="alert">
        <div className="route-error-title">SOMETHING BROKE</div>
        <div className="route-error-message mono">{message}</div>
        <div className="route-error-actions">
          <button type="button" onClick={() => window.location.reload()}>TRY AGAIN</button>
          {this.props.onBack ? (
            <button type="button" onClick={this.props.onBack}>← BACK TO INCIDENTS</button>
          ) : null}
        </div>
      </div>
    );
  }
}
