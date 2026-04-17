import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div>
      <h1>💖 Hello!</h1>
      <p>Welcome to the uploader.</p>
      <p>
        <Link to="/browser">File Browser</Link>
      </p>
      <p>
        <Link to="/settings">Settings</Link>
      </p>
    </div>
  );
}
