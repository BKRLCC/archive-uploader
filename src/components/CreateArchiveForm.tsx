import React, { useState } from "react";

interface Props {
  folderPath: string;
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateArchiveForm({
  folderPath,
  onCreated,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback("✗ Name is required");
      return;
    }
    setBusy(true);
    setFeedback("Creating…");
    try {
      await window.api.createArchive(folderPath, {
        name: name.trim(),
        description: description.trim(),
      });
      onCreated();
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <div className="drawer-inner">
      <h3>New archive</h3>
      <form onSubmit={handleSubmit}>
        <div className="edit-fields">
          <label className="edit-field">
            <span className="edit-field-key">name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </label>
        </div>
        <div className="edit-actions">
          <button type="submit" disabled={busy}>
            Create
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
        {feedback && <p className="edit-feedback">{feedback}</p>}
      </form>
    </div>
  );
}
