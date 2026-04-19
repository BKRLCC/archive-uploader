import React from "react";

interface Props {
  rootFolder: string;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({
  rootFolder,
  currentPath,
  onNavigate,
}: Props) {
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

  return (
    <div>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <React.Fragment key={seg.segPath}>
            {i > 0 && <span className="sep">›</span>}
            <span
              className={isLast ? "current" : undefined}
              onClick={isLast ? undefined : () => onNavigate(seg.segPath)}
            >
              {seg.label}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
