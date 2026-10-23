## Publish a new release

Releases are built by GitHub Actions. Pushing a version tag triggers native
builds for Apple Silicon, Intel macOS and Windows; the macOS builds are signed
and notarised, and every artifact is attached to a single GitHub release.

1. Bump the version and commit the tag:

   ```
   npm version patch
   ```

2. Push the version commit and tag to origin:
   ```
   git push && git push --tags
   ```

The `publish.yml` workflow then builds every platform and creates the release.

### Required repository secrets (macOS signing/notarisation + maps)

- `APPLE_CERTIFICATE` — Developer ID Application certificate exported as a
  `.p12`, base64-encoded
- `APPLE_CERTIFICATE_PASSWORD` — password for the `.p12`
- `APPLE_ID` — Apple ID email used for notarisation
- `APPLE_ID_PASSWORD` — app-specific password for that Apple ID
- `APPLE_TEAM_ID` — Apple Developer team ID
- `MAPBOX_ACCESS_TOKEN` — embedded in the build so the map picker works

Note: `macos-latest` builds Apple Silicon (arm64) and `macos-13` builds Intel
(x64). Windows is built unsigned for now (SmartScreen shows a "Run anyway"
prompt).

## For local build (fallback)

Build and publish to GitHub Releases from your machine (host architecture only):

```
export $(cat .env | xargs) && npm run publish
```
