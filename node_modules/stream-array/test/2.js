var test = require('tape')
    , streamify = require('..')
    , concat = require('concat-stream')
;

test('empty array', function(t) {
    var s = streamify([]);

    s.pipe(concat({encoding: 'object'}, function(res) {
        t.equal(1, arguments.length, 'concat returns 1 arg');
        t.equal(0, res.length, 'result is an empty list');
        t.deepEqual([], res, 'result matches expectation');
        t.end();
    }));
});

test('array of strings', function(t) {
    var s = streamify(['1', '2', '3', 'Four']);

    s.pipe(concat(function(res) {
        t.equal(1, arguments.length, 'concat returns 1 arg');
        t.equal('123Four', res.toString(), 'result matches expectation');
        t.end();
    }));
});

test('array of buffers', function(t) {
    var s = streamify([new Buffer('One'), new Buffer('Two')]);

    s.pipe(concat(function(res) {
        t.equal(1, arguments.length, 'concat returns 1 arg');
        t.equal('OneTwo', res.toString(), 'result matches expectation');
        t.end();
    }));
});
