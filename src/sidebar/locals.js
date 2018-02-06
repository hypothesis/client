'use strict';

// @ngInject
function locals($rootScope, $locale, $translate) {

  var selectedLanguage;

  // This is just a demonstration for now.
  var availableLocales =
    [{
        id: 'en',
        name: 'English',
    },{
        id: 'ja',
        name: 'Japanese',
    },{
      id: 'zh',
      name: 'Chinese',
    },{
      id: 'ko',
      name: 'Korean',
    },{
      id: 'fr',
      name: 'French',
    }];

  function all(){
    return availableLocales || [];
  }

  // Return the full object for the group with the given id.
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


  function getTranslatedString(listOfString){
    return {'annotateBtnText' : 'Feedback','highlightBtnText' : 'Highlight' };
  }

  return {
    all: all,
    get: get,
    selected: selected,
    select: select,
    getTranslatedString: getTranslatedString,
  };
}

module.exports = locals;
