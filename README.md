# CSGORep Badge Extension

Simple browser extension that adds a CSGORep badge to Steam profile pages. It pulls profile + rep info from the CSGORep API and shows it in a hover popup next to the Steam name.

## Features

- badge icon next to the Steam name
- hover popup with rep stats, total reviews, and ban/staff tag
- works in Firefox + Chrome

## Install (dev)

1. Clone the repo
   ```
   git clone https://github.com/yourusername/csgorep-badge-extension.git
   ```
2. Go to the folder
   ```
   cd csgorep-badge-extension
   ```
3. Load the `src` folder as an unpacked extension
   - Chrome: `chrome://extensions/` → enable Developer mode → Load unpacked
   - Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on

## Usage

- open any Steam profile page
- hover the CSGORep icon next to the name

## Files

- `src/manifest.json`
- `src/content/steam-profile.js`
- `src/background/background.js`
- `src/styles/badge.css`
- `src/utils/helpers.js`

## License

MIT
