# ZuzuMusic / Neon database synchronization

Status: **schema deployed to Neon, application cutover pending**.

- Neon project: **Zuzify App Data** (`young-truth-44623930`)
- Branch: `main`
- Database: `zuzumusic`
- Applied schema from repository `database/schema.sql`: `zm_users`, `zm_tracks`, plus supporting indexes.
- The API already queries Neon via `@neondatabase/serverless` in `src/lib/db.ts` and reads its connection from the **server-only** `DATABASE_URL`.
- This branch extends `GET /api/health` with an actual `SELECT 1` probe. It returns `503` on missing/unavailable database instead of incorrectly reporting healthy.

## Required to complete

1. Open Neon project `young-truth-44623930`, database `zuzumusic`, and copy the PostgreSQL connection string into `DATABASE_URL` on the **server** (for a Vercel deployment, environment variables under that project). Do not commit credentials to GitHub or send them to browsers.
2. Verify local `GET /api/health` returns `{"database":"connected"}`; then test signup, sign-in, track upload and browse in staging.
3. Neon account identity in ZuzuMusic is *not* the same thing as the central Zuzify account in `rough-queen-59692102`. Integrate an explicit OAuth authorization-code flow and verified account linking before claiming single sign-on.
4. Do not reuse or change existing users' credentials without a verified ownership-migration flow. This alpha's database is new; no prior production data has been moved here.
5. For audio objects, retain private Cloudflare R2 storage with proper signed URLs and ownership checks. Neon PostgreSQL does not automatically migrate or store the audio files.

No production deployment or Vercel credential configuration was performed by this PR.
