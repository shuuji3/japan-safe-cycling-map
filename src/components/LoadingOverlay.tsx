export function LoadingOverlay() {
  return (
    <div className="bike-loading-overlay" role="status" aria-live="polite">
      <div className="bike-loading-card">
        <span className="t-safest">Japan</span>
        <span className="t-safe">Safe</span>
        <span className="t-moderate">Cycling</span>
        <span className="t-dangerous">
          Map.
          <img src="./favicon.svg" alt="" className="logo-image" aria-hidden="true" />
        </span>
      </div>
      <p className="bike-loading-text">loading bicycle roads data…</p>
    </div>
  )
}
