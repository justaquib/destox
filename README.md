# Destox

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
Or edit `src-tauri/tauri.conf.json` `version` field before building.
