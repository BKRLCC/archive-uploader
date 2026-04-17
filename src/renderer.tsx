import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import HomePage from "./pages/HomePage";
import BrowserPage from "./pages/BrowserPage";
import SettingsPage from "./pages/SettingsPage";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browser" element={<BrowserPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);
