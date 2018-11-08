#!/bin/sh

set -eu

cd "$(dirname "$0")"

# Skip GitHub release creation for QA releases.
is_prerelease=$(node -p "require('../package.json').version.includes('-')")
if [ $is_prerelease = "true" ]; then
  echo "Skipping GitHub release creation for pre-release"
  exit 0
fi

# nb. The remote refname is fully qualified because this script is run in a CI
# environment where not all heads may have been fetched.
git push https://github.com/hypothesis/client.git HEAD:refs/heads/$BRANCH_NAME \
  --follow-tags --atomic

# Wait a moment to give GitHub a chance to realize that the tag exists
sleep 2

./create-github-release.js
