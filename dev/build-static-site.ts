// Dev-only CLI to generate the Bowerbird-ready .static-site/ tree from an archive
// folder, so you can run Bowerbird locally and confirm the repo shape works.
//
// Usage (from the repo root):
//   npx esbuild dev/build-static-site.ts --bundle --platform=node --format=cjs \
//     --outfile=.build-static-site.cjs --external:sharp \
//   && node .build-static-site.cjs <archive-folder> [collectionId] \
//   && rm -f .build-static-site.cjs
//
// Then point Bowerbird at <archive-folder>/.static-site/data and open the site.
import path from 'node:path'
import { readFile } from 'node:fs/promises'

import { exportStaticSite } from '../src/helpers/static-site-export'
import type { Crate } from '../src/helpers/publication-view'

async function main(): Promise<void> {
  const [, , rootArg, collectionArg] = process.argv
  if (!rootArg) {
    console.error('Usage: build-static-site <archive-folder> [collectionId]')
    process.exit(1)
  }

  const rootFolder = path.resolve(rootArg)
  const raw = await readFile(
    path.join(rootFolder, 'ro-crate-metadata.json'),
    'utf8',
  )
  const crate = JSON.parse(raw) as Crate
  const collectionId = collectionArg ?? path.basename(rootFolder)

  const result = await exportStaticSite({ crate, rootFolder, collectionId })

  console.log(`Static site built at: ${result.outputDir}`)
  console.log(`  data dir:   ${result.dataDir}`)
  console.log(`  crate:      ${result.cratePath}`)
  console.log(`  images:     ${result.imagesWritten}`)
  console.log(`  non-images: ${result.nonImageCount} (metadata only)`)
  if (result.failures.length) {
    console.log('  failures:')
    for (const failure of result.failures) {
      console.log(`    - ${failure.path}: ${failure.error}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
