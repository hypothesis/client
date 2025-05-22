import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Replace placeholders in the client's boot script with real URLs.
 *
 * Placeholders are single or double-quoted string literals of the form
 * `"__VARIABLE_NAME__"`.
 */
export function renderBootTemplate(src, dest) {
  // URL template which is expanded by the boot script. See `src/boot/url-template.js`.
  const localhost = '{current_scheme}://{current_host}';

  const notebookAppUrl = process.env.NOTEBOOK_APP_URL
    ? `${process.env.NOTEBOOK_APP_URL}`
    : `${localhost}:5000/notebook`;

  const profileAppUrl = process.env.PROFILE_APP_URL
    ? `${process.env.PROFILE_APP_URL}`
    : `${localhost}:5000/user-profile`;

  const sidebarAppUrl = process.env.SIDEBAR_APP_URL
    ? `${process.env.SIDEBAR_APP_URL}`
    : `${localhost}:5000/app.html`;

  const { version } = JSON.parse(readFileSync('./package.json').toString());

  // nb. Replace `isProd` with `false` here to test a production build of the client
  // served locally.
  const isProd = process.env.NODE_ENV === 'production';
  const assetRoot = isProd
    ? `https://cdn.hypothes.is/hypothesis/${version}/`
    : `${localhost}:3001/hypothesis/${version}/`;

  const replacements = {
    __ASSET_ROOT__: assetRoot,
    __NOTEBOOK_APP_URL__: notebookAppUrl,
    __PROFILE_APP_URL__: profileAppUrl,
    __SIDEBAR_APP_URL__: sidebarAppUrl,
  };
  const template = readFileSync(src, { encoding: 'utf8' });
  const bootScript = template.replaceAll(
    /"(__[A-Z_0-9]+__)"|'(__[A-Z_0-9]+__)'/g,
    (match, doubleQuoted, singleQuoted) => {
      const name = doubleQuoted || singleQuoted;
      if (!Object.hasOwn(replacements, name)) {
        throw new Error(`Unknown placeholder "${name}" in boot template`);
      }
      return `"${replacements[name]}"`;
    },
  );
  writeFileSync(dest, bootScript);
}
