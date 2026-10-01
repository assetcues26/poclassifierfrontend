export default function ProgressPanel({ job }) {
  if (!job) return null;

  const done =
    (job.completed || 0) + (job.failed || 0) + (job.skipped || 0) + (job.invalid || 0);
  const total = job.total || 0;
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <section className="panel">
      <h2 className="panel-title">PO status</h2>
      <div className="stats">
        <div className="stat">
          <span className="label">Total</span>
          <span className="value">{job.total}</span>
        </div>
        <div className="stat">
          <span className="label">Processing</span>
          <span className="value">{job.processing}</span>
        </div>
        <div className="stat">
          <span className="label">Completed</span>
          <span className="value">{job.completed}</span>
        </div>
        <div className="stat">
          <span className="label">Failed</span>
          <span className="value">{job.failed}</span>
        </div>
        <div className="stat">
          <span className="label">Skipped</span>
          <span className="value">{job.skipped}</span>
        </div>
        <div className="stat">
          <span className="label">Invalid</span>
          <span className="value">{job.invalid}</span>
        </div>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {job.original_filename ? (
        <p className="hint">{job.original_filename}</p>
      ) : null}
    </section>
  );
}
