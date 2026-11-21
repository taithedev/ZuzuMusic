# ZuzuMusic

Your sound. Your space. **Independent music player and creator platform.**

**Status: v0.1 alpha source — not a deployed public streaming service.**

This is a Next.js / React app using Neon Postgres (accounts and track metadata), Cloudflare R2 (private creator-audio objects), and IndexedDB (locally imported audio).

## Features implemented

- Responsive dark-mode player, queue, seek, volume, shuffle/repeat, playback speed and bass/treble audio filters.
- Import local MP3/WAV/FLAC/OGG/M4A with private IndexedDB storage.
- Local favorites and playlists.
- Username/password accounts (currently 13+ only) with signed HttpOnly cookies.
- Original track uploads using expiring R2 PUT URLs; drafts remain private and await admin approval.
- Approved creator catalog, expiring stream URLs, admin review page.
- Separate open-in-Spotify page only; no integrated Spotify playback or bypass.

## Run locally

1. Install Node.js 20.9 or later; run npm install.
2. Run npm run dev; open http://localhost:3000.
3. Local imports work without backend configuration.
4. To enable accounts and creator uploads, copy .env.example to .env.local and fill in your Neon Postgres database URL, 32+ character SESSION_SECRET and Cloudflare R2 credentials.
5. Execute database/schema.sql in the Neon SQL editor.
6. Create a PRIVATE R2 bucket with an R2 API token permitted to read/write objects. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in .env.local.
7. In your R2 bucket CORS settings, allow GET/PUT/HEAD from http://localhost:3000 (and your deployed HTTPS origin) and Content-Type request headers. Do not make the bucket public.
8. Sign up, visit /api/me to find your account UUID, set ADMIN_USER_IDS to that UUID, then restart the server.
9. Test sign in, upload, review, approval and playback before launch.

Example R2 CORS config:

    [
      {
        "AllowedOrigins": ["http://localhost:3000", "https://your-domain.example"],
        "AllowedMethods": ["GET", "PUT", "HEAD"],
        "AllowedHeaders": ["Content-Type"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 300
      }
    ]

Run npm run typecheck and npm run build to validate the project.

Deploy this repo to Vercel or another Next.js-compatible host with the same server environment variables; set HTTPS domain in R2 CORS. Never commit production secrets.

## Security and launch readiness

Only upload recordings you own or are explicitly licensed to distribute. Submissions are private until an authorized administrator approves them. Admin permissions are based on exact UUIDs in server configuration, not editable usernames.

This is an alpha, **not ready for unrestricted public signups**. Before public launch, implement abuse/IP rate limiting, account recovery, reporting and copyright takedowns, scans and review processes, object lifecycle cleanup, privacy policy and terms with real contacts, audit logging, accessibility testing and thorough review of age/guardian consent and applicable privacy laws. Creator payouts, synced lyrics, native Windows builds and public release infrastructure are not part of this initial version.

Spotify Developer Policy currently forbids combining its streams with other services, bypassing restrictions and replacing its core player experience without permission. ZuzuMusic therefore links out to Spotify instead of copying or playing its catalog. No Spotify API key is required. ZuzuMusic is not affiliated with Spotify.

Roadmap: docs/ROADMAP.md
