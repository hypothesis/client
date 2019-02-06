'use strict';

module.exports = function() {
  return {
    link: function(scope, elem, attr) {
      let active = true;
      const html = elem.prop('ownerDocument').documentElement;
      const view = elem.prop('ownerDocument').defaultView;

      function onScroll() {
        const clientHeight = html.clientHeight;
        const scrollHeight = html.scrollHeight;
        if (view.scrollY + clientHeight >= scrollHeight - clientHeight) {
          if (active) {
            active = false;
            scope.$apply(attr.windowScroll);
          }
        } else {
          active = true;
        }
      }

      view.addEventListener('scroll', onScroll, false);

      scope.$on('$destroy', function() {
        view.removeEventListener('scroll', onScroll);
      });
    },
  };
};
