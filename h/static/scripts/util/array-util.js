'use strict';

function countIf(ary, predicate) {
  return ary.reduce(function (count, item) {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

module.exports = {
  countIf: countIf,
};
