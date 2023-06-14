#!/bin/sh

# Wait for the version of the package available on npm to match the
# version in package.json.
#
# This script is needed because a new release of a package is not always
# immediately available after "npm publish" returns.
#
# Usage: wait-for-npm-release.sh [<dist-tag>] [<version>]
#
# <dist-tag> defaults to "latest".
# <version> defaults to the "version" field from package.json.

package_name=hypothesis
timeout=60
start_time=$(date +%s)
end_time=$((start_time + timeout))

if [ -z "$1" ]; then
  dist_tag=latest
else
  dist_tag=$1
fi

if [ -z "$2" ]; then
  expected_version=$(node -p "require('./package.json').version")
else
  expected_version=$2
fi

echo "Waiting for $package_name@$expected_version to be published as \"$dist_tag\" on npm..."

while true
do
  released_version=$(npm info "$package_name" "dist-tags.$dist_tag")
  if [ "$released_version" = "$expected_version" ]; then
    echo "Package version $expected_version found on npm."
    break
  fi

  current_time=$(date +%s)
  if [ "$current_time" -ge "$end_time" ]; then
    echo "Timeout reached. Package was not published after $timeout seconds."
    exit 1
  fi

  sleep 1
done
