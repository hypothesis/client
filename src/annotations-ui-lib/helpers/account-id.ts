/**
 * Build H account names of the form 'acct:<username>@<provider>'
 * from a username and provider.
 */
export function buildAccountID(username: string, provider: string): string {
  return `acct:${username}@${provider}`;
}

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
