import React from "react";
import { Link } from "react-router-dom";
import { DataTypeLabels } from "../config/datatype-labels";
import { UiIcons } from "../config/icons";

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
        All your metadata is kept in Excel files called{" "}
        <code>metadata.xlsx</code>. In the Archivist app, you will see these
        files called "<code>⭐ Metadata</code>". You can make an{" "}
        <code>⭐ Metadata</code> file in any folder by clicking the{" "}
        <span className="pretend-button">🌟 Create metadata file</span> button.
        When it comes to upload time, the app will read and combine all of these
        archive files.
      </p>
      <p>
        There are a few special types of data. Each of these has its own folder
        in the root of your archive.
      </p>
      <ul>
        <li>
          {DataTypeLabels.PeopleAndOrgs.icon}{" "}
          {DataTypeLabels.PeopleAndOrgs.label}
        </li>
        <li>
          {DataTypeLabels.Places.icon} {DataTypeLabels.Places.label}
        </li>
        <li>
          {DataTypeLabels["ldac:DataReuseLicense"].icon}{" "}
          {DataTypeLabels["ldac:DataReuseLicense"].label}
        </li>
      </ul>
      <h2>Get started: </h2>
      <p>
        <Link className="button-link" to="/browser">
          {UiIcons.fileBrowser} File Browser
        </Link>
      </p>
      <p>
        <Link to="/settings" className="button-link">
          {UiIcons.settings} Settings
        </Link>
      </p>
    </div>
  );
}
