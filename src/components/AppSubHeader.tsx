import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { DirEntry } from "../api";
import Breadcrumb from "./Breadcrumb";

export default function AppSubHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirEntry[]>([]);

  const isOnBrowser = location.pathname === "/browser";
  const currentPath = searchParams.get("path");
  const isFile = searchParams.get("type") === "file";

  useEffect(() => {
    window.api.getRootFolder().then(setRootFolder);
  }, []);

  useEffect(() => {
    if (!isOnBrowser || !currentPath || isFile) return;
    window.api.listFolder(currentPath).then(setEntries);
  }, [isOnBrowser, currentPath, isFile]);

  if (!isOnBrowser || !currentPath || !rootFolder) return null;

  const navigateTo = (path: string) => {
    navigate(`/browser?path=${encodeURIComponent(path)}`);
  };

  const refreshEntries = async () => {
    if (!currentPath || isFile) return;
    const result = await window.api.listFolder(currentPath);
    setEntries(result);
  };

  return (
    <div className="app-subheader">
      <nav className="breadcrumb">
        <Breadcrumb
          rootFolder={rootFolder}
          currentPath={currentPath}
          onNavigate={navigateTo}
        />
      </nav>
      {!isFile && (
        <div className="subheader-actions">
          {currentPath !== rootFolder &&
            !entries.some((e) => e.name === "archive.xlsx") && (
              <button
                className="create-archive-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    `/browser?path=${encodeURIComponent(currentPath)}&showCreate=1`,
                  );
                }}
              >
                🌟 Create Archive
              </button>
            )}
          {currentPath === rootFolder &&
            !entries.some(
              (e) => e.name === "People & Organisations" && e.isDirectory,
            ) && (
              <button
                className="create-archive-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  await window.api.createPeopleOrgsFolder(rootFolder);
                  await refreshEntries();
                }}
              >
                👥 Create People &amp; Orgs folder
              </button>
            )}
          {currentPath === rootFolder &&
            !entries.some((e) => e.name === "Places" && e.isDirectory) && (
              <button
                className="create-archive-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  await window.api.createPlacesFolder(rootFolder);
                  await refreshEntries();
                }}
              >
                📍 Create Places folder
              </button>
            )}
        </div>
      )}
    </div>
  );
}
