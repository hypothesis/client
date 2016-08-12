#!/usr/bin/env sh

SCRIPT_DIR=$(dirname `readlink -f "$0"`)

git push
git push --tags

# Wait a moment to give GitHub a chance to realize that the tag exists
sleep 2

$SCRIPT_DIR/create-github-release.js
