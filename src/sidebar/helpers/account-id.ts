/**
 * Parses H account names of the form 'acct:<username>@<provider>'
 * into a {username, provider} object or null if the input does not
 * match the expected form.
 */
export function parseAccountID(user: string | null) {
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
 */
export function username(user: string | null) {
  const account = parseAccountID(user);
  if (!account) {
    return '';
  }
  return account.username;
}

/**
 * Returns true if the user's provider (authority) differs from the default
 * authority for the application.
 *
 * @param defaultAuthority - The application's default authority (user identity provider)
 */
export function isThirdPartyUser(
  user: string | null,
  defaultAuthority: string
) {
  const account = parseAccountID(user);

  if (!account) {
    return false;
  }

  return account.provider !== defaultAuthority;
}
