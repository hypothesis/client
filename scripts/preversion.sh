#!/bin/sh

set -eu

# Check that tag signing works
git tag --sign --message "Dummy Tag" dummy-tag
git tag --delete dummy-tag > /dev/null

# Check GitHub API access token
CLIENT_INFO_URL=https://api.github.com/repos/hypothesis/client
REPO_TMPFILE=/tmp/client-repo.json
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" $CLIENT_INFO_URL > $REPO_TMPFILE
CAN_PUSH=$(node -p -e "perms = require('$REPO_TMPFILE').permissions, perms && perms.push")

if [ "$CAN_PUSH" != "true" ]; then
  echo "Cannot push to GitHub using the access token '$GITHUB_TOKEN'"
  exit 1
fi

# Check that we're not releasing broken code
make test
