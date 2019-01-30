#!/usr/bin/env node

'use strict';

/**
 * Creates a GitHub release for the repository.
 *
 * This should be run just after a released is tagged with the tag name
 * `v<VERSION>` where <VERSION> is the `version` field in package.json.
 */

const request = require('request');
const octokit = require('@octokit/rest')();

const pkg = require('../package.json');
const { changelistSinceTag } = require('./generate-change-list');

async function createGitHubRelease() {
  // See https://github.com/docker/docker/issues/679
  const GITHUB_ORG_REPO_PAT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

  if (!pkg.repository || !pkg.repository.match(GITHUB_ORG_REPO_PAT)) {
    throw new Error('package.json is missing a "repository" field of the form :owner/:repo');
  }

  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN env var is not set');
  }

  octokit.authenticate({
    type: 'oauth',
    token: process.env.GITHUB_TOKEN,
  });

  const changes = await changelistSinceTag(octokit);

  const release = {
    tag_name: `v${pkg.version}`,
    name: `v${pkg.version}`,
    body: changes,
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
}

createGitHubRelease().catch(err => {
  console.error('Failed to create release.', err);
  process.exit(1);
});
