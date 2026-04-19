import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ArchiveView from "../components/ArchiveView";
import type { FileInfo } from "../api";

export default function FilePage() {
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get("path") ?? "";

  const [info, setInfo] = useState<FileInfo | null>(null);

  useEffect(() => {
    if (!filePath || filePath.endsWith("metadata.xlsx")) return;
    window.api.getFileInfo(filePath).then(setInfo);
  }, [filePath]);

  if (!filePath) return <p>No file specified.</p>;

  if (filePath.endsWith("metadata.xlsx")) {
    return <ArchiveView xlsxPath={filePath} />;
  }

  const name = filePath.split(/[/\\]/).pop() ?? filePath;

  return (
    <div className="file-page">
      <h1>{name}</h1>
      {info ? (
        <table className="file-info-table">
          <tbody>
            <tr>
              <th>Size</th>
              <td>{(info.size / 1024).toFixed(1)} KB</td>
            </tr>
            <tr>
              <th>Created</th>
              <td>{new Date(info.birthtime).toLocaleString()}</td>
            </tr>
            <tr>
              <th>Modified</th>
              <td>{new Date(info.mtime).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="items-state">Loading…</p>
      )}
    </div>
  );
}
