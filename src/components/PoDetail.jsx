import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import {
  aiFieldKeys,
  displayValue,
  erpHeaderFields,
  fieldLabel,
  findAzureLine,
} from "../utils";

function lineInputKeys(lines) {
  const keys = new Set();
  for (const line of lines || []) {
    if (line && typeof line === "object") {
      Object.keys(line).forEach((k) => keys.add(k));
    }
  }
  // Prefer polinenumber first if present
  const ordered = Array.from(keys);
  ordered.sort((a, b) => {
    if (a === "polinenumber") return -1;
    if (b === "polinenumber") return 1;
    if (a === "itemname") return -1;
    if (b === "itemname") return 1;
    return a.localeCompare(b);
  });
  return ordered;
}

function truncate(text, max = 90) {
  const s = text == null || text === "" ? "" : String(text);
  if (!s) return "—";
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function FieldGrid({ entries, ai }) {
  if (!entries.length) {
    return <p className="hint">No fields.</p>;
  }
  return (
    <div className="kv-grid">
      {entries.map(([key, value]) => (
        <div className={`kv ${ai ? "kv-ai" : ""}`} key={key}>
          <span className="k">{fieldLabel(key)}</span>
          <span className="v">{displayValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function LineCard({ line, idx, inputKeys, aiKeys, azure, open, onToggle, cardId }) {
  const lineNo = line.polinenumber ?? line.polineid ?? idx + 1;
  const aiLine = findAzureLine(azure, lineNo);
  const itemLabel = truncate(line.itemname ?? line.description ?? "");
  const aiStatus = aiLine?.status != null ? String(aiLine.status) : null;

  const inputEntries = inputKeys.map((k) => [k, line[k]]);
  const aiEntries = aiKeys.map((k) => [k, aiLine ? aiLine[k] : null]);

  return (
    <div id={cardId} className={`line-card ${open ? "open" : ""}`}>
      <button type="button" className="line-card-summary" onClick={onToggle}>
        <span className="line-card-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className="line-card-num">Line {displayValue(lineNo)}</span>
        <span className="line-card-title" title={String(line.itemname || "")}>
          {itemLabel}
        </span>
        {aiStatus ? <span className="line-card-chip">{aiStatus}</span> : null}
      </button>
      {open ? (
        <div className="line-card-body">
          <div className="line-card-section">
            <div className="section-label">Excel input</div>
            <FieldGrid entries={inputEntries} />
          </div>
          <div className="line-card-section">
            <div className="section-label">Azure AI output</div>
            <FieldGrid entries={aiEntries} ai />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PoDetail({ detail, loading }) {
  const [openLines, setOpenLines] = useState(() => new Set());

  useEffect(() => {
    setOpenLines(new Set());
  }, [detail?.id, detail?.po_number]);

  if (loading) {
    return (
      <section className="panel detail-panel">
        <h2 className="panel-title">PO detail</h2>
        <div className="detail-empty">Loading…</div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="panel detail-panel">
        <h2 className="panel-title">PO detail</h2>
        <div className="detail-empty">Select a purchase order to inspect ERP fields and AI output.</div>
      </section>
    );
  }

  const erp = detail.erp || {};
  const header = erpHeaderFields(erp);
  const lines = Array.isArray(erp.lines) ? erp.lines : [];
  const inputKeys = lineInputKeys(lines);
  const azure = detail.azure_response;
  const aiKeys = aiFieldKeys(azure);

  let messageClass = "";
  if (detail.status === "failed" || detail.status === "invalid") messageClass = "danger";
  else if (detail.status === "skipped") messageClass = "warn";

  function toggleLine(key) {
    setOpenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function jumpToLine(key) {
    setOpenLines((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setTimeout(() => {
      const el = document.getElementById(`line-card-${key}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <section className="panel detail-panel">
      <h2 className="panel-title">PO detail</h2>
      <div className="detail-scroll">
        <div className="detail-head">
          <h2>{detail.po_number || "(missing PO number)"}</h2>
          <StatusBadge status={detail.status} />
        </div>

        {detail.message ? (
          <p className={`message-box ${messageClass}`}>{detail.message}</p>
        ) : null}

        <div className="section-label">Lines overview</div>
        <p className="hint step-hint">Click a line number to jump to full details</p>
        {lines.length === 0 ? (
          <div className="empty-lines">No line items to classify</div>
        ) : (
          <div className="lines-overview-wrap">
            <table className="lines-overview">
              <thead>
                <tr>
                  <th>PO line #</th>
                  <th>Item name</th>
                  <th>Description</th>
                  <th>PO type</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const lineNo = line.polinenumber ?? line.polineid ?? idx + 1;
                  const key = `${lineNo}-${idx}`;
                  const aiLine = findAzureLine(azure, lineNo);
                  const poType = aiLine?.po_type;
                  return (
                    <tr key={key}>
                      <td>
                        <button
                          type="button"
                          className="line-jump"
                          title="Jump to line details"
                          onClick={() => jumpToLine(key)}
                        >
                          Line {displayValue(lineNo)}
                        </button>
                      </td>
                      <td title={String(line.itemname || "")}>
                        {truncate(line.itemname, 60)}
                      </td>
                      <td title={String(line.description || "")}>
                        {truncate(line.description, 60)}
                      </td>
                      <td className="po-type-cell">{displayValue(poType)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="section-label">PO details</div>
        {Object.keys(header).length === 0 ? (
          <p className="hint">No header fields available.</p>
        ) : (
          <div className="kv-grid">
            {Object.entries(header).map(([key, value]) => (
              <div className="kv" key={key}>
                <span className="k">{fieldLabel(key)}</span>
                <span className="v">{displayValue(value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section-label">PO lines</div>
        {lines.length === 0 ? (
          <div className="empty-lines">No line items to classify</div>
        ) : (
          <div className="line-cards">
            {lines.map((line, idx) => {
              const lineNo = line.polinenumber ?? line.polineid ?? idx + 1;
              const key = `${lineNo}-${idx}`;
              return (
                <LineCard
                  key={key}
                  cardId={`line-card-${key}`}
                  line={line}
                  idx={idx}
                  inputKeys={inputKeys}
                  aiKeys={aiKeys}
                  azure={azure}
                  open={openLines.has(key)}
                  onToggle={() => toggleLine(key)}
                />
              );
            })}
          </div>
        )}

        {detail.status === "completed" && aiKeys.length === 0 ? (
          <p className="hint">Completed, but no AI line fields were returned for this PO.</p>
        ) : null}
      </div>
    </section>
  );
}
