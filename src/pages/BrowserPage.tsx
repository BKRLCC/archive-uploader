import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DirEntry, FileInfo } from "../api";

// ── Constants ────────────────────────────────────────────────────────────────

const EMOJI = {
  folder: "📁",
  image: "🖼️",
  audio: "🎵",
  video: "🎬",
  doc: "📄",
};

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a"]);
const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "mkv", "webm"]);

const TYPE_LABELS: Record<string, string> = {
  jpg: "JPEG image",
  jpeg: "JPEG image",
  png: "PNG image",
  gif: "GIF image",
  webp: "WebP image",
  mp3: "MP3 audio",
  wav: "WAV audio",
  flac: "FLAC audio",
  aac: "AAC audio",
  ogg: "OGG audio",
  m4a: "M4A audio",
  mp4: "MP4 video",
  mov: "QuickTime video",
  avi: "AVI video",
  mkv: "MKV video",
  webm: "WebM video",
  pdf: "PDF document",
  txt: "Plain text",
  html: "HTML file",
  js: "JavaScript file",
  json: "JSON file",
  md: "Markdown file",
  xlsx: "Excel spreadsheet",
  docx: "Word document",
  pptx: "PowerPoint",
  zip: "ZIP archive",
  gz: "GZ archive",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function emojiFor(entry: DirEntry) {
  if (entry.isDirectory) return EMOJI.folder;
  if (entry.name === "archive.xlsx") return "⭐";
  if (IMAGE_EXTS.has(entry.ext)) return EMOJI.image;
  if (AUDIO_EXTS.has(entry.ext)) return EMOJI.audio;
  if (VIDEO_EXTS.has(entry.ext)) return EMOJI.video;
  return EMOJI.doc;
}

function typeLabel(entry: DirEntry) {
  if (entry.isDirectory) return "Folder";
  return (
    TYPE_LABELS[entry.ext] ??
    (entry.ext ? `${entry.ext.toUpperCase()} file` : "File")
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

interface Selected {
  entry: DirEntry;
  filePath: string;
}

export default function BrowserPage() {
  const navigate = useNavigate();

  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const imgRef = useRef<HTMLImageElement>(null);

  const navigateTo = useCallback(async (folderPath: string) => {
    setSelected(null);
    setFileInfo(null);
    setImageDims(null);
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
      setImageDims(null);
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
    setImageDims(null);
  }, []);

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

  const isImage = selected ? IMAGE_EXTS.has(selected.entry.ext) : false;

  return (
    <div className="browser-page" onClick={closePanel}>
      <p>
        <Link to="/">← Home</Link>
      </p>
      <div className="browser-inner">
        <div className="browser-left">
          <nav className="breadcrumb">{renderBreadcrumb()}</nav>
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
          <div className="detail-inner">
            {isImage && (
              <img
                ref={imgRef}
                className="preview"
                alt=""
                src={selected ? `file://${selected.filePath}` : undefined}
                onLoad={() => {
                  const img = imgRef.current;
                  if (img)
                    setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
                }}
              />
            )}
            <p className="detail-name">{selected?.entry.name}</p>
            {fileInfo && selected && (
              <p className="detail-type">
                {typeLabel(selected.entry)}
                {!selected.entry.isDirectory &&
                  ` · ${formatSize(fileInfo.size)}`}
              </p>
            )}
            {fileInfo && selected && (
              <table className="detail-meta">
                <tbody>
                  <tr>
                    <td>Created</td>
                    <td>{formatDate(fileInfo.birthtime)}</td>
                  </tr>
                  <tr>
                    <td>Modified</td>
                    <td>{formatDate(fileInfo.mtime)}</td>
                  </tr>
                  {isImage && (
                    <tr>
                      <td>Dimensions</td>
                      <td>
                        {imageDims ? `${imageDims.w} × ${imageDims.h}` : "—"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
