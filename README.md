# MS Club Opening Day 2026 – Photo Booth

Photo booth web app for **MS Club Opening Day 2026**, Rajarata University of Sri Lanka.

> Frame Your Vibe. Share Your Pride. Win a Surprise.

## Features
- Take a selfie straight from the browser (front/back camera, 3s timer)
- Upload from gallery if the camera isn't available
- Auto-framed 1080×1350 image in MS Club colours
- Download or share directly to WhatsApp, LinkedIn, Facebook
- Links to follow MS Club

## Run locally
```bash
npx serve .
```
Then open http://localhost:3000 (camera works on localhost or HTTPS).

## Deploy
Static site – import the repo into [Vercel](https://vercel.com), no build step needed.

## Customise
Frame colours are in the `FRAME` object at the top of `app.js`.
Put the club logo at `assets/logo.png` to show it in the site header.
