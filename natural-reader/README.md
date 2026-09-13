# Natural Reader MVP

A mobile-first PWA for listening to your own PDF and DOCX documents.

## Features
- PDF and DOCX import
- Local IndexedDB document library
- Rename/delete
- Browser/device speech synthesis
- Voice selection and speed control
- Paragraph highlighting and auto-scroll
- Tap a paragraph to start reading there
- Approximate ±15 second seek
- Resume reading
- Sleep timer
- PWA manifest and service worker

## Run locally
Because browsers restrict modules/service workers on `file://`, serve the folder over HTTP.

Example:

```bash
python3 -m http.server 8080
```

Then open:
http://localhost:8080

For iPhone installation, deploy the folder to an HTTPS host (GitHub Pages, Vercel, Netlify, etc.), open it in Safari, then use Share → Add to Home Screen.

## Important limitation
The first version intentionally uses the device/browser SpeechSynthesis API. Voice quality therefore depends on the voices available on the device. iOS may pause or stop web speech when the screen locks or Safari/PWA is backgrounded. The app saves the current paragraph and an approximate offset so playback can resume.

PDF.js and Mammoth.js are loaded from jsDelivr on first use. After they have been fetched and cached by the browser/service worker, repeat use may work offline depending on the browser's cache policy.
