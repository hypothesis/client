#!/bin/sh

# Wait for the version of the package available on npm to match the
# version in package.json.
#
# This script is needed because a new release of a package is not always
# immediately available after "npm publish" returns.
#
# Usage: wait-for-npm-release.sh [<dist-tag>]
#
# <dist-tag> defaults to "latest".

if [ -z "$1" ]; then
  dist_tag=latest
else
  dist_tag=$1
fi

expected_version=$(node -p "require('./package.json').version")
while [ true ]
do
  released_version=$(yarn info -s hypothesis dist-tags.$dist_tag)
  if [ "$released_version" = "$expected_version" ]; then
    break
  fi

  sleep 1
done
