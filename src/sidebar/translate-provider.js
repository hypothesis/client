'use strict';

function translate(translateProvider){
  // Seperated translation files for all supported language.
  translateProvider
    .translations('en', require('../shared/translations/english_en.json'))
    .translations('ja', require('../shared/translations/japanese_ja.json'))
}

module.exports = {
  translate: translate,
};