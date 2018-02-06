'use strict';

// @ngInject
function LanguageListController(locals) {

  this.languages = locals;

  this.selectLanguage = function (languageId) {
    locals.select(languageId);
  };
}

module.exports = {
  controller: LanguageListController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
  },
  template: require('../templates/language-list.html'),
};
