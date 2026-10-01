import { useEffect, useMemo, useRef } from "react";
import StatusBadge from "./StatusBadge.jsx";

export default function PoList({
  items,
  selectedId,
  onSelect,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  page,
  pageSize,
  onPageChange,
}) {
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !q || String(item.po_number).toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // ↑ / ↓ move selection through the filtered list (skip when typing in inputs).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (filtered.length === 0) return;

      e.preventDefault();
      const ids = filtered.map((item) => item.synthetic_id);
      let idx = selectedId == null ? -1 : ids.indexOf(selectedId);
      if (e.key === "ArrowDown") {
        idx = idx < 0 ? 0 : Math.min(ids.length - 1, idx + 1);
      } else {
        idx = idx < 0 ? 0 : Math.max(0, idx - 1);
      }

      const nextId = ids[idx];
      onSelect(nextId);
      const nextPage = Math.floor(idx / pageSize) + 1;
      if (nextPage !== safePage) onPageChange(nextPage);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, selectedId, pageSize, safePage, onSelect, onPageChange]);

  useEffect(() => {
    if (selectedId == null) return;
    const el = listRef.current?.querySelector(`[data-po-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedId, safePage]);

  return (
    <section className="panel list-panel">
      <h2 className="panel-title">Purchase orders</h2>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search PO number"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
          <option value="invalid">Invalid</option>
        </select>
      </div>

      <div className="po-list" ref={listRef}>
        {pageItems.length === 0 ? (
          <div className="detail-empty">No purchase orders match this filter.</div>
        ) : (
          pageItems.map((item) => (
            <button
              key={item.synthetic_id}
              type="button"
              data-po-id={item.synthetic_id}
              className={`po-row ${selectedId === item.synthetic_id ? "active" : ""}`}
              onClick={() => onSelect(item.synthetic_id)}
            >
              <div className="po-id">{item.po_number || "(missing PO number)"}</div>
              <div className="meta">
                <StatusBadge status={item.status} />
                <span>{item.line_count} lines</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="pagination">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </button>
        <span>
          Page {safePage} / {totalPages} · {filtered.length} shown
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
