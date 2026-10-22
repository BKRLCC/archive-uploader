import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UiIcons } from '../config/icons'
import logo from '../icons/logo.png'

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  // Non-null while a publish pipeline runs; holds the current phase label.
  const [publishStatus, setPublishStatus] = React.useState<string | null>(null)
  const publishingRef = React.useRef(false)

  React.useEffect(() => {
    return window.api.onPublishProgress(({ current, total }) => {
      if (publishingRef.current) {
        setPublishStatus(`Compressing images… (${current}/${total})`)
      }
    })
  }, [])

  async function handlePublish() {
    const rootFolder = await window.api.getRootFolder()
    if (!rootFolder) {
      window.alert('Set an archive root folder before publishing.')
      return
    }
    const settings = await window.api.getPublishSettings()
    if (!settings.archiveId) {
      window.alert(
        'Set an Archive ID in Settings → Publishing before publishing.',
      )
      return
    }
    if (
      !window.confirm(
        'Publish this archive? This refreshes the Files tab in every collection, ' +
          'builds the RO-Crate, then compresses images into the hidden .publish folder.',
      )
    ) {
      return
    }
    publishingRef.current = true
    try {
      // Upload must run first: it writes ro-crate-metadata.json, which the
      // publish step reads to build .publish.
      let crateSummary: string
      try {
        setPublishStatus('Refreshing collections…')
        await window.api.reconcileFilesTabs(rootFolder)
        setPublishStatus('Building the RO-Crate…')
        const { fileCount, entityCount, warningCount } =
          await window.api.uploadArchive(rootFolder)
        crateSummary =
          `Built the RO-Crate from ${fileCount} workbook${fileCount === 1 ? '' : 's'} → ` +
          `${entityCount} entit${entityCount === 1 ? 'y' : 'ies'}, ` +
          `${warningCount} warning${warningCount === 1 ? '' : 's'}.`
      } catch (err) {
        window.alert(`Build failed: ${(err as Error).message}`)
        return
      }
      try {
        setPublishStatus('Compressing images…')
        const result = await window.api.buildPublishDerivatives(
          rootFolder,
          settings.archiveId,
        )
        const t = result.plan.totals
        let msg =
          `${crateSummary}\n\n` +
          `Wrote ${result.derivativesWritten} derivative${
            result.derivativesWritten === 1 ? '' : 's'
          } to .publish/derivatives/ ` +
          `(${t.imagesAdded} new, ${t.imagesChanged} changed, ${t.imagesUnchanged} unchanged, ` +
          `${t.nonImageCount} non-image metadata-only).\n` +
          'Wrote the public crate to .publish/ro-crate-metadata.json.'
        if (result.failures.length) {
          const names = result.failures
            .slice(0, 5)
            .map((f) => f.path)
            .join(', ')
          msg += `\n\n${result.failures.length} failed: ${names}${
            result.failures.length > 5 ? '…' : ''
          }`
        }
        msg += result.hasDepositUrl
          ? '\n\n⚠️ Uploading is not wired up yet. .publish is ready to deposit, but nothing was sent to the server.'
          : '\n\n⚠️ No deposit URL set in Settings → Publishing. Images were compressed locally but nothing was uploaded.'
        window.alert(msg)
      } catch (err) {
        window.alert(`Publish failed: ${(err as Error).message}`)
      }
    } finally {
      publishingRef.current = false
      setPublishStatus(null)
    }
  }

  async function handleStaticPublish() {
    const rootFolder = await window.api.getRootFolder()
    if (!rootFolder) {
      window.alert('Set an archive root folder before publishing.')
      return
    }
    if (
      !window.confirm(
        'Build the static site? This refreshes the Files tab in every collection, ' +
          'rebuilds the RO-Crate from the spreadsheets, wipes and rebuilds the ' +
          '.static-site folder with compressed images, then (if a deploy repo is ' +
          'configured) pushes it live.',
      )
    ) {
      return
    }
    publishingRef.current = true
    try {
      let crateSummary: string
      try {
        setPublishStatus('Refreshing collections…')
        await window.api.reconcileFilesTabs(rootFolder)
        setPublishStatus('Building the RO-Crate…')
        const { fileCount, entityCount, warningCount } =
          await window.api.uploadArchive(rootFolder)
        crateSummary =
          `Built the RO-Crate from ${fileCount} workbook${fileCount === 1 ? '' : 's'} → ` +
          `${entityCount} entit${entityCount === 1 ? 'y' : 'ies'}, ` +
          `${warningCount} warning${warningCount === 1 ? '' : 's'}.`
      } catch (err) {
        window.alert(`Build failed: ${(err as Error).message}`)
        return
      }
      try {
        setPublishStatus('Compressing images…')
        const result = await window.api.buildStaticSite(rootFolder)
        let msg =
          `${crateSummary}\n\n` +
          `Wrote ${result.imagesWritten} image${
            result.imagesWritten === 1 ? '' : 's'
          } ` +
          `(${result.nonImageCount} non-image metadata-only) to the static site.\n` +
          `Data folder: ${result.dataDir}`
        if (result.failures.length) {
          const names = result.failures
            .slice(0, 5)
            .map((f) => f.path)
            .join(', ')
          msg += `\n\n${result.failures.length} failed: ${names}${
            result.failures.length > 5 ? '…' : ''
          }`
        }
        const { repoUrl, hasToken } = await window.api.getStaticSiteSettings()
        if (repoUrl && hasToken) {
          try {
            setPublishStatus('Pushing to deploy repo…')
            const push = await window.api.pushStaticSite(rootFolder)
            msg +=
              `\n\nPushed ${push.filesPushed} file${
                push.filesPushed === 1 ? '' : 's'
              } to ${push.repoUrl} (${push.branch}). ` +
              'Netlify will rebuild the site shortly.'
          } catch (pushErr) {
            msg += `\n\nBuilt locally, but the push failed: ${
              (pushErr as Error).message
            }`
          }
        } else {
          msg +=
            '\n\nBuilt locally only. Add a deploy repo and token in ' +
            'Settings → Static site to publish.'
        }
        window.alert(msg)
      } catch (err) {
        window.alert(`Static site build failed: ${(err as Error).message}`)
      }
    } finally {
      publishingRef.current = false
      setPublishStatus(null)
    }
  }

  return (
    <>
      {publishStatus !== null && (
        <div className="publish-overlay">
          <div className="publish-overlay-box">
            <div className="publish-spinner" />
            <p className="publish-overlay-text">{publishStatus}</p>
          </div>
        </div>
      )}
      <header className="app-header">
        {/* HEADER LEFT (BACK BUTTON / LOGO) */}
        <div className="app-header-left">
          {!isHome && (
            <div className="app-header-back">
              <button className="back-btn" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
          )}
          <span className="app-header-title">
            <img src={logo} alt="" style={{ height: 28, width: 28 }} />
            Balachi
          </span>
        </div>
        {/* HEADER RIGHT (BUTTONS) */}
        <div className="app-header-nav no-drag">
          <button
            className="header-nav-btn"
            onClick={() => void handlePublish()}
            disabled={publishStatus !== null}
            title="Publish archive"
          >
            {UiIcons.publish}
          </button>
          <button
            className="header-nav-btn"
            onClick={() => void handleStaticPublish()}
            disabled={publishStatus !== null}
            title="Static publish (Bowerbird)"
          >
            {UiIcons.upload}
          </button>
          <button
            className="header-nav-btn"
            onClick={() => void window.api.reloadApp()}
            title="Refresh"
          >
            {UiIcons.refresh}
          </button>
          <button
            className="header-nav-btn"
            onClick={() => navigate('/')}
            title="Home"
          >
            {UiIcons.home}
          </button>
          <button
            className="header-nav-btn"
            onClick={() => navigate('/browser')}
            title="File Browser"
          >
            {UiIcons.fileBrowser}
          </button>
          <button
            className="header-nav-btn"
            onClick={() => navigate('/settings')}
            title="Settings"
          >
            {UiIcons.settings}
          </button>
        </div>
      </header>
    </>
  )
}
