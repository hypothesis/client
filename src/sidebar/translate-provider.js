'use strict';
/**
 * @name  translate
 *
 * @description Angular $translateProvider service
 */
function translate(translateProvider){

  // Seperated translation files for all supported language.
  translateProvider
    .translations('en', require('./translations/english_en.json'));
    // .translations('ja', require('./translations/japanese_ja.json'))

  translateProvider.preferredLanguage('en');
}

module.exports = {
  translate: translate,
};