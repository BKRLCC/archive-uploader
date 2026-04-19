import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Outlet } from "react-router-dom";
import "./index.css";
import AppHeader from "./components/AppHeader";
import AppSubHeader from "./components/AppSubHeader";
import HomePage from "./pages/HomePage";
import BrowserPage from "./pages/BrowserPage";
import SettingsPage from "./pages/SettingsPage";

function Layout() {
  return (
    <div className="app-layout">
      <AppHeader />
      <AppSubHeader />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/browser" element={<BrowserPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);
