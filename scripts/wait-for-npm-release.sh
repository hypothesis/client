#!/bin/sh

# Wait for the version of the package available on npm to match the
# version in package.json.
#
# This script is needed because a new release of a package is not always
# immediately available after "npm publish" returns.

expected_version=$(node -p "require('./package.json').version")
while [ true ]
do
  released_version=$(npm show hypothesis dist-tags.latest)
  if [ $released_version = $expected_version ]; then
    break
  fi

  sleep 1
done
