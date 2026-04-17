import React, { useEffect, useRef, useState } from "react";
import type { DirEntry, FileInfo } from "../api";

export interface Selected {
  entry: DirEntry;
  filePath: string;
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

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

interface Props {
  selected: Selected | null;
  fileInfo: FileInfo | null;
}

export default function FilePreview({ selected, fileInfo }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(
    null,
  );

  useEffect(() => {
    setImageDims(null);
  }, [selected?.filePath]);

  const isImage = selected ? IMAGE_EXTS.has(selected.entry.ext) : false;

  return (
    <div className="detail-inner">
      {isImage && selected && (
        <img
          ref={imgRef}
          className="preview"
          alt=""
          src={`localfile://${selected.filePath}`}
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
          {!selected.entry.isDirectory && ` · ${formatSize(fileInfo.size)}`}
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
                <td>{imageDims ? `${imageDims.w} × ${imageDims.h}` : "—"}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
