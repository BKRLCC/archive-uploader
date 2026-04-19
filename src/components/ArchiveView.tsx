import React, { useCallback, useEffect, useState } from "react";
import type { SheetData } from "../api";
import EditDrawer from "./EditDrawer";
import EditRootDatasetForm from "./EditRootDatasetForm";
import Drawer from "./Drawer";

type SheetState = SheetData | null | "empty" | "missing";

interface EditingRow {
  rowIndex: number;
  row: string[];
  sheetName: string;
}

function sheetStateFromData(data: SheetData | null): SheetState {
  if (data === null) return "missing";
  if (data.headers.length === 0) return "empty";
  return data;
}

interface Props {
  xlsxPath: string;
}

export default function ArchiveView({ xlsxPath }: Props) {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("RootDataset");
  const [sheets, setSheets] = useState<Record<string, SheetState>>({});

  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [addingItem, setAddingItem] = useState<string | false>(false);
  const [editingRootDataset, setEditingRootDataset] = useState(false);

  const [populateFeedback, setPopulateFeedback] = useState("");
  const [populateBusy, setPopulateBusy] = useState(false);

  const folder = xlsxPath.replace(/[/\\][^/\\]+$/, "");

  const closeDrawer = useCallback(() => {
    setEditingRow(null);
    setAddingItem(false);
    setEditingRootDataset(false);
  }, []);

  const reloadSheet = useCallback(
    async (name: string) => {
      const data = await window.api.readSheet(xlsxPath, name);
      setSheets((prev) => ({ ...prev, [name]: sheetStateFromData(data) }));
    },
    [xlsxPath],
  );

  const loadAll = useCallback(async () => {
    const names = await window.api.getSheetNames(xlsxPath);
    setSheetNames(names);
    if (names.length > 0) setActiveTab(names[0]);
    const results = await Promise.all(
      names.map(async (name) => {
        const data = await window.api.readSheet(xlsxPath, name);
        return [name, sheetStateFromData(data)] as const;
      }),
    );
    setSheets(Object.fromEntries(results));
  }, [xlsxPath]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Populate Files tab ──────────────────────────────────────────────────────

  async function handlePopulate() {
    const rootFolder = await window.api.getRootFolder();
    if (!folder || !rootFolder) return;
    setPopulateBusy(true);
    setPopulateFeedback("Working…");
    try {
      const { count } = await window.api.populateFilesTab(folder, rootFolder);
      setPopulateFeedback(`✓ Updated (${count} file${count !== 1 ? "s" : ""})`);
      await reloadSheet("Files");
    } catch (err) {
      setPopulateFeedback(`✗ ${(err as Error).message}`);
    } finally {
      setPopulateBusy(false);
    }
  }

  // ── Row handlers ────────────────────────────────────────────────────────────

  function handleSaveRow(
    rowIndex: number,
    updated: string[],
    sheetName: string,
  ) {
    setSheets((prev) => {
      const sheet = prev[sheetName];
      if (!sheet || typeof sheet === "string") return prev;
      return {
        ...prev,
        [sheetName]: {
          ...sheet,
          rows: sheet.rows.map((r, i) => (i === rowIndex ? updated : r)),
        },
      };
    });
  }

  function handleAddRow(
    _rowIndex: number,
    newRow: string[],
    sheetName: string,
  ) {
    setSheets((prev) => {
      const sheet = prev[sheetName];
      if (!sheet || typeof sheet === "string") return prev;
      return {
        ...prev,
        [sheetName]: { ...sheet, rows: [...sheet.rows, newRow] },
      };
    });
  }

  // ── Generic read-only table ─────────────────────────────────────────────────

  function renderGenericTable(sheet: SheetState, emptyLabel: string) {
    if (sheet === "missing") return <p className="items-state">Not found.</p>;
    if (sheet === "empty") return <p className="items-state">{emptyLabel}</p>;
    if (!sheet) return <p className="items-state">Loading…</p>;
    return (
      <div className="table-scroll">
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
      </div>
    );
  }

  // ── Editable Items-style table ──────────────────────────────────────────────

  function renderEditableTable(sheet: SheetState, sheetName: string) {
    if (sheet === "missing")
      return <p className="items-state">Sheet not found in metadata.xlsx.</p>;
    if (sheet === "empty")
      return <p className="items-state">This tab is empty.</p>;
    if (!sheet) return <p className="items-state">Loading…</p>;

    const visibleIndices = sheet.headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h === "@type" || !h.startsWith("@"))
      .map(({ i }) => i);

    return (
      <div className="table-scroll">
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
                    setEditingRootDataset(false);
                    setAddingItem(false);
                    setEditingRow({ rowIndex, row, sheetName });
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
      </div>
    );
  }

  const rootDatasetSheet = sheets["RootDataset"] ?? null;
  const drawerOpen =
    editingRootDataset || editingRow !== null || addingItem !== false;

  return (
    <div className="archive-page" onClick={closeDrawer}>
      <div className="archive-main">
        <h1>⭐ Metadata</h1>

        <div className="tab-bar">
          {sheetNames.map((tab) => (
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
            {renderGenericTable(sheets["Files"] ?? null, "Files tab is empty.")}
          </section>
        )}

        {activeTab !== "RootDataset" &&
          activeTab !== "Files" &&
          (() => {
            const sheet = sheets[activeTab] ?? null;
            return (
              <section>
                <div className="section-toolbar">
                  <h2>{activeTab}</h2>
                  <div>
                    <button
                      className="refresh-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        reloadSheet(activeTab);
                      }}
                    >
                      ↻ Refresh
                    </button>{" "}
                    {sheet && typeof sheet !== "string" && (
                      <button
                        className="refresh-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeDrawer();
                          setAddingItem(activeTab);
                        }}
                      >
                        + Add item
                      </button>
                    )}
                  </div>
                </div>
                {renderEditableTable(sheet, activeTab)}
              </section>
            );
          })()}
      </div>

      <Drawer open={drawerOpen} width={320}>
        {editingRootDataset &&
          rootDatasetSheet &&
          typeof rootDatasetSheet !== "string" && (
            <EditRootDatasetForm
              sheetData={rootDatasetSheet}
              xlsxPath={xlsxPath}
              onSave={(updated) =>
                setSheets((prev) => ({ ...prev, RootDataset: updated }))
              }
              onClose={closeDrawer}
            />
          )}
        {editingRow &&
          (() => {
            const sheet = sheets[editingRow.sheetName];
            return sheet && typeof sheet !== "string" ? (
              <EditDrawer
                headers={sheet.headers}
                row={editingRow.row}
                rowIndex={editingRow.rowIndex}
                xlsxPath={xlsxPath}
                sheetName={editingRow.sheetName}
                onSave={(rowIndex, updated) =>
                  handleSaveRow(rowIndex, updated, editingRow.sheetName)
                }
                onClose={closeDrawer}
              />
            ) : null;
          })()}
        {addingItem &&
          (() => {
            const sheet = sheets[addingItem];
            return sheet && typeof sheet !== "string" ? (
              <EditDrawer
                headers={sheet.headers}
                row={sheet.headers.map(() => "")}
                rowIndex={-1}
                xlsxPath={xlsxPath}
                sheetName={addingItem}
                onSave={(rowIndex, newRow) =>
                  handleAddRow(rowIndex, newRow, addingItem)
                }
                onClose={closeDrawer}
                isNew
              />
            ) : null;
          })()}
      </Drawer>
    </div>
  );
}
