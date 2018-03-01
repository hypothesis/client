/* jshint node: true */
'use strict';
var Polyglot = require('node-polyglot');
var configFrom = require('../annotator/config/index');

function polyglot(){
  // Default Language Settings
  let phrases = {};
  // NOTE : This is a temporary solution. We get the locale value from the script but it's
  // going to be fetched from the cookie. It's not going to affect how you receive and mine the data
  let locale = configFrom(window).locale || 'en';

  function getValidPhrases(locale) {
    return {
      'en': require('../sidebar/translations/english_en'),
      'ja': require('../sidebar/translations/japanese_ja'),
    }[locale];
  }

  phrases = getValidPhrases(locale);

  return new Polyglot({ locale:locale, phrases});

}
module.exports = polyglot;

