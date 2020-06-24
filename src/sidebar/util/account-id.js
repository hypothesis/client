/**
 * Parses H account names of the form 'acct:<username>@<provider>'
 * into a {username, provider} object or null if the input does not
 * match the expected form.
 */
export function parseAccountID(user) {
  if (!user) {
    return null;
  }
  const match = user.match(/^acct:([^@]+)@(.+)/);
  if (!match) {
    return null;
  }
  return {
    username: match[1],
    provider: match[2],
  };
}

/**
 * Returns the username part of an account ID or an empty string.
 *
 * @param {string} user
 */
export function username(user) {
  const account = parseAccountID(user);
  if (!account) {
    return '';
  }
  return account.username;
}

/**
 * Returns true if the authority is of a 3rd party user.
 *
 * @param {string} user
 * @param {string} authDomain
 */
export function isThirdPartyUser(user, authDomain) {
  const account = parseAccountID(user);

  if (!account) {
    return false;
  }

  return account.provider !== authDomain;
}
