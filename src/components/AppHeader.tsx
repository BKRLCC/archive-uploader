import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
    </header>
  );
}
