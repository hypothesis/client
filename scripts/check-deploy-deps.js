#!/usr/bin/env node
/**
 * Smoke-check the release-time deploy dependencies that PR CI otherwise never
 * exercises.
 *
 * Context: on 2026-07-01 a `fast-xml-parser` pin made the AWS SDK reject the
 * `&#xD;` (carriage return) entity that S3 returns in `GetBucketLocation`
 * responses, blocking every deploy while PR CI stayed green, because the
 * deploy script's dependency chain only runs in the post-merge Release
 * workflow. This script exercises that chain on every PR:
 *
 * 1. The AWS SDK S3 client can be imported and constructed.
 * 2. The XML parser resolved for the AWS SDK accepts the `&#xD;` entity.
 *
 * `deploy-to-s3.js --help` is run separately by CI to cover the deploy
 * script's own import chain (commander, arborist, npm-packlist).
 */
import { S3Client } from '@aws-sdk/client-s3';
import { XMLParser } from 'fast-xml-parser';

new S3Client({ region: 'us-west-1' });

// Mirrors the shape of a real S3 `GetBucketLocation` response, including the
// carriage-return entity that broke deploys on 2026-07-01.
const xml =
  '<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">us-west-1&#xD;</LocationConstraint>';
const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
const value =
  parsed?.LocationConstraint?.['#text'] ?? parsed?.LocationConstraint;

if (typeof value !== 'string' || !value.startsWith('us-west-1')) {
  console.error('Unexpected S3 XML parse result:', JSON.stringify(parsed));
  process.exit(1);
}

console.log('Deploy dependency smoke checks passed.');
