# Google Play release handoff

Package: `com.akashbahai.researchradar`
Version: 1.0.0 (versionCode 1)
Minimum Android: 9 / API 28. Target: Android 16 / API 36.

This release has NOT been submitted to or approved by Google Play. The publishing browser was blocked by automatic approval review before account access could be verified. No developer account, payment, legal agreement or store declaration was submitted.

1. Sign into the owner’s Google Play Console and create the app. Confirm the package name is available. Complete developer identity/device verification if requested. Account registration fees and developer agreements are owner actions.
2. Use the signed AAB in the release package for an internal testing release. Enroll in Play App Signing, preferably letting Google manage the distribution key; retain the supplied private upload-key backup securely. The signed APK is for direct device testing. Play distribution may use a different signing certificate.
3. Test first launch, offline browsing, catalogue refresh, shortlist persistence after restart, filters, map gestures, external organizer links, privacy page, CSV/ICS save and Back behavior on a physical device. Run Play’s pre-launch report. Local compilation and lint are not a substitute for device testing.
4. Add listing.md, the 512px icon and 1024×500 feature graphic. Capture at least two real device screenshots after testing. Preview screenshots, if included, are browser-rendered references and must not be represented as device captures.
5. Provide the owner’s support email. The public policy document is https://github.com/akashbahai/test/blob/master/research-radar/privacy-policy.md . Confirm it loads without sign-in and use it as the policy URL; privacy.html is also bundled in the app. The existing Vercel dashboard has deployment protection; do not assume its privacy path is publicly accessible.
6. Complete content rating, target audience, ads, app access and Data safety declarations. No ads, login, purchases, analytics SDK or sensitive permissions are implemented. Shortlists remain local. Network requests to GitHub disclose ordinary connection metadata; verify the final Data safety answers against current Play definitions and the production app. The app is a conference tracker, not a medical advice or diagnosis product.
7. If Play identifies this as a new personal account subject to testing requirements, complete the required closed test (currently at least 12 opted-in testers continuously for 14 days) and apply for production access. Do not invent testers or claim that testing happened.
8. After testing and account requirements are complete, submit for review. Publication is subject to Google approval.

Official guidance:
- https://support.google.com/googleplay/android-developer/answer/9859152
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/9866151
- https://developer.android.com/google/play/requirements/target-sdk
