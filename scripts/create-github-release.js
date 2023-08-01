#!/usr/bin/env node

'use strict';

/**
 * Creates a GitHub release for the repository.
 *
 * This should be run just after a released is tagged with the tag name
 * `v<VERSION>` where <VERSION> is the `version` field in package.json.
 */

const { Octokit } = require('@octokit/rest');

const pkg = require('../package.json');
const { changelistSinceTag } = require('./generate-change-list');

async function createGitHubRelease({ previousVersion }) {
  // See https://github.com/docker/docker/issues/679
  const GITHUB_ORG_REPO_PAT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

  if (!pkg.repository || !pkg.repository.match(GITHUB_ORG_REPO_PAT)) {
    throw new Error(
      'package.json is missing a "repository" field of the form :owner/:repo',
    );
  }

  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN env var is not set');
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const changes = await changelistSinceTag(octokit, previousVersion);
  const [owner, repo] = pkg.repository.split('/');
  const releaseName = `v${pkg.version}`;

  console.log(
    `Creating release ${releaseName} of ${owner}/${repo}.
Changes since previous release ${previousVersion}:

${changes}
`,
  );

  await octokit.repos.createRelease({
    // Required params.
    owner,
    repo,
    tag_name: releaseName,

    // Optional params.
    body: changes,
    draft: false,
    name: releaseName,
    prerelease: true,
  });
}

const previousVersion = process.argv[2];
if (!previousVersion) {
  console.error(`Usage: ${process.argv[1]} <previous version>`);
  process.exit(1);
}

createGitHubRelease({ previousVersion }).catch(err => {
  console.error('Failed to create release.', err);
  process.exit(1);
});
