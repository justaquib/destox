# Destox Design & Structure

## Structure
```
src/
  components/        # Reusable UI (Icon, Sidebar)
  features/          # Feature modules (applications, trash, permissions)
  lib/               # Tauri invoke wrappers
  styles/            # Global CSS
src-tauri/src/
  commands/          # storage, apps, history, trash
  lib.rs             # Command registration
```

## Icons
Use `lucide-react` via `components/Icon.tsx`. Do not add custom SVGs.

## Color Palette
- App background: `#edf2f0` → `#dfe8e4`
- Surface: `#fbfcfb`
- Sidebar: `#f1f5f3`
- Text primary: `#26332f`
- Text muted: `#8a9691`
- Accent: `#527666` (hover `#456b5b`)
- Accent soft: `#557b6d`, `#638b7b`, `#719786`
- Borders: `#e1e7e4`, `#dfe5e2`, `#edf0ef`
- Traffic lights: `#ec7772`, `#e8bd65`, `#70ba7c`

## Rules
- Reuse `.app-row`, `.app-icon`, `.app-details`, `.app-size` for list rows.
- Keep spacing and radius consistent (`10px` buttons, `11px` icons).
- Avoid new colors; use the palette above.


## File Size Rule
- No source file should exceed 404 lines. Split into modules/components if needed.


## Git Rule
- Do not push code to the repository unless explicitly instructed to push.


## Build Rule
- Do not bundle the app without explicit user approval.


## Change Rule
- Do not revert user changes. Only update or extend existing code when needed.
