/**
 * Generates the app download page for the help site.
 *
 * Reads the app version and product name from package.json (the single source
 * of truth) and injects the matching GitHub release download links into
 * help-site/download.html.
 *
 * Output (relative to the help-site out/ directory):
 *   download/index.html   (from help-site/download.html with links filled in)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// GitHub repository that hosts the release assets.
const RELEASES_BASE =
  'https://github.com/BKRLCC/archive-uploader/releases/download'

interface AppPackageInfo {
  productName: string
  version: string
}

function readAppPackageInfo(helpDir: string): AppPackageInfo {
  const pkgPath = join(helpDir, '..', 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    productName?: string
    version?: string
  }
  if (!pkg.productName || !pkg.version) {
    throw new Error(
      'package.json is missing productName or version — cannot build download links.',
    )
  }
  return { productName: pkg.productName, version: pkg.version }
}

/**
 * Builds the download page into the given help-site out/ directory.
 * `helpDir` is the help-site source directory (where download.html lives).
 */
export function buildDownload(outDir: string, helpDir: string): void {
  const { productName, version } = readAppPackageInfo(helpDir)

  const tag = `v${version}`
  const macUrl = `${RELEASES_BASE}/${tag}/${productName}-darwin-arm64-${version}.zip`
  const winUrl = `${RELEASES_BASE}/${tag}/${productName}-${version}.Setup.exe`

  const replacements: Record<string, string> = {
    '<!--APP_VERSION-->': version,
    '<!--MAC_URL-->': macUrl,
    '<!--WIN_URL-->': winUrl,
  }

  let html = readFileSync(join(helpDir, 'download.html'), 'utf8')
  for (const [token, value] of Object.entries(replacements)) {
    if (!html.includes(token)) {
      throw new Error(
        `download.html is missing the ${token} placeholder — cannot build the download page.`,
      )
    }
    html = html.split(token).join(value)
  }

  const downloadDir = join(outDir, 'download')
  mkdirSync(downloadDir, { recursive: true })
  writeFileSync(join(downloadDir, 'index.html'), html, 'utf8')

  console.log(
    `Download page built: ${tag} -> ${join(downloadDir, 'index.html')}`,
  )
}
