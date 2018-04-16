var test = require('tape')
    , streamify = require('..')
;

test('ctor', function(t) {
    t.throws(function() {
        streamify();
    }, 'throws: no argument');

    [null, undefined, 1, NaN, 'string', new Object(), function(){}].forEach(
        function(item) {
            t.throws(function() {
                streamify(item);
            }, 'throws: ' + (!item? 'null/undefined' : item.toString()));
        }
    );

    [[], [1], [1,2], ['1', '2'], [new Buffer('asdf')]].forEach(
        function(item) {
            t.doesNotThrow(function() {
                streamify(item);
            }, 'accepts: ' + item.toString());
        }
    );

    t.end();
});
