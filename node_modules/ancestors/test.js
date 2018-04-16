var test = require('tape')
  , parents = require('./index')

var setup = typeof window === 'undefined' ? setup_node : setup_dom

test("finds expected list of items", function(t) {
  var num = 10 + ~~(Math.random() * 10)
    , el = setup(num)

  t.equal(parents(el).length, num)
  t.end()
})

test("filters expected list of items", function(t) {
  var num = 10 + ~~(Math.random() * 10)
    , el = setup(num)
    , remove = num - 1

  t.equal(parents(el, filter).length, num - 2)
  t.end()

  function filter() {
    return !!--remove
  }
})


function setup_node(n) {
  var el = {}
    , current = el

  for(var i = 0; i < n; ++i) {
    current = current.parentNode = {}
  }

  return el
}

function setup_dom(n) {
  var el = document.createElement('div')
    , current = el
    , next

  for(var i = 0; i < n; ++i) {
    next = document.createElement('div')
    next.appendChild(current)
    current = next
  }

  return el
}
