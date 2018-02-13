'use strict';

function translate(translateProvider){

  // Seperated translation files for all supported language.
  translateProvider
    .translations('en', require('./translations/english_en.json'))
    .translations('ja', require('./translations/japanese_ja.json'))
    .translations('zh', require('./translations/chinese_zh.json'))
    .translations('ko', require('./translations/korean_ko.json'))
    .translations('fr', require('./translations/french_fr.json'));

  translateProvider.preferredLanguage('en');
}

module.exports = {
  translate: translate,
};