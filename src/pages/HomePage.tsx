import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div>
      <h1>💖 Hello!</h1>
      <p>Archivist is your archive manager.</p>
      <p>Here you can: </p>
      <ul>
        <li>Browse the items in your archive folder</li>
        <li>Add metadata to these items</li>
        <li>
          Upload these items to a web archive for easy browsing (Coming soon!)
        </li>
      </ul>
      <h2>How it works</h2>
      <p></p>
      <p>
        <Link to="/browser">File Browser</Link>
      </p>
      <p>
        <Link to="/settings">Settings</Link>
      </p>
    </div>
  );
}
