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
import { setLoading, setPeople } from './ducks/people'
import { loadPeopleFromSpreadsheet } from './ducks/people-loader'

let hasBootstrappedPeople = false

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
      <PeopleBootstrap />
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
