import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  cancelJob,
  deleteJob,
  downloadResults,
  getItem,
  getJob,
  getMe,
  logout,
  retryFailed,
  startJob,
  uploadExcel,
  uploadResults,
} from "./api/client";
import LoginForm from "./components/LoginForm.jsx";
import PoDetail from "./components/PoDetail.jsx";
import PoList from "./components/PoList.jsx";
import ProgressPanel from "./components/ProgressPanel.jsx";

const APP_TITLE = import.meta.env.VITE_APP_TITLE || "PO Classifier";
const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS || 2000);
const PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE || 50);

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [username, setUsername] = useState(null);

  const [tab, setTab] = useState("process");
  const [processFile, setProcessFile] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [processJob, setProcessJob] = useState(null);
  const [viewJob, setViewJob] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryNotice, setRetryNotice] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const job = tab === "process" ? processJob : viewJob;
  const isRunning = processJob?.state === "running";
  const cancelRequested = Boolean(processJob?.cancel_requested);
  const isView = tab === "view";

  const handleUnauthorized = useCallback(() => {
    setUsername(null);
    setError("Session expired. Please sign in again.");
  }, []);

  const withAuth = useCallback(
    async (fn) => {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          handleUnauthorized();
        }
        throw err;
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setUsername(me.username);
      } catch {
        if (!cancelled) setUsername(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshJob = useCallback(
    async (jobId) => {
      const data = await withAuth(() => getJob(jobId));
      setProcessJob(data);
      return data;
    },
    [withAuth],
  );

  useEffect(() => {
    if (!username || !processJob?.job_id || processJob.state !== "running") return undefined;
    const id = setInterval(async () => {
      try {
        await refreshJob(processJob.job_id);
      } catch (err) {
        setError(err.message || String(err));
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [username, processJob?.job_id, processJob?.state, refreshJob]);

  useEffect(() => {
    if (!username || !job?.job_id || selectedId == null) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const data = await withAuth(() => getItem(job.job_id, selectedId));
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    username,
    job?.job_id,
    selectedId,
    job?.completed,
    job?.failed,
    job?.processing,
    job?.state,
    withAuth,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, job?.job_id]);

  const items = useMemo(() => job?.items || [], [job]);

  function switchTab(next) {
    if (next === tab) return;
    setTab(next);
    setSelectedId(null);
    setDetail(null);
    setError("");
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }

  async function handleLogout() {
    setError("");
    try {
      await logout();
    } catch {
      /* still clear local session */
    }
    setUsername(null);
    setProcessFile(null);
    setViewFile(null);
    setProcessJob(null);
    setViewJob(null);
    setSelectedId(null);
    setDetail(null);
  }

  async function handleUploadFile(chosen) {
    if (!chosen || busy || isRunning) return;
    setProcessFile(chosen);
    setError("");
    setBusy(true);
    try {
      const data = await withAuth(() => uploadExcel(chosen));
      setProcessJob(data);
      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadResults(chosen) {
    if (!chosen || busy) return;
    setViewFile(chosen);
    setError("");
    setBusy(true);
    try {
      const data = await withAuth(() => uploadResults(chosen));
      setViewJob(data);
      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!processJob?.job_id) return;
    setError("");
    setBusy(true);
    try {
      const data = await withAuth(() => startJob(processJob.job_id));
      setProcessJob(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (!processJob?.job_id) return;
    const n = processJob.failed || 0;
    if (n === 0) return;

    setError("");
    setRetryNotice("");
    setIsRetrying(true);
    setBusy(true);
    try {
      const data = await withAuth(() => retryFailed(processJob.job_id));
      setProcessJob(data);
      setRetryNotice(
        `Retrying ${n} failed PO${n === 1 ? "" : "s"} — processing started.`,
      );
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsRetrying(false);
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!processJob?.job_id || !isRunning || cancelRequested) return;
    setError("");
    setBusy(true);
    try {
      const data = await withAuth(() => cancelJob(processJob.job_id));
      setProcessJob(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!processJob?.job_id) return;
    setError("");
    setBusy(true);
    try {
      await withAuth(() => downloadResults(processJob.job_id));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    const jobId = job?.job_id;
    setError("");
    if (jobId) {
      try {
        await withAuth(() => deleteJob(jobId));
      } catch (err) {
        setError(err.message || String(err));
        if (isRunning) return;
      }
    }
    if (isView) {
      setViewFile(null);
      setViewJob(null);
    } else {
      setProcessFile(null);
      setProcessJob(null);
    }
    setSelectedId(null);
    setDetail(null);
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }

  if (authChecking) {
    return (
      <div className="login-page">
        <div className="login-card panel">
          <p className="login-subtitle">Checking session…</p>
        </div>
      </div>
    );
  }

  if (!username) {
    return (
      <LoginForm
        appTitle={APP_TITLE}
        onSuccess={(name) => {
          setUsername(name);
          setError("");
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="header-brand">
            <img className="header-logo" src="/assetcues-logo.png" alt="AssetCues" />
            <h1>{APP_TITLE}</h1>
          </div>
          <nav className="mode-switch" aria-label="App sections">
            <button
              type="button"
              className={`mode-btn ${tab === "process" ? "active" : ""}`}
              onClick={() => switchTab("process")}
            >
              Process
            </button>
            <button
              type="button"
              className={`mode-btn ${tab === "view" ? "active" : ""}`}
              onClick={() => switchTab("view")}
            >
              View results
            </button>
          </nav>
          <div className="header-user">
            <span className="header-username">{username}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
        <p>
          {isView
            ? "Open a saved results file to review"
            : "Upload Excel and classify purchase orders"}
        </p>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {isView ? (
        <section className="panel">
          <h2 className="panel-title">Open saved results</h2>
          <div className="control-step">
            <div className="step-label">
              <span className="step-num">1</span>
              Choose combined results JSON
            </div>
            <div className="upload-row">
              <label className={`file-label${busy ? " disabled" : ""}`}>
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  onChange={(e) => {
                    const chosen = e.target.files?.[0] || null;
                    e.target.value = "";
                    if (chosen) handleUploadResults(chosen);
                  }}
                />
                {busy && viewFile ? (
                  <>
                    Loading: <strong>{viewFile.name}</strong>…
                  </>
                ) : viewFile ? (
                  <>
                    Loaded: <strong>{viewFile.name}</strong>
                  </>
                ) : (
                  <>Drop or choose results JSON</>
                )}
              </label>
            </div>
            <p className="hint step-hint">
              Use the file from <strong>Download results</strong> (includes erp_json +
              azure_output). Raw Azure JSON is not supported here.
            </p>
          </div>
          <div className="control-step control-step-secondary">
            <div className="step-label muted">Other actions</div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2 className="panel-title">Upload &amp; controls</h2>

          <div className="control-step">
            <div className="step-label">
              <span className="step-num">1</span>
              Choose Excel file
            </div>
            <div className="upload-row">
              <label className={`file-label${busy || isRunning ? " disabled" : ""}`}>
                <input
                  type="file"
                  accept=".xlsx,.xlsm"
                  disabled={busy || isRunning}
                  onChange={(e) => {
                    const chosen = e.target.files?.[0] || null;
                    e.target.value = "";
                    if (chosen) handleUploadFile(chosen);
                  }}
                />
                {busy && processFile ? (
                  <>
                    Uploading: <strong>{processFile.name}</strong>…
                  </>
                ) : processFile ? (
                  <>
                    Uploaded: <strong>{processFile.name}</strong>
                  </>
                ) : (
                  <>Drop or choose Excel file</>
                )}
              </label>
            </div>
            <p className="hint step-hint">
              Needs columns: Purchase Order Number, ERP JSON. File uploads automatically when
              chosen — Start processing is separate.
            </p>
          </div>

          <div className="control-step">
            <div className="step-label">
              <span className="step-num">2</span>
              Run classification
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary btn-start"
                disabled={
                  !processJob || busy || isRunning || (processJob.pending || 0) === 0
                }
                onClick={handleStart}
              >
                Start processing
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!processJob || busy || !isRunning || cancelRequested}
                onClick={handleCancel}
              >
                {cancelRequested ? "Cancelling…" : "Cancel"}
              </button>
            </div>
            {processJob && !isRunning && (processJob.pending || 0) > 0 ? (
              <p className="hint step-hint">
                Ready: {processJob.pending} pending
                {(processJob.skipped || 0) > 0 ? ` · ${processJob.skipped} skipped` : ""}
                {(processJob.invalid || 0) > 0 ? ` · ${processJob.invalid} invalid` : ""} —
                click Start processing
              </p>
            ) : null}
            {isRunning && cancelRequested ? (
              <p className="info-banner step-hint">
                Cancel requested — stopping after the current batch.
              </p>
            ) : isRunning ? (
              <p className="hint step-hint">
                Cancel stops after the current batch finishes.
              </p>
            ) : null}
          </div>

          <div className="control-step control-step-secondary">
            <div className="step-label muted">Other actions</div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-danger"
                disabled={
                  !processJob || busy || isRunning || (processJob.failed || 0) === 0
                }
                onClick={handleRetry}
              >
                {isRetrying ? "Retrying…" : "Retry failed"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!processJob || busy}
                onClick={handleDownload}
              >
                Download results
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || isRunning}
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
            {retryNotice ? <p className="info-banner step-hint">{retryNotice}</p> : null}
          </div>
        </section>
      )}

      <ProgressPanel job={job} />

      {job ? (
        <div className="workspace">
          <PoList
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
          <PoDetail detail={detail} loading={detailLoading} />
        </div>
      ) : (
        <section className="panel">
          <div className="detail-empty">
            {isView
              ? "Upload a combined Download results JSON to browse purchase orders."
              : "Upload an Excel file to begin. Processing runs in the background in configurable batches."}
          </div>
        </section>
      )}
    </div>
  );
}
