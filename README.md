# Archivist

👋 Hello!
Archivist is your archive manager.

Here you can:

- Browse the items in your archive folder
- Add metadata to these items
- Upload these items to a web archive for easy browsing (Coming soon!)

### How it works

All your metadata is kept in Excel files called `metadata.xlsx`. In the Archivist app, you will see these files called "⭐ Metadata". You can make an `⭐ Metadata` file in any folder by clicking the `🌟 Create metadata` file button. When it comes to upload time, the app will read and combine all of these archive files.

There are a few special types of data. Each of these has its own folder in the root of your archive.

- 👥 People
- 🗺️ Places
- 📜 Licenses

## Map picker setup

The Geometry editor supports picking coordinates on a map. To enable it, set a Mapbox public token before launching the app.

Local development (recommended):

1. Create a `.env.local` file in the project root.
2. Add one of these variables:
	- `MAPBOX_ACCESS_TOKEN=...`
	- `VITE_MAPBOX_ACCESS_TOKEN=...`
	- `MAPBOX_TOKEN=...`
3. Restart the Electron dev process.

If no token is configured, the map picker shows a warning and manual latitude/longitude entry still works.
