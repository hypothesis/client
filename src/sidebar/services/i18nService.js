'use strict';
const i18next = require('i18next');
const moment = require('moment');

/**
 * A wrapper around the i18n
 */
// @ngInject
function i18nService($rootScope, localStorage = window.localStorage) {
  const fallbackLanguage = 'en-US';
  const languageMapInsperaToIetf = {
      en_us: 'en-US',
      no_no: 'nb-NO',
      no_ny: 'nn-NO',
      no_no_ny: 'nn-NO',
      pl_pl: 'pl-PL',
      sv_se: 'sv-SE',
      es_co: 'es-CO',
  };
  const languageMapIdToIetf = {
      1: 'nb-NO',
      2: 'en-US',
      3: 'nn-NO',
      7: 'sv-SE',
      11: 'es-CO',
      12: 'pl-PL',
  };
  const supportedLanguages = {
      'en-US': 'English',
      'nb-NO': 'Norsk - bokmål',
      'nn-NO': 'Norsk - nynorsk',
      'pl-PL': 'Polski',
      'sv-SE': 'Svenska',
      'es-CO': 'Español de América Latina',
  };
  function loadResourceBundle() {
    return require('../../../i18n/index.json');
  }
  function getCurrentLanguageId(currentLanguage) {
    return Object.keys(languageMapIdToIetf).find(
      key => languageMapIdToIetf[key] === currentLanguage
    );
  }
  function getCurrentLanguageKey(currentLanguage) {
    return Object.keys(languageMapInsperaToIetf).find(
      key => languageMapInsperaToIetf[key] === currentLanguage
    );
  }
  function getIetfLanguageCode(languageCode) {
    if (supportedLanguages[languageCode]) {
      return languageCode;
    }
    if (languageMapInsperaToIetf[languageCode]) {
      return languageMapInsperaToIetf[languageCode];
    }

    return undefined;
  }

  /**
   * Gets the language code to use for translations.
   * It may be in the languageId param.
   * If not, a fallback language is used.
   */
  function getInitialLanguage() {
    const languageFromLocalStorage =
      languageMapInsperaToIetf[localStorage.getItem('locale')];
    let locale = fallbackLanguage;
    if (
        languageFromLocalStorage &&
        supportedLanguages[languageFromLocalStorage]
    ) {
      locale = languageFromLocalStorage;
    }

    return locale;
  }

  function initI18n() {
    const locale = getInitialLanguage();
    const languageCode = getIetfLanguageCode(locale);
    const resources = loadResourceBundle();

    moment.locale(locale);

    if ($rootScope) {
        $rootScope.$watch(function() { return localStorage.getItem('locale'); }, function(newValue) {
            changeLanguage(getIetfLanguageCode(newValue));
        });
    }

    i18next.init({
      resources,
      lng: languageCode,
      interpolation: {prefix: '__', suffix: '__'},
    });
  }

  function changeLanguage(language, callback) {
    i18next.changeLanguage(language, callback);
  }

  function translate(key, options) {
    return i18next.t(key, options);
  }

  function tl(key, options, fallback) {
    if (fallback && !i18next.exists(key)) {
      return fallback;
    }
    return translate(key, options);
  }

  return {
      tl: tl,
      initI18n: initI18n,
      getCurrentLanguageId: getCurrentLanguageId,
      getCurrentLanguageKey: getCurrentLanguageKey,
      changeLanguage: changeLanguage,
  };
}

module.exports = i18nService;
