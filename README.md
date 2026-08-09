# art4evaminimal

Simple BBC Mode 2 finger-paint app (160×256 logical, 2:1 wide pixels) with dither palette, transparency, fill, undo, save/load, and 1-minute autosave.

## Run in browser

```bash
npm install
npm run serve
```

Open http://localhost:5173 — or on a phone on the same Wi‑Fi, use your Mac’s IP and port 5173, then **Add to Home screen**.

## Layout (phone portrait)

- **Top half:** Mode 2 canvas  
- **Bottom half:** 8 brush sizes → dither palette → ink strip → SAVE / LOAD / AUTO / TRANS / FILL / CLS / UNDO

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
