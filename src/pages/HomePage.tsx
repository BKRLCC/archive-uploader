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
      <p>
        All your metadata is kept in Excel files called <code>archive.tsx</code>
        . In the Archivist app, you will see these files called "
        <code>⭐ Archive</code>". You can make an <code>⭐ Archive</code> in any
        folder by clicking the "🌟 Create archive" button. When it comes to
        upload time, the app will read and combine all of these archive files.
      </p>
      <p>
        <Link to="/browser">File Browser</Link>
      </p>
      <p>
        <Link to="/settings">Settings</Link>
      </p>
    </div>
  );
}
