# Editor features

Port of [LosslessCut](https://github.com/mifi/lossless-cut) (GPL-2.0). Each feature lives in its own folder:

```
src/editor/<n>-<feature>/
  9-state/    Jotai atoms and Valtio proxies (no React)
  7-actions/  plain functions that read/write `appStore` (no React)
  8-lib/      pure helpers, ffmpeg arg builders, parsers
  0-ui/       React components (shadcn), read state with useAtomValue/useSnapshot
  index.ts    public API: exports UI entry points. Startup registration lives in src/views-load-side-effects/
```

| Folder | Feature |
| --- | --- |
| 0-core | store, dialogs (`fireDialog`, `openCustomDialog`), working/progress/errors, timecode, actions registry, per-file lifecycle, ffmpeg facade (`ff-remote.ts`) |
| 1-layout | editor layout, panel visibility atoms, theme sync |
| 2-file | open/close/load media, batch list state, html5ify, project auto-save |
| 3-player | video element binding, compat (MSE) player, subtitles, playback streams |
| 4-timeline | timeline, zoom/scroll, waveform, thumbnails, keyframes, bottom bar |
| 5-segments | segments with undo/redo (valtio-history), segment list |
| 6-streams | which streams are copied, tracks editor, tags, dispositions, GPS map |
| 7-export | ffmpeg operations (cut/merge/smart cut), export confirm, output name template, top menu |
| 8-concat | merge files dialog, batch file list |
| 9-closed-captions | project import/export formats |
| a-capture-frame | frame capture, extract frames |
| b-detect | scene/black/silence/keyframe detection |
| c-keyboard | key bindings, shortcuts editor, command palette |
| d-settings | settings dialog |
| e-i18n | i18next setup |

## Rules

- No `useState` for app state, minimal `useEffect`/`useCallback`. Side effects that react to state use `observe()` from jotai-effect at module level.
- Everything uses the single store `appStore` (`0-core/9-state/store.ts`); actions are plain functions, not hooks.
- Per-file state registers its reset with `onFileReset()` (`0-core/7-actions/lifecycle.ts`).
- Keyboard actions, the command palette, and the HTTP API are registered by name with `registerActions()` using the upstream LosslessCut action names, and invoked with `runAction(name)`. The application menu calls `runMenuAction()` in `0-core/menu-actions/`, which calls those same feature functions or the Electron host catalog. Cross-feature buttons call `runAction()` rather than importing another feature's internals.
- New features: add a folder and an `index.ts`, then add a `<folder>-register.ts` under `src/views-load-side-effects` and call it from that folder's `loadViewSideEffects`.
