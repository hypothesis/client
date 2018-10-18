#!/usr/bin/env node

/**
 * Replaces the "[Unreleased]" header for changes in the next release with the
 * current package version from package.json
 */

'use strict';

const fs = require('fs');
const process = require('process');

const octokit = require('@octokit/rest')();

const pkg = require('../package.json');
const { changelistSinceTag } = require('./generate-change-list');

/**
 * Update CHANGELOG.md with details of pull requests merged since the previous
 * release.
 */
async function updateChangeLog() {
  if (process.env.GITHUB_TOKEN) {
    octokit.authenticate({
      type: 'oauth',
      token: process.env.GITHUB_TOKEN,
    });
  } else {
    console.warn('GITHUB_TOKEN env var not set. API calls may hit rate limits.');
  }

  const dateStr = new Date().toISOString().slice(0,10);
  const changelist = await changelistSinceTag(octokit);

  const changelogPath = require.resolve('../CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath).toString();
  const updatedChangelog = changelog.replace(
    '# Change Log',
    `# Change Log

## [${pkg.version}] - ${dateStr}

### Changed

${changelist}
`);

  fs.writeFileSync(changelogPath, updatedChangelog);
}

updateChangeLog();
