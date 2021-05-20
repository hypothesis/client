'use strict';

const { execSync } = require('child_process');

const wrapText = require('wrap-text');

/**
 * Return a `Date` indicating when a Git tag was created.
 *
 * The tag creation date is used for annotated tags, otherwise there is a
 * fallback to the date of the tagged commit.
 */
function getTagDate(tag) {
  const result = execSync(
    `git tag --list "${tag}" "--format=%(committerdate) -- %(taggerdate)"`,
    {
      encoding: 'utf-8',
    }
  );
  const [commitDate, tagDate] = result.trim().split('--');
  const date = new Date(tagDate || commitDate);
  if (isNaN(date)) {
    throw new Error(`Unable to determine tag date of tag "${tag}"`);
  }
  return date;
}

/**
 * Return the name of the tag with the highest version number.
 */
function getHighestVersionTag() {
  const result = execSync('git tag --list --sort=-version:refname', {
    encoding: 'utf-8',
  });
  const tags = result.split('\n').map(line => line.trim());

  if (tags.length === 0) {
    return null;
  }
  return tags[0];
}

/**
 * Iterate over items in a GitHub API response and yield each item, fetching
 * additional pages of results as necessary.
 */
async function* itemsInGitHubAPIResponse(octokit, options) {
  for await (const page of octokit.paginate.iterator(options)) {
    for (let item of page.data) {
      yield item;
    }
  }
}

/**
 * Return a list of PRs merged since `tag`, sorted in ascending order of merge date.
 */
async function getPRsMergedSince(octokit, org, repo, tag) {
  const tagDate = getTagDate(tag);

  const options = await octokit.pulls.list.endpoint.merge({
    owner: org,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
  });

  const prs = [];
  for await (const pr of itemsInGitHubAPIResponse(octokit, options)) {
    if (!pr.merged_at) {
      // This PR was closed without being merged.
      continue;
    }

    // Stop once we get to a PR that was last updated before the tag was created.
    const lastUpdateDate = new Date(pr.updated_at);
    if (lastUpdateDate < tagDate) {
      break;
    }

    // Only include PRs which were merged _after_ the tag was created.
    const mergeDate = new Date(pr.merged_at);
    if (mergeDate > tagDate) {
      prs.push(pr);
    }
  }

  // Sort PRs by merge date in ascending order.
  return prs.sort((a, b) => {
    const aMergedAt = new Date(a.merged_at);
    const bMergedAt = new Date(b.merged_at);
    return aMergedAt < bMergedAt ? -1 : 1;
  });
}

/**
 * Format a list of pull requests from the GitHub API into a markdown list.
 *
 * Each item includes the PR title, number and link. For example:
 *
 * ```
 * - Fix clicking "Frobnob" button not frobnobbing [#123](
 *   https://github.com/hypothesis/client/pulls/123).
 *
 * - Fix clicking "Foobar" button not foobaring [#124](
 *   https://github.com/hypothesis/client/pulls/124).
 * ```
 */
function formatChangeList(pullRequests) {
  return (
    pullRequests
      // Skip automated dependency update PRs.
      .filter(pr => !pr.labels.some(label => label.name === 'dependencies'))
      .map(pr => `- ${pr.title} [#${pr.number}](${pr.html_url})`)
      .map(item => wrapText(item, 90))
      // Align the start of lines after the first with the text in the first line.
      .map(item => item.replace(/\n/gm, '\n  '))
      .join('\n\n')
  );
}

/**
 * Return a markdown-formatted changelog of changes since a given Git tag.
 *
 * If no Git tag is specified, default to the most recently created tag.
 *
 * Tag names are usually `vX.Y.Z` where `X.Y.Z` is the package version.
 */
async function changelistSinceTag(octokit, tag = getHighestVersionTag()) {
  const org = 'hypothesis';
  const repo = 'client';

  const mergedPRs = await getPRsMergedSince(octokit, org, repo, tag);
  return formatChangeList(mergedPRs);
}

if (require.main === module) {
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const tag = process.argv[2] || getHighestVersionTag();

  changelistSinceTag(octokit, tag)
    .then(changes => {
      console.log(changes);
    })
    .catch(err => {
      console.error('Unable to generate change list:', err);
    });
}

module.exports = {
  changelistSinceTag,
};
