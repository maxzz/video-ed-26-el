electron-builder `buildResources` folder (see `electron-builder.yml`).

App icons are not created yet, so packaged builds use the default Electron icon. Add:

- `icon.ico` (Windows, 256x256)
- `icon.icns` (macOS)
- `icon.png` (Linux, 512x512 or larger)
