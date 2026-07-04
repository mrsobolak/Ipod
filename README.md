# iPod

An offline-first iPod Classic Progressive Web App, built by Sobolak Technologies. Use the click wheel to browse your library and play tracks — fully installable, fully offline, zero subscriptions.

**[▶ Try it live](https://mrsobolak.github.io/Ipod/)**

## Overview

This is a fully custom iPod Classic experience for the web: install it to your home screen and it behaves like a real device, with your own imported music living entirely on your phone.

| Module | Responsibility |
|---|---|
| `main.js` | Startup orchestration, DOM readiness |
| `components/IpodDesign.js` | iPod shell/component markup mount |
| `dom.js` | Centralized DOM cache initialization |
| `config.js` | Application state, menu structure, element cache |
| `ui.js` | Menu rendering, slide transitions, dynamic lists |
| `controls.js` | Click wheel input and button binding |
| `player.js` | Queue management, playback, shuffle, repeat |
| `musicdb.js` / `mediadb.js` | IndexedDB storage for songs, photos, and videos |
| `import.js` / `pcsync.js` | On-device music import and PC-to-phone transfer |
| `backup.js` | Export imported songs back out to the Files app |
| `media.js` | Photo/video import and lo-fi viewer |
| `clicksound.js` | Synthesized click-wheel tick sounds |
| `swupdate.js` | Native on-screen update notice |

## Features

- **Click Wheel Navigation**: Rotational input with dead zone detection and momentum.
- **Fully Offline**: Installable PWA, works with zero connectivity once your library is loaded.
- **Menu Hierarchy**: Browse by Artist, Album, or Song with slide transitions.
- **Now Playing**: Album art, marquee scrolling for long titles, live progress bar, and a repeat indicator.
- **Shuffle & Repeat**: Fisher-Yates shuffle with repeat one/all modes.
- **Music Import**: Import MP3s directly on-device, or receive them wirelessly from a PC over a local tunnel.
- **Photos & Videos**: Import and browse with an intentionally lo-fi click-wheel viewer.
- **Delete Individual Songs**: Manage your library one track at a time, not just a full wipe.
- **Album Art on Select**: Cover art thumbnail shown next to the highlighted song.
- **Click-Wheel Sounds**: Optional synthesized tactile clicks (off by default).
- **Backup to Files**: Save your imported library back out to your phone's Files app.
- **Native Update Notice**: On-screen confirmation when a new version is ready, instead of a silent background swap.

## Project Structure

```
├── index.html              # Entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline cache, auto-updater)
├── css/
│   ├── global.css          # Background, resets, and layout
│   ├── ipod.css            # Shell and button styling
│   ├── screen.css          # Status bar and battery
│   ├── menu.css            # Menu item styling
│   ├── now-playing.css     # Metadata and progress bar
│   ├── media.css           # Photo/video viewer styling
│   └── update-notice.css   # Update dialog styling
├── js/
│   ├── main.js
│   ├── dom.js
│   ├── config.js
│   ├── ui.js
│   ├── controls.js
│   ├── player.js
│   ├── musicdb.js
│   ├── mediadb.js
│   ├── import.js
│   ├── pcsync.js
│   ├── backup.js
│   ├── media.js
│   ├── clicksound.js
│   ├── swupdate.js
│   └── components/
│       └── IpodDesign.js   # iPod shell component
└── public/
    ├── icons/               # SVG + PWA icon assets
    └── textures/            # Case texture
```

## Running Locally

Serve the files using a local server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Open `http://localhost:8000`. A server is required for ES modules and service worker registration.

## Tech Stack

- **HTML/CSS/JS**: Vanilla implementation with zero build step.
- **ES Modules**: Native module system.
- **IndexedDB**: On-device storage for music, photos, and videos.
- **Service Worker**: Offline caching and native update flow.
- **Web Audio API**: Playback and synthesized UI sounds.

## Credits

Built by **Sobolak Technologies**.

## License

MIT — see [LICENSE](LICENSE).
