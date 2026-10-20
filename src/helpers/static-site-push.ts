// Force-pushes the freshly built <root>/.static-site/ tree to the deploy repo as
// a single fresh commit. The deployed site is a disposable, latest-wins
// projection, so each publish re-initialises git and overwrites remote history
// rather than keeping versions. Netlify (git-connected) runs Bowerbird in CI over
// the pushed data/ via the scaffolded netlify.toml.
import fs from 'node:fs'
import path from 'node:path'
import { writeFile, rm } from 'node:fs/promises'

import { add, commit, init, listFiles, push } from 'isomorphic-git'
import http from 'isomorphic-git/http/node'

const NETLIFY_TOML = `[build]
  command = "curl -fsSL https://github.com/crate-works/bowerbird/releases/latest/download/install.sh | bash"
  publish = "."

[build.environment]
  NODE_VERSION = "20"
`

export type StaticSitePushInput = {
  outputDir: string
  repoUrl: string
  branch: string
  token: string
  authorName: string
  authorEmail: string
  // When set, POSTed after a successful push to trigger a trusted Netlify
  // deploy (exempt from the Deploy Request Policy, so no approval prompt).
  buildHookUrl?: string
}

export type StaticSitePushResult = {
  commitOid: string
  branch: string
  repoUrl: string
  filesPushed: number
  buildHookTriggered: boolean
}

export async function pushStaticSite(
  input: StaticSitePushInput,
): Promise<StaticSitePushResult> {
  const { outputDir, repoUrl, branch, token, authorName, authorEmail } = input
  const buildHookUrl = input.buildHookUrl?.trim() ?? ''
  const dir = outputDir

  // Discard any prior git state so every push is a clean single commit.
  await rm(path.join(dir, '.git'), { recursive: true, force: true })
  await init({ fs, dir, defaultBranch: branch })

  const netlifyPath = path.join(dir, 'netlify.toml')
  if (!fs.existsSync(netlifyPath)) {
    await writeFile(netlifyPath, NETLIFY_TOML)
  }

  await add({ fs, dir, filepath: '.' })
  const commitOid = await commit({
    fs,
    dir,
    message: 'Publish static site',
    author: { name: authorName, email: authorEmail },
  })
  const filesPushed = (await listFiles({ fs, dir, ref: 'HEAD' })).length

  await push({
    fs,
    http,
    dir,
    url: repoUrl,
    ref: branch,
    remoteRef: branch,
    force: true,
    onAuth: () => ({ username: 'x-access-token', password: token }),
  })

  let buildHookTriggered = false
  if (buildHookUrl) {
    const res = await fetch(buildHookUrl, { method: 'POST' })
    if (!res.ok) {
      throw new Error(
        `Pushed successfully, but the Netlify build hook returned ${res.status}. The deploy was not triggered — check the build hook URL in Settings.`,
      )
    }
    buildHookTriggered = true
  }

  return { commitOid, branch, repoUrl, filesPushed, buildHookTriggered }
}
