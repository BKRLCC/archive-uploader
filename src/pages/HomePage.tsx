import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { dataTypeLabels } from '../config/datatype-labels'
import { UiIcons } from '../config/icons'
import { useAppDispatch } from '../ducks/hooks'
import { loadPeopleFromSpreadsheet } from '../ducks/people-loader'
import { setPeople } from '../ducks/people'
import { loadOrganizationsFromSpreadsheet } from '../ducks/organizations-loader'
import { setOrganizations } from '../ducks/organizations'
import { loadLanguagesFromSpreadsheet } from '../ducks/languages-loader'
import { setLanguages } from '../ducks/languages'
import { loadPlacesFromSpreadsheet } from '../ducks/places-loader'
import { setPlaces } from '../ducks/places'
import { loadTagVocabulariesFromFolder } from '../ducks/tags-loader'
import { setTagVocabularies } from '../ducks/tags'
import { loadLicensesFromSpreadsheet } from '../ducks/licenses-loader'
import { setLicenses } from '../ducks/licenses'

export default function HomePage() {
  const dispatch = useAppDispatch()
  const [reloadBusy, setReloadBusy] = useState(false)
  const [reloadFeedback, setReloadFeedback] = useState('')

  async function handleReloadAll() {
    setReloadBusy(true)
    setReloadFeedback('Reloading…')
    try {
      const [people, organizations, languages, places, vocabularies, licenses] =
        await Promise.all([
          loadPeopleFromSpreadsheet(),
          loadOrganizationsFromSpreadsheet(),
          loadLanguagesFromSpreadsheet(),
          loadPlacesFromSpreadsheet(),
          loadTagVocabulariesFromFolder(),
          loadLicensesFromSpreadsheet(),
        ])
      dispatch(setPeople(people))
      dispatch(setOrganizations(organizations))
      dispatch(setLanguages(languages))
      dispatch(setPlaces(places))
      dispatch(setTagVocabularies(vocabularies))
      dispatch(setLicenses(licenses))
      setReloadFeedback('✓ Done')
    } catch {
      setReloadFeedback('✗ Failed')
    } finally {
      setReloadBusy(false)
    }
  }
  return (
    <div>
      <h1>👋 Hello!</h1>
      <p>Balachi is your archive manager.</p>
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
        <code>metadata.xlsx</code>. In the Balachi app, you will see these files
        called "<code>⭐ Metadata</code>". You can make an{' '}
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
      <p>
        <button
          className="button-link"
          onClick={() => void handleReloadAll()}
          disabled={reloadBusy}
        >
          ↻ Reload all vocabularies
        </button>{' '}
        <span className="populate-feedback">{reloadFeedback}</span>
      </p>
    </div>
  )
}
