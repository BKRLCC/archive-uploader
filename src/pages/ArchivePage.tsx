import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { SheetData } from "../api";
import EditDrawer from "../components/EditDrawer";
import EditRootDatasetForm from "../components/EditRootDatasetForm";
import Drawer from "../components/Drawer";

type TabId = "RootDataset" | "Items" | "Files";
type SheetState = SheetData | null | "empty" | "missing";

interface EditingRow {
  rowIndex: number;
  row: string[];
}

function sheetStateFromData(data: SheetData | null): SheetState {
  if (data === null) return "missing";
  if (data.headers.length === 0) return "empty";
  return data;
}

export default function ArchivePage() {
  const location = useLocation();
  const folder: string | undefined = (location.state as { folder?: string })
    ?.folder;

  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("RootDataset");

  const [rootDatasetSheet, setRootDatasetSheet] = useState<SheetState>(null);
  const [itemsSheet, setItemsSheet] = useState<SheetState>(null);
  const [filesSheet, setFilesSheet] = useState<SheetState>(null);

  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editingRootDataset, setEditingRootDataset] = useState(false);

  const [populateFeedback, setPopulateFeedback] = useState("");
  const [populateBusy, setPopulateBusy] = useState(false);

  const xlsxPath = folder ? folder + "/archive.xlsx" : null;

  const closeDrawer = useCallback(() => {
    setEditingRow(null);
    setAddingItem(false);
    setEditingRootDataset(false);
  }, []);

  const loadRootDataset = useCallback(async () => {
    if (!xlsxPath) return;
    const data = await window.api.readSheet(xlsxPath, "RootDataset");
    setRootDatasetSheet(sheetStateFromData(data));
  }, [xlsxPath]);

  const loadItems = useCallback(async () => {
    if (!xlsxPath) return;
    setEditingRow(null);
    const data = await window.api.readSheet(xlsxPath, "Items");
    setItemsSheet(sheetStateFromData(data));
  }, [xlsxPath]);

  const loadFiles = useCallback(async () => {
    if (!xlsxPath) return;
    const data = await window.api.readSheet(xlsxPath, "Files");
    setFilesSheet(sheetStateFromData(data));
  }, [xlsxPath]);

  useEffect(() => {
    window.api.getRootFolder().then(setRootFolder);
    loadRootDataset();
    loadItems();
    loadFiles();
  }, [loadRootDataset, loadItems, loadFiles]);

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
      await loadFiles();
    } catch (err) {
      setPopulateFeedback(`✗ ${(err as Error).message}`);
    } finally {
      setPopulateBusy(false);
    }
  }

  // ── Row handlers ────────────────────────────────────────────────────────────

  function handleSaveRow(rowIndex: number, updated: string[]) {
    setItemsSheet((prev) => {
      if (!prev || typeof prev === "string") return prev;
      return {
        ...prev,
        rows: prev.rows.map((r, i) => (i === rowIndex ? updated : r)),
      };
    });
  }

  function handleAddRow(_rowIndex: number, newRow: string[]) {
    setItemsSheet((prev) => {
      if (!prev || typeof prev === "string") return prev;
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  }

  // ── Generic table ───────────────────────────────────────────────────────────

  function renderGenericTable(sheet: SheetState, emptyLabel: string) {
    if (sheet === "missing") return <p className="items-state">Not found.</p>;
    if (sheet === "empty") return <p className="items-state">{emptyLabel}</p>;
    if (!sheet) return <p className="items-state">Loading…</p>;
    return (
      <table className="sheet-table">
        <thead>
          <tr>
            {sheet.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ── Items table ─────────────────────────────────────────────────────────────

  function renderItemsTable() {
    if (itemsSheet === "missing")
      return <p className="items-state">No Items tab found in archive.xlsx.</p>;
    if (itemsSheet === "empty")
      return <p className="items-state">Items tab is empty.</p>;
    if (!itemsSheet) return <p className="items-state">Loading…</p>;

    const visibleIndices = itemsSheet.headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h === "@type" || !h.startsWith("@"))
      .map(({ i }) => i);

    return (
      <table className="sheet-table">
        <thead>
          <tr>
            <th></th>
            {visibleIndices.map((i) => (
              <th key={i}>{itemsSheet.headers[i]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemsSheet.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td
                className="edit-btn-cell"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRootDataset(false);
                  setAddingItem(false);
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

  const drawerOpen = editingRootDataset || editingRow !== null || addingItem;

  return (
    <div className="archive-page" onClick={closeDrawer}>
      <div className="archive-main">
        <p>
          <Link to="/browser">← Back to browser</Link>
        </p>
        <h1>⭐ Archive</h1>
        <p className="folder-path">{renderBreadcrumb()}</p>

        <div className="tab-bar">
          {(["RootDataset", "Items", "Files"] as TabId[]).map((tab) => (
            <button
              key={tab}
              className={`tab${activeTab === tab ? " active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab);
                closeDrawer();
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "RootDataset" && (
          <section>
            <div className="section-toolbar">
              <h2>Root Dataset</h2>
              <button
                className="refresh-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeDrawer();
                  setEditingRootDataset(true);
                }}
              >
                ✏️ Edit
              </button>
            </div>
            {renderGenericTable(rootDatasetSheet, "RootDataset tab is empty.")}
          </section>
        )}

        {activeTab === "Items" && (
          <section>
            <div className="section-toolbar">
              <h2>Items</h2>
              <div>
                <button
                  className="refresh-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadItems();
                  }}
                >
                  ↻ Refresh
                </button>{" "}
                {itemsSheet && typeof itemsSheet !== "string" && (
                  <button
                    className="refresh-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDrawer();
                      setAddingItem(true);
                    }}
                  >
                    + Add item
                  </button>
                )}
              </div>
            </div>
            {renderItemsTable()}
          </section>
        )}

        {activeTab === "Files" && (
          <section>
            <div className="section-toolbar">
              <h2>Files</h2>
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePopulate();
                  }}
                  disabled={populateBusy}
                  className="refresh-btn"
                >
                  ↻ Update Files tab
                </button>{" "}
                <span className="populate-feedback">{populateFeedback}</span>
              </div>
            </div>
            {renderGenericTable(filesSheet, "Files tab is empty.")}
          </section>
        )}
      </div>

      <Drawer open={drawerOpen} width={320}>
        {editingRootDataset &&
          rootDatasetSheet &&
          typeof rootDatasetSheet !== "string" && (
            <EditRootDatasetForm
              sheetData={rootDatasetSheet}
              xlsxPath={xlsxPath!}
              onSave={(updated) => setRootDatasetSheet(updated)}
              onClose={closeDrawer}
            />
          )}
        {editingRow && itemsSheet && typeof itemsSheet !== "string" && (
          <EditDrawer
            headers={itemsSheet.headers}
            row={editingRow.row}
            rowIndex={editingRow.rowIndex}
            xlsxPath={xlsxPath!}
            onSave={handleSaveRow}
            onClose={closeDrawer}
          />
        )}
        {addingItem && itemsSheet && typeof itemsSheet !== "string" && (
          <EditDrawer
            headers={itemsSheet.headers}
            row={itemsSheet.headers.map(() => "")}
            rowIndex={-1}
            xlsxPath={xlsxPath!}
            onSave={handleAddRow}
            onClose={closeDrawer}
            isNew
          />
        )}
      </Drawer>
    </div>
  );
}
