+function() {

if (window.foostats) return;

var fooRequires = 0;
window.foostats = {
    fooRequires: function () { return fooRequires; }
  , incFooRequires: function () { fooRequires++; }
  , reset: function () { fooRequires = 0; }
};

}();
