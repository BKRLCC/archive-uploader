import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UiIcons } from "../config/icons";

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  return (
    <header className="app-header">
      <div className="app-header-back">
        {!isHome && (
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        )}
      </div>
      <span className="app-header-title">Archivist</span>
      <div className="app-header-nav no-drag">
        <button
          className="header-nav-btn"
          onClick={() => navigate("/")}
          title="Home"
        >
          {UiIcons.home}
        </button>
        <button
          className="header-nav-btn"
          onClick={() => navigate("/browser")}
          title="File Browser"
        >
          {UiIcons.fileBrowser}
        </button>
        <button
          className="header-nav-btn"
          onClick={() => navigate("/settings")}
          title="Settings"
        >
          {UiIcons.settings}
        </button>
      </div>
    </header>
  );
}
