'use strict';

var events = require('../events');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function ($rootScope, annotationUI) {
    this.onNewNoteBtnClick = function(){
      var topLevelFrame = annotationUI.frames().find(f=>!f.id);
      var annot = {
        target: [],
        uri: topLevelFrame.uri,
      };

      $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
    };
  },
  bindings: {
  },
  template: require('../templates/new-note-btn.html'),
};
