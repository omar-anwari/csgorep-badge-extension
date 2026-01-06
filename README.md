# CSGORep Badge Extension

Simple browser extension that adds a CSGORep badge to Steam profile pages. It pulls profile + rep info from the CSGORep API and shows it in a hover popup next to the Steam name.

## Features

- badge icon next to the Steam name
- hover popup with rep stats, total reviews, and ban/staff tag
- works in Firefox + Chrome

## Todo
- [ x ] Make it work with manifest v3

## Build / Install (dev)

1. Clone the repo
   ```
   git clone https://github.com/yourusername/csgorep-badge-extension.git
   ```
2. Go to the folder
   ```
   cd csgorep-badge-extension
   ```
3. Build the target you want
   - Chrome (MV3): `npm run build:chrome` -> load `dist/chrome`
   - Firefox (MV2): `npm run build:firefox` -> load `dist/firefox`

## Publishing

- Chrome zip: `npm run pack:chrome` -> `dist/csgorep-badge-chrome.zip` (upload to Chrome Web Store)
- Firefox xpi: `npm run pack:firefox` -> `dist/csgorep-badge-firefox.xpi` (needs AMO signing for permanent install)
- Both: `npm run pack`

## Usage

- open any Steam profile page
- hover the CSGORep icon next to the name

## Files

- `src/manifest.json` (Firefox MV2)
- `src/manifest.chrome.json` (Chrome MV3)
- `src/content/steam-profile.js`
- `src/background/background.js`
- `src/styles/badge.css`
- `src/utils/helpers.js`

## License

MIT
