# Flower Wand Garden — Starter

A webcam app that tracks your hand and grows/scatters flowers, like the
video you recorded. Built with React + Vite + MediaPipe Hand Landmarker
(Google's free, on-device hand tracking — no API key, no server needed).

## Run it locally

You need [Node.js](https://nodejs.org) installed (18+). Then:

```bash
cd flower-wand
npm install
npm run dev
```

Open the printed `localhost` URL, allow camera access, and:
- **Point your index finger** → plants a flower at your fingertip
- **Open your palm** → scatters nearby flowers outward

## How it works (the short version)

1. **`@mediapipe/tasks-vision`** reads your webcam and returns 21 hand
   keypoints per hand, every frame — all in the browser.
2. Simple geometry checks in `isPointing()` and `isOpenPalm()` in
   `src/App.jsx` turn those keypoints into gestures.
3. A tiny in-memory "particle system" (the `flowersRef` array) spawns,
   moves, ages, and fades flower emoji on a `<canvas>` overlaid on the
   video.

## Making it your own

- **Swap emoji for real flower images**: replace `ctx.fillText(f.emoji, ...)`
  with `ctx.drawImage(someLoadedImage, ...)` — preload a few flower PNGs
  with transparent backgrounds.
- **Tune gesture sensitivity**: adjust the thresholds in `isPointing()`
  (the `1.3` / `0.85` multipliers) and `isOpenPalm()` (the `0.28` value)
  to match your hand size/distance from camera.
- **Add a flower "crown" like in your video**: instead of spawning at the
  fingertip only, also spawn a ring of flowers around `landmarks[?]` near
  the head — you'd need face tracking too (MediaPipe has a
  `FaceLandmarker` for that, same pattern).
- **Deploy it**: push to GitHub, connect the repo at
  [vercel.com](https://vercel.com), and it deploys automatically — same
  as the `flower-wand-garden.vercel.app` app you recorded.

## About "which AI platform"

There isn't a special "AI app builder" behind apps like this — it's
regular React code. The AI part is just using an assistant like Claude
(claude.ai, or Claude Code if you want it working directly in your local
project folder) to help you write and debug that code faster. This
starter is meant as your base — describe a change you want, and Claude
can edit these files directly with you.
