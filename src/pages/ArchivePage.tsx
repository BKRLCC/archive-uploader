import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { SheetData } from "../api";
import EditDrawer from "../components/EditDrawer";
import Drawer from "../components/Drawer";

interface EditingRow {
  rowIndex: number;
  row: string[];
}

export default function ArchivePage() {
  const location = useLocation();
  const folder: string | undefined = (location.state as { folder?: string })
    ?.folder;

  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetData | null | "empty" | "missing">(
    null,
  );
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [populateFeedback, setPopulateFeedback] = useState("");
  const [populateBusy, setPopulateBusy] = useState(false);

  const xlsxPath = folder ? folder + "/archive.xlsx" : null;

  const loadSheet = useCallback(async () => {
    if (!xlsxPath) return;
    setEditingRow(null);
    const data = await window.api.readSheet(xlsxPath, "Items");
    if (data === null) setSheet("missing");
    else if (data.headers.length === 0) setSheet("empty");
    else setSheet(data);
  }, [xlsxPath]);

  useEffect(() => {
    window.api.getRootFolder().then(setRootFolder);
    loadSheet();
  }, [loadSheet]);

  // ── Breadcrumb ──────────────────────────────────────────────────────────────

  function renderBreadcrumb() {
    if (!rootFolder || !folder) return null;
    const rel = folder.slice(rootFolder.length).replace(/^[/\\]/, "");
    const parts = rel ? rel.split(/[/\\]/) : [];
    return ["🏠 Home", ...parts].join(" › ");
  }

  // ── Populate Files tab ──────────────────────────────────────────────────────

  async function handlePopulate() {
    if (!folder || !rootFolder) return;
    setPopulateBusy(true);
    setPopulateFeedback("Working…");
    try {
      const { count } = await window.api.populateFilesTab(folder, rootFolder);
      setPopulateFeedback(`✓ Updated (${count} file${count !== 1 ? "s" : ""})`);
    } catch (err) {
      setPopulateFeedback(`✗ ${(err as Error).message}`);
    } finally {
      setPopulateBusy(false);
    }
  }

  // ── Edit drawer ─────────────────────────────────────────────────────────────

  function handleSaveRow(rowIndex: number, updated: string[]) {
    setSheet((prev) => {
      if (!prev || typeof prev === "string") return prev;
      const newRows = prev.rows.map((r, i) => (i === rowIndex ? updated : r));
      return { ...prev, rows: newRows };
    });
  }

  function handleAddRow(_rowIndex: number, newRow: string[]) {
    setSheet((prev) => {
      if (!prev || typeof prev === "string") return prev;
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  }

  // ── Items table ─────────────────────────────────────────────────────────────

  function renderItemsTable() {
    if (sheet === "missing")
      return <p className="items-state">No Items tab found in archive.xlsx.</p>;
    if (sheet === "empty")
      return <p className="items-state">Items tab is empty.</p>;
    if (!sheet) return <p className="items-state">Loading…</p>;

    const visibleIndices = sheet.headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h === "@type" || !h.startsWith("@"))
      .map(({ i }) => i);

    return (
      <table className="sheet-table">
        <thead>
          <tr>
            <th></th>
            {visibleIndices.map((i) => (
              <th key={i}>{sheet.headers[i]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td
                className="edit-btn-cell"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRow({ rowIndex, row });
                }}
              >
                ✏️
              </td>
              {visibleIndices.map((i) => (
                <td key={i}>{row[i] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (!folder) {
    return (
      <div>
        <p>
          No folder specified. <Link to="/browser">← Back to browser</Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className="archive-page"
      onClick={() => {
        setEditingRow(null);
        setAddingItem(false);
      }}
    >
      <div className="archive-main">
        <p>
          <Link to="/browser">← Back to browser</Link>
        </p>
        <h1>⭐ Archive</h1>
        <p className="folder-path">{renderBreadcrumb()}</p>

        <section>
          <h2>Files tab</h2>
          <p>
            Populate or replace the <strong>Files</strong> sheet in{" "}
            <code>archive.xlsx</code> with the current contents of this folder.
          </p>
          <button onClick={handlePopulate} disabled={populateBusy}>
            Update Files tab
          </button>{" "}
          <span className="populate-feedback">{populateFeedback}</span>
        </section>

        <section>
          <h2>
            Items{" "}
            <button
              className="refresh-btn"
              onClick={(e) => {
                e.stopPropagation();
                loadSheet();
              }}
            >
              ↻ Refresh from file
            </button>{" "}
            {sheet && typeof sheet !== "string" && (
              <button
                className="refresh-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRow(null);
                  setAddingItem(true);
                }}
              >
                + Add item
              </button>
            )}
          </h2>
          <div className="items-table-wrap">{renderItemsTable()}</div>
        </section>
      </div>
      <Drawer open={editingRow !== null || addingItem} width={320}>
        {editingRow && sheet && typeof sheet !== "string" && (
          <EditDrawer
            headers={sheet.headers}
            row={editingRow.row}
            rowIndex={editingRow.rowIndex}
            xlsxPath={xlsxPath!}
            onSave={handleSaveRow}
            onClose={() => setEditingRow(null)}
          />
        )}
        {addingItem && sheet && typeof sheet !== "string" && (
          <EditDrawer
            headers={sheet.headers}
            row={sheet.headers.map(() => "")}
            rowIndex={-1}
            xlsxPath={xlsxPath!}
            onSave={handleAddRow}
            onClose={() => setAddingItem(false)}
            isNew
          />
        )}
      </Drawer>
    </div>
  );
}
