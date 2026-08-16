<div align="center">

<img src="ascend-logo.png" alt="Sreenidhi Ascend" width="110" />

# College Club Attendance Logger

**A mobile-first attendance system that replaces the paper register — with GPS proximity verification, live session tracking, and automatic logging into Google Sheets.**

[**View the live app →**](https://ascend-attendance-logger.web.app/)

![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6%2B-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Hosting_%2B_Firestore-ffca28?style=flat-square&logo=firebase&logoColor=black)
![Apps Script](https://img.shields.io/badge/Google_Apps_Script-Backend-4285f4?style=flat-square&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-6b5b95?style=flat-square)

</div>

---

## Overview

Built for **Sreenidhi Ascend**, this is a single-page web app that members open on their phone when they enter the club room. It confirms they are physically present, records the check-in, tracks the session live, and writes a tidy per-day row into a Google Sheet the club leads can actually read.

No installs, no accounts, no app store — a URL and a browser.

## Features

| | |
|---|---|
| **GPS proximity check** | Haversine distance against the club room's centre point, with accuracy-aware tolerance so indoor fixes still work. |
| **Live session tracking** | Firestore holds open sessions; the UI shows a running countdown to the 3-hour auto-checkout. |
| **Auto-checkout sweep** | Sessions left open past the limit are closed and logged automatically. |
| **Retroactive check-out** | Forgot to check in? A modal captures the entry time and logs a complete session. |
| **Remembers you** | Name, branch, roll number, phone and role persist in `localStorage` — one tap after the first visit. |
| **Sheets as the database** | An Apps Script endpoint appends to a fresh, auto-formatted sheet per day. |
| **Soft Claymorphism UI** | Tactile dual-shadow surfaces, an animated dot-field background, and reactive border glow on every control. |

## Architecture

```
Browser (single page, no build step)
  │
  ├── verification.js ──► navigator.geolocation
  │                       Haversine distance vs. club centre
  │                       accuracy-aware pass/fail
  │
  ├── app.js ──┬──► Firestore  `active_sessions`
  │            │      open sessions + auto-checkout sweep
  │            │
  │            └──► Apps Script Web App  (POST)
  │                    └──► Code.gs ──► Google Sheets (one tab per day)
  │
  └── config.js  (git-ignored)  Firebase config · club coordinates · endpoint
```

**Why GPS and not Wi-Fi?** An earlier version checked the public IP address. On campus Wi-Fi every access point shares one public IP, so it confirmed "somewhere on campus" rather than "in the club room" — useless at room resolution. It was removed in favour of GPS alone.

## Project structure

| File | Role |
|---|---|
| `index.html` | Page structure, Firebase bootstrap, component wiring |
| `styles.css` | Claymorphism design system and brand palette |
| `app.js` | Session state, form handling, Firestore + Sheets dispatch, toasts, modals |
| `verification.js` | GPS presence verification engine |
| `dotfield.js` | Animated interactive dot-field background |
| `borderglow.js` | Cursor-reactive border glow for inputs and buttons |
| `Code.gs` | Google Apps Script backend (deploy into the Sheet's script editor) |
| `firestore.rules` | Firestore security rules |
| `config.example.js` | Configuration template — copy to `config.js` |
| `requirement.md` | Original technical requirements document |

## Setup

**1. Clone and configure**

```bash
git clone https://github.com/Zaraar21-cloud/College-Club-Attendance-Logger.git
cd College-Club-Attendance-Logger
cp config.example.js config.js
```

Open `config.js` and fill in:

- `firebase` — from Firebase Console → Project settings → Your apps → Web app
- `club.lat` / `club.lng` — right-click the centre of your club room in Google Maps and click the coordinates to copy them
- `club.radiusMeters` — how close a member must be (30 m is a sensible starting point)
- `appsScriptUrl` — filled in after step 3

`config.js` is git-ignored. Leave it that way.

**2. Set up the Google Sheet backend**

Create a Google Sheet, then **Extensions → Apps Script**, paste in `Code.gs`, and deploy it:

> Deploy → New deployment → **Web app** → Execute as **Me** → Who has access **Anyone**

Copy the resulting `/exec` URL into `appsScriptUrl` in `config.js`.

**3. Deploy Firestore rules and the site**

```bash
firebase login
firebase init            # Hosting + Firestore, existing project
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

Hosting serves the project root, so `config.js` ships with the deploy even though it is git-ignored.

**4. Run locally**

Any static server works — geolocation requires `https://` or `localhost`:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Security notes

This is worth stating plainly, because it is easy to get wrong:

**Everything in `config.js` is public once deployed.** It is a client-side app — the browser downloads the Firebase config and the club coordinates, so anyone can read them with DevTools. Keeping `config.js` out of the repository prevents the coordinates from being indexed and scraped, and keeps forks from inheriting this club's credentials. It is *not* access control.

What actually provides protection:

- **`firestore.rules`** — the only real boundary on the database. Deploy them; the default "test mode" rules leave the whole project world-writable.
- **API key restrictions** — in Google Cloud Console → Credentials, restrict the Firebase browser key by HTTP referrer to your hosting domain.
- **Accept that GPS is advisory.** Browser geolocation can be spoofed by any determined user with developer tools. This system raises the effort required to fake attendance; it does not make it impossible. Treat the log as a good-faith record, not an audit trail.

## License

MIT — see [LICENSE](LICENSE).
