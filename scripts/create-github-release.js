#!/usr/bin/env node

'use strict';

/**
 * Creates a GitHub release for the repository.
 *
 * This should be run just after a released is tagged with the tag name
 * `v<VERSION>` where <VERSION> is the `version` field in package.json.
 */

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

  const [owner, repo] = pkg.repository.split('/');

  await octokit.repos.createRelease({
    body: changes,
    draft: false,
    name: `v${pkg.version}`,
    owner,
    prerelease: true,
    repo,
    tag_name: `v${pkg.version}`,
  });
}

createGitHubRelease().catch(err => {
  console.error('Failed to create release.', err);
  process.exit(1);
});
