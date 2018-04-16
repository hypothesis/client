var path = require("path")
  // required without immediately passing in original require
  , proxy = require("proxyquireify");

proxy = proxy(require);


var depuno = proxy("./depuno", { path: { extname: function () { return 'blah'; } } });

function foo() {
  var stubs = { './bar': { wunder: function () { return 'bar'; } } }; 
  // required and immediately passing in original require
  var proxy2 = require('proxyquireify')(require)
    , depdos = proxy2('./foo', stubs)
    , deptres = proxy('./foober', { path: { sep: '/' } })
      // depuno proxyquired twice, but is only needed once
    , depquat = proxy2('./depuno', { path: {} })
    ;
}
