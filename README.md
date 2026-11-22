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

## Publish an update

Tauri updater signatures are enabled for the `v0.2.0` bootstrap release. Before publishing it, add the contents of `src-tauri/destox-updater.key` as the `TAURI_SIGNING_PRIVATE_KEY` Actions secret in the GitHub repository. Keep the private key backed up securely; it is ignored by Git and is required to sign all future updates. The public key is embedded in `src-tauri/tauri.conf.json`.

After the secret is configured, publish the bootstrap release by pushing the matching version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds Intel and Apple Silicon artifacts, publishes a GitHub Release, and uploads `latest.json`. For each later release, update the version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, commit the version change, then push the matching `vX.Y.Z` tag. Existing `v0.1.0` installations must install the bootstrap release manually once; later updates are offered from inside Destox. Builds use ad-hoc macOS signing, so macOS may still require users to approve the app in Privacy & Security.
