# VideoEd

A lossless video/audio editor for Electron. It is a port of [LosslessCut](https://github.com/mifi/lossless-cut) by Mikael Finstad, rebuilt with shadcn UI components and Jotai/Valtio state management.

## License

This project is licensed under the GNU General Public License v2.0 (see [LICENSE](LICENSE)), the same license as LosslessCut, because large parts of its logic (ffmpeg argument building, project/EDL formats, segment handling, keyboard actions) are ported from LosslessCut.

LosslessCut is Copyright (C) Mikael Finstad and contributors, licensed under GPL-2.0.
ffmpeg is licensed under GPL v2+.

## Getting started

```sh
pnpm install
# pnpm may skip Electron's postinstall; if `node_modules/electron/dist` is missing:
node node_modules/electron/install.js

pnpm fetch-ffmpeg   # downloads ffmpeg/ffprobe for the current platform into resources/ffmpeg/<platform>-<arch>
pnpm dev            # Electron + Vite with HMR
pnpm dev:web        # renderer only, in a browser (Electron APIs are mocked)
pnpm test           # vitest
pnpm dist:win       # package with electron-builder (also dist:mac, dist:linux)
```

A custom ffmpeg folder can also be set in Settings ("Custom FFmpeg directory").

## Project structure

```
electron/main/         main process: window, menu, media:// protocol, ffmpeg/ffprobe, config store, HTTP API, CLI
electron/preload/      contextBridge: exposes window.mainApi and window.mainEvents
shared/                code shared by main and renderer: IPC contract, types, constants
src/                   renderer (React)
  components/          app shell (header, footer, welcome page, dialogs)
  editor/              all editor functionality, one folder per feature
  ui/shadcn/           shadcn components
resources/ffmpeg/      ffmpeg binaries (not committed)
```

Every feature folder in `src/editor/` follows the same layout:

```
<n>-<feature>/
  0-state/      Jotai atoms and/or Valtio proxies
  1-actions/    write-only Jotai action atoms (commands)
  2-lib/        pure logic + tests (no React)
  3-ui/         shadcn-based components
  index.ts      public API of the feature
```

State rules:

- Valtio holds large mutable objects: user settings (synced to the main-process config store) and segments (with undo/redo through `valtio-history`).
- Jotai holds everything else: primitive atoms for UI state, derived atoms, and write-only action atoms for commands.
- All commands are registered in the actions registry (`src/editor/0-core/actions-registry.ts`), which is used by keyboard shortcuts, the native menu, the HTTP API and the command palette (Ctrl/Cmd+Shift+P).
