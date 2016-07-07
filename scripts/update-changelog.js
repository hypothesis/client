#!/usr/bin/env node

/**
 * Replaces the "[Unreleased]" header for changes in the next release with the
 * current package version from package.json
 */

'use strict';

const fs = require('fs');

const pkg = require('../package.json');

const dateStr = new Date().toISOString().slice(0,10);
const versionLine = `## [${pkg.version}] - ${dateStr}`;

const changelogPath = require.resolve('../CHANGELOG.md');
const changelog = fs.readFileSync(changelogPath).toString();
const updatedChangelog = changelog.split('\n')
  .map(ln => ln.match(/\[Unreleased\]/) ? versionLine : ln)
  .join('\n');

if (updatedChangelog === changelog) {
  console.error('Failed to find "Unreleased" section in changelog');
  process.exit(1);
}

fs.writeFileSync(changelogPath, updatedChangelog);

