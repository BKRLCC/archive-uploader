import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const [rootFolder, setRootFolder] = useState<string | null>(null);

  useEffect(() => {
    window.api.getRootFolder().then(setRootFolder);
  }, []);

  async function handleChoose() {
    const chosen = await window.api.chooseRootFolder();
    if (chosen) setRootFolder(chosen);
  }

  return (
    <div>
      <p><Link to="/">← Back</Link></p>
      <h1>Settings</h1>
      <section>
        <h2>Root folder</h2>
        <p>{rootFolder ?? "No folder selected."}</p>
        <button onClick={handleChoose}>Choose folder…</button>
      </section>
    </div>
  );
}
