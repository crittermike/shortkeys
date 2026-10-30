# Releasing Shortkeys

Preparation does not publish a release, submit a store update, or restore Firefox availability. Do not tag, push, upload, sign, or publish until the maintainer explicitly approves that action.

## 5.1.1 release notes

This patch release includes compatible fixes since 5.1.0. The Firefox source build still requires desktop Firefox 153+. It is not an announcement of restored Firefox store availability or an Edge Add-ons listing.

- Recover legacy Firefox v4 settings when no newer settings are saved, without deleting the original data.
- Fix scrolling shortcuts when a link has focus in Firefox.
- Fix bookmark URL scheme parsing and Firefox welcome-page settings guidance.
- Improve shortcut cards and alerts in the settings page.
- Expand browser journey, upgrade, restart, and visual regression coverage; update dependencies.

The browser ZIPs are unsigned development packages, not store-signed releases. The Firefox ZIP is not a signed XPI.

## Integrate and choose a version

1. Integrate the tested sync-storage and shortcut-reliability changes before choosing the release version. Do not copy uncommitted work without coordinating its exact patch and base.
2. Review the combined changes since the previous release tag. Use a patch version for compatible fixes only; use a minor version when approved minimum-version or supported-feature changes are included. Keep the final version identical in `package.json`, `package-lock.json`, release notes, and browser manifests.
3. Let the maintainer test the extension using `npm run dev` before committing or pushing. Do not rename existing manifest command IDs: browser-assigned shortcuts depend on them.
4. If opening a PR is requested, use a draft PR with a short explanation of why the release is needed. Do not merge it automatically.

## Reproduce and verify the packages

Use Node 22 and npm with the committed lockfile. CI runs on Ubuntu; macOS can also build the packages. Record the exact Node/npm versions and release commit for the source submission.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run build:firefox
npm run build:site
npm run visual-review
npm run zip
npm run zip:firefox
npm run zip:edge
npm run zip:opera
```

WXT writes browser builds and versioned ZIPs to `.output/`. Inspect each generated manifest for the intended version, browser, permissions, and unchanged command IDs. `zip:firefox` produces a ZIP, not a signed XPI.

CI covers new install, upgrade from the latest GitHub release with typical, multi-chunk sync and local-only data, browser restart, shortcut refresh without reloading, core journeys in Chromium and Firefox, macro URLs, palette execution, and visual baselines. Still check by hand: the store build (not the GitHub release) upgrading, and real sync between two signed-in browsers. Inspect the visual-review screenshots in `screenshots/`.

For Firefox, use a clean desktop Firefox 153+ profile and `about:debugging` > This Firefox > Load Temporary Add-on > `.output/firefox-mv3/manifest.json`. Temporary installation ends when Firefox restarts. Test optional data consent both denied and granted, revoke it in `about:addons`, then confirm transmitting actions stop again. Enable the native user-script permission, explicitly install a custom script and a JavaScript macro, and verify shortcut and test-button execution on an existing tab. Check removal, changed code/bookmarklets/website scope, and permission revocation all prevent execution until explicitly enabled/installed again. Verify that remote userscript loading is unavailable and that Chrome behavior is unchanged. A local build or temporary installation is not evidence of AMO acceptance.

## Firefox submission gate

Current distribution is blocked: Mozilla rejected `5.0.1` for remote code execution and missing data-transmission consent ([#864](https://github.com/crittermike/shortkeys/issues/864)); installation failures continue in [#982](https://github.com/crittermike/shortkeys/issues/982). On October 20, 2026, the public AMO API listed only `2.0.20`, dated September 2017, with `is_mozilla_signed_extension: false`.

Before any submission:

1. Resolve every remote-code path, including userscript fetching, JavaScript macro steps, remotely obtained community packs, and imported or previously saved scripts. Do not relax page CSP, add `unsafe-eval`, or disguise executable code as data. Bundled scripts and user-authored scripts must follow Mozilla's applicable policies.
2. Keep Firefox's minimum desktop version at 153: modern `userScripts` requires MV3, and on-demand `userScripts.execute` requires 153. Earlier API versions cannot preserve existing-page shortcuts, macros, and testing. Do not advertise Android compatibility without a separate compatibility review.
3. Declare actual data categories. `required: ["none"]` means no mandatory transmission; declare the real optional categories as well: `browsingActivity`, `websiteContent`, `searchTerms`, `bookmarksInfo`, and `technicalAndInteraction` (extension settings). Request optional consent from an explicit user click, check permission before transmission, and recheck revocation each time. QR generation sends the current URL to `api.qrserver.com`; selected-text searches send website content/search terms to the chosen provider; community publishing sends shortcut settings (potentially URLs, content, and bookmark names) to GitHub. Normal local shortcuts must continue working when consent is denied. Never declare only `none` while transmitting data.
4. Review the exact source and packaged output together. Built-in scripts must be packaged functions. Manually authored/imported user scripts must use native `userScripts`, explicit installation/removal, and approval tied to the reviewed code and scope, consistent with Mozilla's user-script-manager exception. Verify all outbound data paths match the disclosures, including user-authored content and browser sync. Explain the user-script-manager behavior to Mozilla; local implementation is not policy approval. Update the AMO listing and privacy disclosure to match the actual Firefox feature set.
5. Prepare a source archive of the exact release commit, including `package-lock.json` and these build instructions. Include the Node/npm versions used and `npm ci && npm run build:firefox` as reviewer reproduction steps. Rebuild from the archive and compare its output with the submitted package.

Only after explicit approval, a maintainer with access to the existing AMO listing can upload the Firefox ZIP and matching source archive in the AMO Developer Hub. Describe the policy fixes and provide concrete reviewer steps for denied/granted/revoked consent and unavailable remote-script loading. Do not include unrelated changes in a rejection-remediation submission without considering Mozilla's submission guidelines.

Both listed and unlisted/self-distributed extensions require Mozilla signing and remain subject to the same policies. Self-distribution is not a bypass. Download the signed artifact from the accepted submission and test installing it in a clean release Firefox profile before linking to it. Never label an unsigned ZIP as an installable/signed XPI.

## Publish only with approval

1. Obtain approval for the final version, release notes, artifacts, target stores, and submission timing.
2. With approved store credentials, upload each browser's matching ZIP to its store. Keep signing/API secrets outside the repo and out of logs. A signed Chrome CRX is produced by its store; Firefox requires Mozilla signing.
3. Verify the live store version, successful installation, and upgrade behavior before announcing availability. Keep the Firefox status notice until the signed version is actually available and verified.
4. Only with release approval, tag the approved commit and create the GitHub release with matching browser artifacts and concise release notes. Identify unsigned development packages explicitly; never imply they replace a signed store release.

## Mozilla references

- [Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Native data consent and taxonomy](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Modern user scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts)
- [On-demand execution and compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts/execute)
- [Signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [Source submission and reproducible builds](https://extensionworkshop.com/documentation/publish/source-code-submission/)
