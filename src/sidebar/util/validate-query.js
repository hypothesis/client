'use strict';

// A set of functions to prepare a query from a url request
//
// These functions take values from var annotations
// produced in a url fragment
// ( e.g. http://www.example.com/path/to/file
//        #annotations:query__user__username)
// in settings
// and converts it to a search query, detecting
// tags like "user:", "any:" and "tag:".
//

function returnQueryFromAnnotationFragment (query){
  var result = null;
  try {
    if (query) {
      result = query.replace(/(user|any|tag|text):/gi,
                                    function (tag) {
                                     // temporarily fix bug where
                                     // any:term does not work
                                      if (tag === 'any:') {
                                        return ' ' + tag + ' ';
                                      } else {
                                        return ' ' + tag;
                                      }
                                    }).trim();
    }
  } catch (e) {
    result = null;
  }
  return (result);
}

module.exports = returnQueryFromAnnotationFragment;
