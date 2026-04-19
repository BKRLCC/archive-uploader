import React, { useState } from "react";
import { toCamelCase } from "../helpers/string-formatters";

function generateId(type: string, name: string): string {
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `#${type}_${toCamelCase(name)}_${rand}`;
}

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
  sheetName: string;
  onSave: (rowIndex: number, updated: string[]) => void;
  onClose: () => void;
  isNew?: boolean;
}

export default function EditDrawer({
  headers,
  row,
  rowIndex,
  xlsxPath,
  sheetName,
  onSave,
  onClose,
  isNew = false,
}: Props) {
  const [values, setValues] = useState<string[]>(() => [...row]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSave() {
    setSaving(true);
    setFeedback("Saving…");

    if (isNew) {
      const nameIdx = headers.indexOf("name");
      const nameVal = (values[nameIdx] ?? "").trim();
      if (!nameVal) {
        setFeedback("✗ Name is required");
        setSaving(false);
        return;
      }
      const typeIdx = headers.indexOf("@type");
      const typeVal = values[typeIdx] ?? "";
      const id = generateId(typeVal, nameVal);
      const updatedValues: Record<string, string> = { "@id": id };
      headers.forEach((h, i) => {
        updatedValues[h] = values[i] ?? "";
      });
      try {
        const updated = await window.api.addSheetRow(
          xlsxPath,
          sheetName,
          updatedValues,
        );
        onSave(rowIndex, updated);
        onClose();
      } catch (err) {
        setFeedback(`✗ ${(err as Error).message}`);
        setSaving(false);
      }
      return;
    }

    const updatedValues: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h !== "@id") updatedValues[h] = values[i] ?? "";
    });
    try {
      const updated = await window.api.updateSheetRow(
        xlsxPath,
        sheetName,
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
    <div className="drawer-inner">
      <h3>Edit item</h3>
      <div className="edit-fields">
        {headers.map((key, i) => {
          if (isNew && key === "@id") return null;
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
