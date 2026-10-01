const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const DEFAULT_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 120000;
const POLL_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      signal: ctrl.signal,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail || JSON.stringify(body);
      } catch {
        /* ignore */
      }
      throw new ApiError(
        typeof detail === "string" ? detail : JSON.stringify(detail),
        res.status,
      );
    }
    return res;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Check that the backend is running.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function login(username, password) {
  const res = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function logout() {
  const res = await request("/api/logout", { method: "POST" });
  return res.json();
}

export async function getMe() {
  const res = await request("/api/me", {}, POLL_TIMEOUT_MS);
  return res.json();
}

export async function uploadExcel(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await request("/api/jobs", { method: "POST", body: form }, UPLOAD_TIMEOUT_MS);
  return res.json();
}

export async function uploadResults(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await request(
    "/api/jobs/from-results",
    { method: "POST", body: form },
    UPLOAD_TIMEOUT_MS,
  );
  return res.json();
}

export async function getJob(jobId) {
  const res = await request(`/api/jobs/${jobId}`, {}, POLL_TIMEOUT_MS);
  return res.json();
}

export async function getItem(jobId, syntheticId) {
  const res = await request(`/api/jobs/${jobId}/items/${syntheticId}`, {}, POLL_TIMEOUT_MS);
  return res.json();
}

export async function startJob(jobId) {
  const res = await request(`/api/jobs/${jobId}/start`, { method: "POST" });
  return res.json();
}

export async function retryFailed(jobId) {
  const res = await request(`/api/jobs/${jobId}/retry-failed`, { method: "POST" });
  return res.json();
}

export async function cancelJob(jobId) {
  const res = await request(`/api/jobs/${jobId}/cancel`, { method: "POST" });
  return res.json();
}

export async function deleteJob(jobId) {
  const res = await request(`/api/jobs/${jobId}`, { method: "DELETE" });
  return res.json();
}

export async function downloadResults(jobId) {
  const res = await request(`/api/jobs/${jobId}/download`);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] || `po-results-${jobId.slice(0, 8)}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** @deprecated Prefer downloadResults (sends session cookie). */
export function downloadUrl(jobId) {
  return `${API_BASE}/api/jobs/${jobId}/download`;
}

export function downloadRawUrl(jobId) {
  return `${API_BASE}/api/jobs/${jobId}/download-raw`;
}
