# Native builds (Windows EXE + iPhone IPA)

GitHub Actions compiles the same local-player React UI into two native shells:

* Windows (Tauri v2 / Rust / WebView2): ZuzuMusic.exe and ZuzuMusic-Setup.exe
* iPhone (Capacitor 8 / WKWebView): ZuzuMusic-unsigned.ipa

IMPORTANT: The iOS IPA is unsigned. It cannot be installed directly without a valid Apple developer signature. A free personal Apple ID may be usable for personal testing with compatible signing tools. The unsigned Windows binaries may show Windows SmartScreen warnings because they are not code-signed.

Native previews work as local music players, but creator account/login/upload APIs require a separately hosted Next.js backend. They are not silently replaced with fake login or unauthorized Spotify integration.

## Build automation

Open the GitHub Actions tab and choose "Native Windows and iPhone builds", or get the EXE and IPA from the newest successful pre-release on the GitHub Releases page.

This workflow runs on Windows and macOS GitHub-hosted runners. You do not need to own a Mac for CI to generate an unsigned IPA.

The iPhone preview is not App Store ready. To ship it to the App Store, you must use approved signing/distribution and comply with eligibility and age requirements.

## Windows local build

Install Windows 11, Rust, Node.js 24, Microsoft C++ build tools and Windows WebView2. Run:

    npm install
    npx tauri icon assets/icon.svg
    npx tauri build --bundles nsis

Output: src-tauri/target/release/zuzumusic.exe and the setup executable in src-tauri/target/release/bundle/nsis/.

## iOS build on macOS

Install Node.js 24 and Xcode 26+.

    npm install
    npm run build:native
    npx cap add ios --packagemanager SPM
    npx cap sync ios

Open ios/App/App.xcodeproj to configure signing for a physical device. For CI, the workflow builds an unsigned device App.app and zips it as an unsigned IPA.

## Platform architecture

* Local music player uses IndexedDB for imported local files (stored on the device).
* Cloud music service is separately hosted on Next.js + Neon + R2. Cloud credentials are never bundled in app binaries.
* Both native preview apps currently lack cloud sync, account recovery and system-wide audio integration.
