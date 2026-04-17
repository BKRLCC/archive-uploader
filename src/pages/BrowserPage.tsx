import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DirEntry, FileInfo } from "../api";
import FilePreview, { type Selected } from "../components/FilePreview";

// ── Constants ────────────────────────────────────────────────────────────────

const EMOJI = {
  folder: "📁",
  image: "🖼️",
  audio: "🎵",
  video: "🎬",
  doc: "📄",
};

const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a"]);
const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "mkv", "webm"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS_BROWSER = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

function emojiFor(entry: DirEntry) {
  if (entry.isDirectory) return EMOJI.folder;
  if (entry.name === "archive.xlsx") return "⭐";
  if (IMAGE_EXTS_BROWSER.has(entry.ext)) return EMOJI.image;
  if (AUDIO_EXTS.has(entry.ext)) return EMOJI.audio;
  if (VIDEO_EXTS.has(entry.ext)) return EMOJI.video;
  return EMOJI.doc;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BrowserPage() {
  const navigate = useNavigate();

  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  const navigateTo = useCallback(async (folderPath: string) => {
    setSelected(null);
    setFileInfo(null);
    setCurrentPath(folderPath);
    const result = await window.api.listFolder(folderPath);
    setEntries(result);
  }, []);

  useEffect(() => {
    window.api.getRootFolder().then((folder) => {
      setRootFolder(folder);
      if (folder) navigateTo(folder);
    });
  }, [navigateTo]);

  const handleSelect = useCallback(
    async (entry: DirEntry, filePath: string) => {
      setSelected({ entry, filePath });
      setFileInfo(null);
      const info = await window.api.getFileInfo(filePath);
      setFileInfo(info);
    },
    [],
  );

  const handleEntryClick = useCallback(
    (e: React.MouseEvent, entry: DirEntry, filePath: string) => {
      e.stopPropagation();
      handleSelect(entry, filePath);
    },
    [handleSelect],
  );

  const handleEntryDblClick = useCallback(
    (e: React.MouseEvent, entry: DirEntry, filePath: string) => {
      e.stopPropagation();
      if (entry.isDirectory) {
        navigateTo(filePath);
      } else if (entry.name === "archive.xlsx") {
        navigate("/archive", { state: { folder: currentPath } });
      }
    },
    [navigateTo, navigate, currentPath],
  );

  const closePanel = useCallback(() => {
    setSelected(null);
    setFileInfo(null);
  }, []);

  const handleCreateArchive = useCallback(async () => {
    if (!currentPath) return;
    await window.api.createArchive(currentPath);
    await navigateTo(currentPath);
  }, [currentPath, navigateTo]);

  // ── Breadcrumb ──────────────────────────────────────────────────────────────

  function renderBreadcrumb() {
    if (!rootFolder || !currentPath) return null;
    const rel = currentPath.slice(rootFolder.length);
    const parts = rel.split(/[/\\]/).filter(Boolean);

    const segments: { label: string; segPath: string }[] = [
      { label: "🏠 Home", segPath: rootFolder },
    ];
    let builtPath = rootFolder;
    for (const part of parts) {
      builtPath = builtPath + "/" + part;
      segments.push({ label: part, segPath: builtPath });
    }

    return segments.map((seg, i) => {
      const isLast = i === segments.length - 1;
      return (
        <React.Fragment key={seg.segPath}>
          {i > 0 && <span className="sep">›</span>}
          <span
            className={isLast ? "current" : undefined}
            onClick={isLast ? undefined : () => navigateTo(seg.segPath)}
          >
            {seg.label}
          </span>
        </React.Fragment>
      );
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!rootFolder) {
    return (
      <div className="browser-page">
        <p>
          <Link to="/">← Home</Link>
        </p>
        <p className="empty-state">
          No root folder set.{" "}
          <Link to="/settings">Choose one in Settings →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="browser-page" onClick={closePanel}>
      <p>
        <Link to="/">← Home</Link>
      </p>
      <div className="browser-inner">
        <div className="browser-left">
          <div className="breadcrumb-bar">
            <nav className="breadcrumb">{renderBreadcrumb()}</nav>
            {currentPath && currentPath !== rootFolder &&
              !entries.some((e) => e.name === "archive.xlsx") && (
              <button className="create-archive-btn" onClick={(e) => { e.stopPropagation(); handleCreateArchive(); }}>
                🌟 Create archive here
              </button>
            )}
          </div>
          <ul className="file-list">
            {entries.length === 0 ? (
              <li className="empty">This folder is empty.</li>
            ) : (
              entries.map((entry) => {
                const filePath = currentPath + "/" + entry.name;
                const isSelected = selected?.filePath === filePath;
                return (
                  <li
                    key={entry.name}
                    className={[
                      entry.isDirectory || entry.name === "archive.xlsx"
                        ? "folder"
                        : "",
                      isSelected ? "selected" : "",
                    ]
                      .join(" ")
                      .trim()}
                    onClick={(e) => handleEntryClick(e, entry, filePath)}
                    onDoubleClick={(e) =>
                      handleEntryDblClick(e, entry, filePath)
                    }
                  >
                    {emojiFor(entry)}&nbsp;&nbsp;{entry.name}
                  </li>
                );
              })
            )}
          </ul>
        </div>
        <div
          className={`detail-panel${selected ? " open" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <FilePreview selected={selected} fileInfo={fileInfo} />
        </div>
      </div>
    </div>
  );
}
