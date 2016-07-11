#!/usr/bin/env node

'use strict';

/**
 * Creates a GitHub release for the repository.
 *
 * This should be run just after a released is tagged with the tag name
 * `v<VERSION>` where <VERSION> is the `version` field in package.json.
 */

const fs = require('fs');
const request = require('request');

const pkg = require('../package.json');

/**
 * Extract the release notes for a given version from a markdown changelog in
 * the format recommended by http://keepachangelog.com
 */
function extractReleaseNotes(changelog, version) {
  const notes = changelog
    .split(/(\n|^)## /)
    .find(section => section.indexOf(`[${version}]`) === 0);

  if (!notes) {
    throw new Error(`Failed to find release notes for v${pkg.version}`);
  }

  return notes.split('\n').slice(1).join('\n');
}

// See https://github.com/docker/docker/issues/679
const GITHUB_ORG_REPO_PAT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

if (!pkg.repository || !pkg.repository.match(GITHUB_ORG_REPO_PAT)) {
  throw new Error('package.json is missing a "repository" field of the form :owner/:repo');
}

if (!process.env.GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN env var is not set');
}

const changelog = fs.readFileSync(require.resolve('../CHANGELOG.md')).toString();
const release = {
  tag_name: `v${pkg.version}`,
  name: `v${pkg.version}`,
  body: extractReleaseNotes(changelog, pkg.version),
  draft: false,
  prerelease: true,
};

request.post({
  uri: `https://api.github.com/repos/${pkg.repository}/releases`,
  body: release,
  json: true,
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    'User-Agent': `${pkg.repository} Release Script`,
  },
}, (err, rsp, body) => {
  if (err || rsp.statusCode !== 201) {
    const msg = err ? err.message : `${rsp.statusCode}: ${JSON.stringify(body)}`;
    throw new Error(`Creating GitHub release failed: ${msg}`);
  }
  console.info(`Created GitHub release for v${pkg.version}`);
});
