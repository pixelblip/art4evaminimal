# art4evaminimal

Simple BBC Mode 2 finger-paint app (160×256 logical, 2:1 wide pixels) with dither palette, transparency, fill, graffiti drips, undo, save/load, 1-minute autosave, and **Pixelblip Gallery** uploads.

## Run in browser

```bash
npm install
npm run serve
```

Open http://localhost:5173 — or on a phone on the same Wi‑Fi, use your Mac’s IP and port 5173, then **Add to Home screen**.

## Layout (phone portrait)

- **Top half:** Mode 2 canvas  
- **Bottom half:** brushes → dither palette → paint tools → file tools  

**Paint row:** TRANS / FILL / **GRAF** (drip mode) / CLS  
**File row:** SAVE / FIN / PUB / … / **UNDO** (bottom-right)  
Solid colours = leftmost/rightmost cells in each palette row (ink strip removed).  
**Top palette row** = black density dither (real pattern preview; **dense left → light right**).  
**Palette dither cell** → brush paints that dither. **Solid cell** → solid colour.  
**GRAF** toggles graffiti drips (same shade/dither as the brush).  
**FIN** saves PNG + play sequence locally.  
**PUB** publishes via the Mac server (`npm run serve` uses your `gh` login) to [Pixelblip Gallery](https://pixelblip.github.io/pixelblip-gallery/). No browser token needed when using that server. Wait ~30s after PUB, then open **GAL** and refresh.  
**KEY** is only needed if you publish without the Mac server (browser token).  
**GAL** opens the gallery.  
**PLAY** replays the last FIN.  
**SAVE** writes a timestamped PNG to `Documents/Paint`.  
**EMAIL** opens a mail draft to `blippyxpixel@gmail.com` with the PNG.

## Pixelblip Gallery (separate repo)

The shareable gallery lives in `pixelblip-gallery/` (GitHub Pages). Soft-delete goes to Trash until you Empty trash.

```bash
cd pixelblip-gallery
git init -b main
git add .
git commit -m "Initial Pixelblip Gallery"
gh auth refresh -h github.com   # if needed
gh repo create pixelblip/pixelblip-gallery --public --source=. --remote=origin --push
```

Then enable **Settings → Pages → Deploy from branch `main` / /(root)**.

Share: https://pixelblip.github.io/pixelblip-gallery/

## Build an APK

```bash
npm install
npx cap sync android
```

Then open the `android` project in Android Studio and **Build → Build APK(s)**, or from a machine with the Android SDK:

```bash
cd android && ./gradlew assembleDebug
```

Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk`
