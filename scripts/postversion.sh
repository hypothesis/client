#!/bin/sh

set -eu

cd "$(dirname "$0")"

# nb. The remote refname is fully qualified because this script is run in a CI
# environment where not all heads may have been fetched.
git push https://github.com/hypothesis/client.git HEAD:refs/heads/$BRANCH_NAME --follow-tags

# Wait a moment to give GitHub a chance to realize that the tag exists
sleep 2

./create-github-release.js
