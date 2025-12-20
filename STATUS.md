# File Portal - Project Status

**Last Updated:** Dec 20, 2025

## Current Status
- ✅ Deployed (client on Vercel; storage via SFTP to IONOS `/files`)
- ✅ New MUI-based rich text processor integrated (old Tiptap not used)
- ✅ File ops, share links, serve endpoint, DOCX export all wired

## Completed (recent)
- Swapped processor to MUI RichTextEditor with companion integration.
- New documents open in processor; HTML treated as text-like.
- Share links with tokens (supports “never”); `/api/serve` honors bearer or share token; HTML previews rewrite relative assets.
- Styles API added (`/api/styles`, SFTP-backed `/files/styles`).
- SFTP auth fallback accepts `SFTP_USER/PASS` or `SFTP_USERNAME/PASSWORD`.

## In Progress / To Verify
- Ensure `/api/styles` is deployed on Vercel (styles endpoint 404 if missing).
- Companion “Saved styles” list depends on `/api/styles` 200.
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
- `client/src/App.tsx`: main shell, view switching, file ops.
- `client/src/processor/editor/RichTextEditor.tsx`: new processor editor.
- `client/src/processor/companion/CompanionPanel.tsx`: companion UI using RichTextHandle.
- `client/src/processor/editor/EditorCanvas.tsx`: legacy Tiptap (not used).
- `api/styles.ts`: serverless styles endpoint (Vercel).
- `server/src/controllers/fileController.ts`: SFTP file ops, share, serve rewrite.
- `server/src/routes/files.ts`: file routes + share.
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
- Deploy `api/styles.ts` if not already to clear 404 on styles.
- Optional cleanup: remove Tiptap/old palette assets once stable.
- Consider public share toggle (skip auth) if needed for wider access. 
