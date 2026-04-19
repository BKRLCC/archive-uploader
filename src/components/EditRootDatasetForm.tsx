import React, { useState } from "react";
import type { SheetData } from "../api";

const EDITABLE_ROWS = ["name", "description"];

interface Props {
  sheetData: SheetData;
  xlsxPath: string;
  onSave: (updated: SheetData) => void;
  onClose: () => void;
}

export default function EditRootDatasetForm({
  sheetData,
  xlsxPath,
  onSave,
  onClose,
}: Props) {
  const valueIndex = sheetData.headers.indexOf("Value");

  const initialValues = Object.fromEntries(
    sheetData.rows.map((row) => [row[0] ?? "", row[valueIndex] ?? ""]),
  );

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSave() {
    setSaving(true);
    setFeedback("Saving…");
    const updates: Record<string, string> = {};
    for (const key of EDITABLE_ROWS) {
      updates[key] = values[key] ?? "";
    }
    try {
      const updated = await window.api.updateRootDataset(xlsxPath, updates);
      onSave(updated);
      onClose();
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`);
      setSaving(false);
    }
  }

  return (
    <div className="drawer-inner">
      <h3>Edit collection</h3>
      <div className="edit-fields">
        {sheetData.rows.map((row) => {
          const key = row[0] ?? "";
          const isEditable = EDITABLE_ROWS.includes(key);
          return (
            <label key={key} className="edit-field">
              <span className="edit-field-key">{key}</span>
              {!isEditable ? (
                <span className="edit-field-readonly">
                  {values[key] || "—"}
                </span>
              ) : key === "description" ? (
                <textarea
                  value={values[key] ?? ""}
                  rows={4}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              ) : (
                <input
                  type="text"
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="edit-actions">
        <button onClick={handleSave} disabled={saving}>
          Save
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
      {feedback && <p className="edit-feedback">{feedback}</p>}
    </div>
  );
}
