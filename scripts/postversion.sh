#!/bin/sh

set -eu

cd "$(dirname "$0")"

git push https://github.com/hypothesis/client.git master:master --follow-tags

# Wait a moment to give GitHub a chance to realize that the tag exists
sleep 2

./create-github-release.js
