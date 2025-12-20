# File Portal - Project Status

**Last Updated:** Dec 20, 2025

## Current Status
- ✅ Deployed (client on Vercel; storage via SFTP to IONOS `/files`)
- ✅ New MUI-based rich text processor integrated (old Tiptap not used)
- ✅ File ops, share links, serve endpoint, DOCX export all wired
- ✅ Share token passthrough for HTML assets fixed
- ✅ React error #185 (infinite re-render) in RichTextEditor fixed

## Completed (recent)
- Swapped processor to MUI RichTextEditor with companion integration.
- New documents open in processor; HTML treated as text-like.
- Share links with tokens (supports "never"); `/api/serve` honors bearer or share token; HTML previews rewrite relative assets.
- Styles API added (`/api/styles`, SFTP-backed `/files/styles`).
- SFTP auth fallback accepts `SFTP_USER/PASS` or `SFTP_USERNAME/PASSWORD`.
- **Fixed:** Share token now passed through in HTML asset rewrite (`fileController.ts`).
- **Fixed:** Share tokens now authorize access to assets in same directory as shared file.
- **Fixed:** Export route (`/api/export/docx`) now accepts share tokens (not just bearer tokens).
- **Fixed:** React error #185 in RichTextEditor - removed `onChange` from useEffect deps, using ref instead.
- **Fixed:** `handleProcessorChange` wrapped in `useCallback` to prevent unnecessary re-renders.
- **Fixed:** Styles endpoint moved to `client/api/styles.ts` for proper Vercel deployment.

## In Progress / To Verify
- Redeploy to Vercel to apply fixes (styles endpoint, share token passthrough).
- Companion "Saved styles" list depends on `/api/styles` 200.
- Optional: remove legacy Tiptap code/palette UI after confirming stability.

## Current Vercel Settings (file-portal project)
- Framework: Vite; build `npm install && npm run build`; output `dist`.
- Env (all environments):  
  - `SFTP_HOST=access-5017536512.webspace-host.com`  
  - `SFTP_PORT=22`  
  - `SFTP_USER` (or `SFTP_USERNAME`)  
  - `SFTP_PASS` (or `SFTP_PASSWORD`)  
  - `SFTP_BASE_PATH=/files`  
  - `JWT_SECRET=<secret>`  
  - `PASSWORD_HASH=<bcrypt>` (or `PASSWORD`)  
  - `VITE_API_URL=/api`  
  - `CORS_ORIGIN=https://files.mathewmoslow.com`

## Key Behaviors
- File ops over SFTP: list/read/create/update/delete/rename/upload/search.
- Serve: `/api/serve?path=...&token=...` rewrites relative `src/href` for HTML; accepts bearer or share token.
- Share: `/api/files/share` returns signed URL with optional `expiresIn: "never"`.
- Processor: MUI RichTextEditor (contentEditable) with formatting, lists, indent, colors, shapes, medical/sections, image placeholder, NIH search stub, save/print.
- Code editor: Monaco for non-processor flows.
- DOCX export: `/api/export/docx` (html-to-docx); PDF via print.
- Styles: `/api/styles` (SFTP `/files/styles`) once deployed.

## Repo Structure (live)
- `client/src/App.tsx`: main shell, view switching, file ops (uses `useCallback` for processor handlers).
- `client/src/processor/editor/RichTextEditor.tsx`: new processor editor (uses ref for onChange to prevent re-renders).
- `client/src/processor/companion/CompanionPanel.tsx`: companion UI using RichTextHandle.
- `client/src/processor/editor/EditorCanvas.tsx`: legacy Tiptap (not used).
- `client/api/styles.ts`: serverless styles endpoint (Vercel) - **moved from root `/api`**.
- `server/src/controllers/fileController.ts`: SFTP file ops, share, serve rewrite (with share token passthrough).
- `server/src/routes/files.ts`: file routes + share.
- `server/src/routes/export.ts`: DOCX export (now accepts share tokens).
- `server/src/index.ts`: express setup (serve auth handled inside controller).
- `server/src/utils/crypto.ts`: JWT + share token.
- `server/src/utils/sftp.ts`: SFTP helper with env fallback.

## Testing Checklist
- Login succeeds.
- New Document → opens processor with blank HTML; save persists to SFTP.
- Open existing HTML/TXT → opens processor; non-text/binary → Monaco.
- Share link created with “never” works when opened (token in URL).
- Preview (serve) loads HTML with images/assets via rewritten URLs.
- `/api/styles` returns 200; upload style appears in Saved styles (if endpoint deployed).
- DOCX export downloads without error; PDF via print shows only the page.

## Notes / Next Steps
- ✅ `api/styles.ts` moved to `client/api/styles.ts` - redeploy to Vercel to activate.
- Optional cleanup: remove Tiptap/old palette assets once stable.
- Consider public share toggle (skip auth) if needed for wider access.
- Server changes need to be redeployed (fileController.ts, export.ts). 
