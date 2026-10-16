# Building TrackMeNot for Firefox

## What was broken

The upstream `master` manifest declared a background page that does not exist in the repo:

```json
"background": { "page": "background.html" }   // background.html was deleted in commit 327d030
```

Firefox therefore refused to load the add-on. Fixes applied:

1. **Background script** — replaced the missing background page with a direct script entry
   (`"background": { "scripts": ["trackmenot.js"], "persistent": true }`).
   `trackmenot.js` is the real background logic and still exposes `TRACKMENOT` globally,
   so `api.extension.getBackgroundPage()` in the options/popup scripts keeps working.
2. **Firefox metadata** — added `browser_specific_settings.gecko` with an add-on `id`
   and `data_collection_permissions` (required for AMO, recommended for local builds).
3. **Icon** — the manifest mapped key `"48"` to a 32px file; changed it to `"32"`.

## Requirements

- Node.js 18+ (tested on Node 24)
- Firefox (tested on Firefox 158; Manifest V2 is still enabled by default)

## Commands

```bash
npm install      # install web-ext
npm run lint     # validate the extension (expect 0 errors)
npm run build    # package into dist/trackmenot-0.10.46.zip (+ .xpi)
npm start        # launch Firefox with the add-on loaded temporarily
```

The build produces `dist/trackmenot-0.10.46.xpi` (an XPI is just a ZIP).

## Loading it in Firefox

**Temporary (any Firefox, removed on restart):**

- `npm start`, or
- open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** and select
  `manifest.json` (or the generated `.xpi`).

**Permanent:**

- Firefox Release refuses permanently-installed unsigned XPIs. Either:
  - sign the XPI on [addons.mozilla.org](https://addons.mozilla.org/developers/)
    (`web-ext sign --api-key … --api-secret …`), or
  - use Firefox Developer Edition / Nightly / ESR with
    `xpinstall.signatures.required = false` in `about:config`, then install the `.xpi`.

## Known warnings

`web-ext lint` reports 3 `UNSAFE_VAR_ASSIGNMENT` warnings in the bundled
`jquery.js` (old jQuery using dynamic `innerHTML`). They are pre-existing and do not
prevent loading, running, or signing. The unused legacy `locale/*.properties` files
are left in place and are harmless.
