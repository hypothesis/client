// https://html.spec.whatwg.org/multipage/infrastructure.html#document-base-url
module.exports = (function () {
  var baseURI = document.baseURI;

  if (!baseURI) {
    var baseEls = document.getElementsByTagName('base');
    for (var i = 0 ; i < baseEls.length ; i++) {
      if (!!baseEls[i].href) {
        baseURI = baseEls[i].href;
        break;
      }
    }
  }

  return (baseURI || document.documentURI);
})();
