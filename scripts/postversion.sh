#!/bin/sh

set -eu

cd "$(dirname "$0")"

# Skip GitHub release creation for QA releases.
is_prerelease=$(node -p "require('../package.json').version.includes('-')")
if [ $is_prerelease = "true" ]; then
  echo "Skipping GitHub release creation for pre-release"
  exit 0
fi

./create-github-release.js
