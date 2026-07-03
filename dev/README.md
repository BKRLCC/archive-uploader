## Publish a new release

1. Bump the version and commit the tag:

   ```
   npm version patch
   ```

2. Push the version commit and tag to origin:
   ```
   git push && git push --tags
   ```

## For local build

Build and publish to GitHub Releases (runs locally, not via CI):

```
export $(cat .env | xargs) && npm run publish
```
