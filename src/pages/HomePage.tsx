import React from 'react'
import { Link } from 'react-router-dom'
import { dataTypeLabels } from '../config/datatype-labels'
import { UiIcons } from '../config/icons'

export default function HomePage() {
  return (
    <div>
      <h1>👋 Hello!</h1>
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
        All your metadata is kept in Excel files called{' '}
        <code>metadata.xlsx</code>. In the Archivist app, you will see these
        files called "<code>⭐ Metadata</code>". You can make an{' '}
        <code>⭐ Metadata</code> file in any folder by clicking the{' '}
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
          {dataTypeLabels.Person.icon} {dataTypeLabels.Person.label}
        </li>
        <li>
          {dataTypeLabels.Place.icon} {dataTypeLabels.Place.label}
        </li>
        <li>
          {dataTypeLabels['ldac:DataReuseLicense'].icon}{' '}
          {dataTypeLabels['ldac:DataReuseLicense'].label}
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
  )
}
