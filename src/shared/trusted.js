/**
 * Wrap `markup` to indicate that it came from a trusted source
 * (ie. not unsanitized user input)
 *
 * @param  {string} markup - Resource object to wrap
 * @return {object} - An object with a  `trustedHTML` property whose value is `markup`.
 */
function trustMarkup(markup) {
  return { trustedHTML: markup };
}

export { trustMarkup };
