import React from "react";
import { Link } from "react-router-dom";

export default function BrowserPage() {
  return (
    <div>
      <p>
        <Link to="/">← Home</Link>
      </p>
      <h1>📁 File Browser</h1>
      <p>Coming soon.</p>
    </div>
  );
}
