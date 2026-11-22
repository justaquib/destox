# Destox

A macOS cleaner built with Tauri, React, and TypeScript.

## Features
- App uninstaller with selection and size preview
- Large file scanner (files over 5 MB) with grid/list views
- Trash bin viewer (recover or permanently delete)
- Recently installed apps
- Ports viewer with process kill
- Permissions manager
- About and Preferences

## Download
Latest release: https://github.com/justaquib/destox/releases

## Development
```bash
npm install
npm run tauri dev
```

## Build
```bash
npm run build
npm run tauri build
```

## Build with a specific version
```bash
npm run tauri build -- --config '{"version":"1.2.3"}'
```
