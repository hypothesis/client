'use strict'

const core = require('@actions/core');
const util = require('util');

const exec = util.promisify(require('child_process').exec);

/**
 * Returns true is there is a non-zero length diff between the last published version
 * and master within the frontend-shared/ folder.
 */
async function haveChangesOccurred() {
  const parentPackage = core.getInput('parent-package');
  const versionResult = await exec(`npm view ${parentPackage}@latest version`);
  const version = versionResult.stdout.trim();
  const diffResult = await exec(`git diff --stat v${version}..master frontend-shared/`)
  return diffResult.stdout.length > 0;
}

/**
 * Increment the minor part of a `MAJOR.MINOR.PATCH` semver version.
 */
function bumpMinorVersion(version) {
  const parts = version.split('.')
  if (parts.length !== 3) {
    throw new Error(`${version} is not a valid MAJOR.MINOR.PATCH version`);
  }
  const majorVersion = parseInt(parts[0]);
  const newMinorVersion = parseInt(parts[1]) + 1;
  const patchVersion = parseInt(parts[2]);
  if (isNaN(majorVersion) || isNaN(newMinorVersion) || isNaN(patchVersion)) {
    throw new Error(`${version} does not have valid integer parts`);
  }
  return `${parts[0]}.${newMinorVersion}.${parts[2]}`
}

/**
 * Get the current version from npm and bump the minor part by 1.
 */
async function getNewVersion() {
  const sharedPackage = core.getInput('shared-package');
  const result = await exec(`npm view ${sharedPackage} version`);
  const newVersion = bumpMinorVersion(result.stdout);
  return newVersion;
}

async function main() {
  if (await haveChangesOccurred()) {
    // eslint-disable-next-line no-console
    console.log('Changes detected in frontend-shared/, publishing new version...');
    const newVersion = await getNewVersion();
    core.setOutput("updated_version", newVersion);
  } else {
    // eslint-disable-next-line no-console
    console.log('No changes detected in frontend-shared/');
    core.setOutput("updated_version", null);
  }
}

main().catch(error => {
  core.setFailed(error.message);
})

