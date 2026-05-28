import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Provider } from 'react-redux'
import './index.css'
import AppHeader from './components/AppHeader'
import AppSubHeader from './components/AppSubHeader'
import HomePage from './pages/HomePage'
import BrowserPage from './pages/BrowserPage'
import SettingsPage from './pages/SettingsPage'
import store from './ducks/store'
import { useAppDispatch } from './ducks/hooks'
import { loadLanguagesFromSpreadsheet } from './ducks/languages-loader'
import { setLanguages, setLanguagesLoading } from './ducks/languages'
import { setLocalities, setLocalitiesLoading } from './ducks/localities'
import { loadLocalitiesFromSpreadsheet } from './ducks/localities-loader'
import { setLoading, setPeople } from './ducks/people'
import { loadPeopleFromSpreadsheet } from './ducks/people-loader'
import { setPlaces, setPlacesLoading } from './ducks/places'
import { loadPlacesFromSpreadsheet } from './ducks/places-loader'
import { setTagVocabularies, setTagsError, setTagsLoading } from './ducks/tags'
import { loadTagVocabulariesFromFolder } from './ducks/tags-loader'

let hasBootstrappedLanguages = false
let hasBootstrappedLocalities = false
let hasBootstrappedPeople = false
let hasBootstrappedPlaces = false
let hasBootstrappedTags = false

function LanguagesBootstrap() {
  const dispatch = useAppDispatch()

  React.useEffect(() => {
    if (hasBootstrappedLanguages) return
    hasBootstrappedLanguages = true

    const run = async () => {
      dispatch(setLanguagesLoading(true))
      try {
        const languages = await loadLanguagesFromSpreadsheet()
        dispatch(setLanguages(languages))
      } finally {
        dispatch(setLanguagesLoading(false))
      }
    }

    void run()
  }, [dispatch])

  return null
}

function PeopleBootstrap() {
  const dispatch = useAppDispatch()

  React.useEffect(() => {
    if (hasBootstrappedPeople) return
    hasBootstrappedPeople = true

    const run = async () => {
      dispatch(setLoading(true))
      try {
        const people = await loadPeopleFromSpreadsheet()
        dispatch(setPeople(people))
      } finally {
        dispatch(setLoading(false))
      }
    }

    void run()
  }, [dispatch])

  return null
}

function LocalitiesBootstrap() {
  const dispatch = useAppDispatch()

  React.useEffect(() => {
    if (hasBootstrappedLocalities) return
    hasBootstrappedLocalities = true

    const run = async () => {
      dispatch(setLocalitiesLoading(true))
      try {
        const localities = await loadLocalitiesFromSpreadsheet()
        dispatch(setLocalities(localities))
      } finally {
        dispatch(setLocalitiesLoading(false))
      }
    }

    void run()
  }, [dispatch])

  return null
}

function PlacesBootstrap() {
  const dispatch = useAppDispatch()

  React.useEffect(() => {
    if (hasBootstrappedPlaces) return
    hasBootstrappedPlaces = true

    const run = async () => {
      dispatch(setPlacesLoading(true))
      try {
        const places = await loadPlacesFromSpreadsheet()
        dispatch(setPlaces(places))
      } finally {
        dispatch(setPlacesLoading(false))
      }
    }

    void run()
  }, [dispatch])

  return null
}

function TagsBootstrap() {
  const dispatch = useAppDispatch()

  React.useEffect(() => {
    if (hasBootstrappedTags) return
    hasBootstrappedTags = true

    const run = async () => {
      dispatch(setTagsLoading(true))
      dispatch(setTagsError(null))
      try {
        const vocabularies = await loadTagVocabulariesFromFolder()
        dispatch(setTagVocabularies(vocabularies))
      } catch (error) {
        dispatch(
          setTagsError(
            error instanceof Error
              ? error.message
              : 'Failed to load tag vocabularies',
          ),
        )
      } finally {
        dispatch(setTagsLoading(false))
      }
    }

    void run()
  }, [dispatch])

  return null
}

function Layout() {
  return (
    <div className="app-layout">
      <AppHeader />
      <AppSubHeader />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <LanguagesBootstrap />
      <LocalitiesBootstrap />
      <PeopleBootstrap />
      <PlacesBootstrap />
      <TagsBootstrap />
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/browser" element={<BrowserPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </Provider>
  </React.StrictMode>,
)

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
)
