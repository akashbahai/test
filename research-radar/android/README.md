# Research Radar for Android

Native Java Android shell with locally packaged HTML/JS/CSS and AndroidX WebViewAssetLoader. The interface, world geometry and seed catalogue work offline. Online catalogue updates use the existing public GitHub JSON and its daily review task. No Vercel session is needed. This app has no background notifications.

## Build

Install JDK 17, Gradle 8.13 and Android SDK platform 36/build tools 36.0.0. Open this directory in Android Studio or run `./gradlew assembleDebug bundleRelease lintRelease` here. Set `ANDROID_HOME` to your SDK or create an untracked local.properties with sdk.dir. Web assets are copied from the parent dashboard by `syncRadarAssets` at build time, so edits do not require maintaining duplicate files.

For signed releases set environment variables `RADAR_KEYSTORE` (absolute keystore path) and `RADAR_KEY_PASSWORD`. The key alias is `radar-upload`. Never commit keystores or passwords. Without these variables release output is unsigned; debug APK uses a development key. Increment versionCode for every store update.

Outputs: `app/build/outputs/apk/` and `app/build/outputs/bundle/`.

## Security and behavior

Only bundled code is loaded in the WebView over the appassets HTTPS origin. File/content access and cleartext traffic are disabled; CSP blocks frames and remote scripts. Only the catalogue’s allowlisted GitHub URL can be fetched. External organizer links open in the system browser. A narrow JavaScript bridge exports only the two supported CSV/calendar files through Android’s document picker; no storage or calendar permission is requested. App backup is disabled; shortlist/cache stay in WebView local storage.

Store listing and owner-dependent publication steps are in `store/`. Privacy policy is `../privacy.html`. No Play Store publication is claimed until a confirmed store release exists.

## Validation

Run `npm test` in the dashboard root for catalogue/date/map logic. Run `npm install && npm test` in `android/tests` for the native export bridge integration harness (Node 22+). Android lint and release compilation are build gates. Physical-device testing and real device screenshots remain required before Play submission.
