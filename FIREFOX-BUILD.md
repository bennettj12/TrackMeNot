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
npm run build    # package into dist/trackmenot-0.10.46.zip
npm run sign     # sign via AMO (unlisted); reads .environment or shell env
npm start        # launch Firefox with the add-on loaded temporarily
```

The build produces `dist/trackmenot-0.10.46.zip` (an XPI is just a ZIP).

## Loading it in Firefox

**Temporary (any Firefox, removed on restart):**

- `npm start`, or
- open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** and select
  `manifest.json` (or the generated `.xpi`).

**Permanent — option 1: sign it yourself (keeps your current Firefox Release / main profile).**

Mozilla signs it for free through AMO's "unlisted" (self-distribution) channel. It is not
publicly listed and is auto-approved (no manual review). You stay on Firefox Release.

1. Create an account at <https://addons.mozilla.org> and generate API credentials at
   <https://addons.mozilla.org/developers/addon/api/key/>.
2. Save them in `.environment` in the project root (git-ignored; never commit it):

   ```
   JWT_ISSUER=user:12345678:12
   JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   (`WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET` are also accepted, in the file or the shell.)
3. Run `npm run sign`. The signed XPI is written to `dist/` (named `<amo-id>-<version>.xpi`).
   Open it in Firefox (or drag it into `about:addons`) to install permanently.

If signing fails with an "ID already in use" error, change
`browser_specific_settings.gecko.id` in `manifest.json` to something unique to you and retry.

**Permanent — option 2: switch to a channel that allows unsigned add-ons.**

Verified against the actual builds: Firefox **Release** and **Beta** compile in
`MOZ_REQUIRE_SIGNING = true`, so `xpinstall.signatures.required` is ignored and unsigned
add-ons can never be installed permanently. **Developer Edition**, **Nightly** and **ESR**
compile it as `false`, so unsigned installs work there:

1. Install Firefox Developer Edition (or Nightly/ESR).
2. In `about:config`, set `xpinstall.signatures.required` = `false`.
3. Open `dist/trackmenot-0.10.46.zip` (rename to `.xpi` first, or drag it into `about:addons`).

Note: Developer Edition / Nightly use their own profiles by default and do not migrate your
Release profile automatically.

## Known warnings

`web-ext lint` reports 3 `UNSAFE_VAR_ASSIGNMENT` warnings in the bundled
`jquery.js` (old jQuery using dynamic `innerHTML`). They are pre-existing and do not
prevent loading, running, or signing. The unused legacy `locale/*.properties` files
are left in place and are harmless.
