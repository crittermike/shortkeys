#!/usr/bin/env bash
# Downloads the latest published Chrome release for upgrade tests (e2e/upgrade.spec.ts).
set -euo pipefail
dest=".e2e-cache/previous-release"
rm -rf "$dest" && mkdir -p "$dest/chrome"
tag=$(gh release view --json tagName --jq .tagName)
gh release download "$tag" --pattern '*-chrome.zip' --dir "$dest"
unzip -q "$dest"/*-chrome.zip -d "$dest/chrome"
echo "$tag" > "$dest/TAG"
echo "Fetched $tag into $dest/chrome"
