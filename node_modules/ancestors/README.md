# ancestors

[![browser support](http://ci.testling.com/chrisdickinson/ancestors.png)](http://ci.testling.com/chrisdickinson/ancestors)


return a list of a node's ancestors, optionally filtered with a provided function.

```javascript

var parents = require('ancestors')
  , el = document.getElementById('target')


var p = parents(el)
// [list, of, parent, elements]

var p = parents(el, function(node) { return node.tagName == 'div' })
// [list, of, parent, div, elements] 

``` 

# API

## parents(element[, filterFunction]) -> [list of elements]

# License

MIT
