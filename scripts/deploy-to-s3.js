#!/usr/bin/env node
import {
  S3Client,
  PutObjectCommand,
  GetBucketLocationCommand,
} from '@aws-sdk/client-s3';
import Arborist from '@npmcli/arborist';
import { program } from 'commander';
import * as fs from 'node:fs';
import { extname } from 'node:path';
import packlist from 'npm-packlist';

/**
 * File extension / mime type associations for file types we actually use.
 */
const TEXT_MIME_TYPES = {
  '.css': 'text/css',
  '.md': 'text/markdown',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
};

const BINARY_MIME_TYPES = {
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Return the `Content-Type` header value for a given file.
 */
function contentTypeFromFilename(path) {
  const extension = extname(path);
  if (!extension) {
    // Fallback if no extension.
    return 'text/plain';
  }

  let mimeType = TEXT_MIME_TYPES[extension];
  if (mimeType) {
    return mimeType + '; charset=UTF-8';
  }

  mimeType = BINARY_MIME_TYPES[extension];
  if (mimeType) {
    return mimeType;
  }

  throw new Error(`Unable to look up Content-Type for ${path}`);
}

class S3Uploader {
  constructor(bucket) {
    // Set an initial region that we'll use for the call to get the bucket's
    // location. We'll create a new client for the bucket's region later.
    this.s3 = new S3Client({ region: 'us-west-1' });
    this.bucket = bucket;
    this.region = null;
  }

  async upload(destPath, srcFile, { cacheControl }) {
    if (!this.region) {
      // Find out where the S3 bucket is.
      const command = new GetBucketLocationCommand({
        Bucket: this.bucket,
      });
      const regionResult = await this.s3.send(command);

      // LocationConstraint is omitted for us-east-1.
      // See https://github.com/aws/aws-sdk-js-v3/pull/844
      this.region = regionResult.LocationConstraint ?? 'us-east-1';
      this.s3 = new S3Client({ region: this.region });
    }

    const fileContent = fs.readFileSync(srcFile);
    const params = {
      ACL: 'public-read',
      Bucket: this.bucket,
      Key: destPath,
      Body: fileContent,
      CacheControl: cacheControl,
      ContentType: contentTypeFromFilename(srcFile),
    };
    const putObjectCommand = new PutObjectCommand(params);
    return this.s3.send(putObjectCommand);
  }
}

/**
 * Uploads the content of the npm package in the current directory to S3.
 *
 * Creates the following keys in the S3 bucket:
 *
 * - `<package name>/<version>/<file>` for each `<file>` in the package.
 * - `<package name>@<version>` is a copy of the entry point for the package.
 * - `<package name>@<tag>` is a copy of the entry point for the package if
 *   `tag` is non-empty.
 * - `<package name>` is a copy of the entry point if `tag` is empty.
 *
 * Files are made publicly readable. Keys containing the full package version
 * are set to be cached indefinitely by the browser. Keys that are pointers
 * to the current version only have a short cache lifetime.
 */
async function uploadPackageToS3(bucket, options) {
  // Get list of files that are distributed with the package, respecting
  // the `files` field in `package.json`, `.npmignore` etc.
  const arb = new Arborist({ path: '.' });
  const tree = await arb.loadActual();
  const files = await packlist(tree);

  // Get name, version and main module of the package.
  const packageJson = JSON.parse(
    fs.readFileSync(`${process.cwd()}/package.json`),
  );
  const packageName = packageJson.name;
  const version = packageJson.version;
  const entryPoint = packageJson.main;

  // Configure uploads to S3.
  const uploader = new S3Uploader(bucket);
  const cacheForever = 'public, max-age=315360000, immutable';

  // Upload all package files to `$PACKAGE_NAME/$VERSION`.
  const uploads = files.map(file =>
    uploader.upload(`${packageName}/${version}/${file}`, file, {
      cacheControl: cacheForever,
    }),
  );
  await Promise.all(uploads);

  // Upload a copy of the entry-point to `$PACKAGE_NAME@$VERSION`.
  await uploader.upload(`${packageName}@${version}`, entryPoint, {
    cacheControl: cacheForever,
  });

  // Upload a copy of the entry-point to `$PACKAGE_NAME` or `$PACKAGE_NAME@$TAG`.
  // This enables creating URLs that always point to the current version of
  // the package.
  let aliasCacheControl;
  if (options.cacheEntry) {
    // nb. When deploying to cdn.hypothes.is, the max-age seen by the browser is
    // the higher of the value here and CloudFlare's "Browser Cache TTL"
    // setting.
    aliasCacheControl = 'public, s-maxage=300, max-age=60, must-revalidate';
  } else {
    aliasCacheControl = 'no-cache';
  }

  let aliasPath;
  if (!options.tag) {
    aliasPath = `${packageName}`;
  } else {
    aliasPath = `${packageName}@${options.tag}`;
  }
  await uploader.upload(aliasPath, entryPoint, {
    cacheControl: aliasCacheControl,
  });
}

program
  .option('--bucket [bucket]', 'S3 bucket name')
  .option('--tag [tag]', 'Version tag')
  .option('--no-cache-entry', 'Prevent CDN/browser caching of entry point')
  .parse(process.argv);

const cliOpts = program.opts();

const options = {
  tag: cliOpts.tag,
  cacheEntry: cliOpts.cacheEntry,
};

uploadPackageToS3(cliOpts.bucket, options).catch(err => {
  console.error('Failed to upload S3 package', err);
  process.exit(1);
});
