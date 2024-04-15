import { existsSync, readFileSync } from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';

const SSL_KEYFILE = '.tlskey.pem';
const SSL_CERTFILE = '.tlscert.pem';

/**
 * `true` if dev servers created using `createServer` use SSL.
 *
 * @type {boolean}
 */
export const useSsl = existsSync(SSL_KEYFILE) && existsSync(SSL_CERTFILE);

/**
 * Create an HTTP(S) server to serve client assets in development.
 *
 * Uses SSL if ".tlskey.pem" and ".tlscert.pem" files exist in the root of
 * the repository or plain HTTP otherwise.
 *
 * @param {Function} requestListener
 */
export function createServer(requestListener) {
  let server;
  if (useSsl) {
    const options = {
      cert: readFileSync(SSL_CERTFILE),
      key: readFileSync(SSL_KEYFILE),
    };
    server = https.createServer(options, requestListener);
  } else {
    server = http.createServer(requestListener);
  }
  return server;
}
