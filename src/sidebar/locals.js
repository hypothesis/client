'use strict';

/**
 * @ngdoc service
 * @name  locals
 *
 * @description Provides access to the list of languages that are supported
 *              and the currently selected language in the UI.
 */
// @ngInject
function locals($translate) {
  var selectedLanguage;

  var availableLocales =
    [{
        id: 'en',
        name: 'English',
    },{
        id: 'ja',
        name: 'Japanese',
    }];

  function all(){
    return availableLocales || [];
  }

  function get(id) {
    var gs = all();
    for (var i = 0, max = gs.length; i < max; i++) {
      if (gs[i].id === id) {
        return gs[i];
      }
    }
    return null;
  }

  function selected() {
    if (selectedLanguage) {
      return selectedLanguage;
    }
    return all()[0];
  }

  function select(id) {
    var prevSelected = selected();
    var g = get(id);
    if (g) {
      selectedLanguage = g;
      if (prevSelected.id !== selectedLanguage.id) {
        $translate.use(id);
      }
    }
  }

  return {
    all: all,
    get: get,
    selected: selected,
    select: select,
  };
}

module.exports = locals;
