import React, { useState } from "react";

const TYPE_OPTIONS = [
  { label: "Resource", value: "RepositoryObject", icon: "📜" },
  { label: "Person", value: "Person", icon: "👤" },
  { label: "Organisation", value: "Organization", icon: "🏠︎" },
  { label: "Language", value: "Language", icon: "🔤" },
];

interface Props {
  headers: string[];
  row: string[];
  rowIndex: number;
  xlsxPath: string;
  onSave: (rowIndex: number, updated: string[]) => void;
  onClose: () => void;
}

export default function EditDrawer({
  headers,
  row,
  rowIndex,
  xlsxPath,
  onSave,
  onClose,
}: Props) {
  const [values, setValues] = useState<string[]>(() => [...row]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSave() {
    setSaving(true);
    setFeedback("Saving…");
    const updatedValues: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h !== "@id") updatedValues[h] = values[i] ?? "";
    });
    try {
      const updated = await window.api.updateSheetRow(
        xlsxPath,
        rowIndex,
        updatedValues,
      );
      onSave(rowIndex, updated);
      onClose();
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`);
      setSaving(false);
    }
  }

  return (
    <div className="edit-drawer-inner">
      <h3>Edit item</h3>
      <div className="edit-fields">
        {headers.map((key, i) => {
          const isReadOnly = key === "@id";
          const isTypeField = key === "@type";
          return (
            <label key={key} className="edit-field">
              <span className="edit-field-key">{key}</span>
              {isReadOnly ? (
                <span className="edit-field-readonly">{values[i] || "—"}</span>
              ) : isTypeField ? (
                <select
                  value={values[i] ?? ""}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = e.target.value;
                    setValues(next);
                  }}
                >
                  {!TYPE_OPTIONS.some((o) => o.value === values[i]) && (
                    <option value={values[i] ?? ""}>{values[i] || "—"}</option>
                  )}
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={values[i] ?? ""}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = e.target.value;
                    setValues(next);
                  }}
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
