'use strict';

module.exports = {
  debug: debug,
};

// angular template filter to debug a variable - i.e. console.debug and return string representation
function debug(input) {
  // eslint-disable-next-line no-console
  console.debug('debug filter', input);
  if (input === '') { return 'empty string'; }
  return input ? input : ('' + input);
}
