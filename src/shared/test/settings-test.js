'use strict';

const settings = require('../settings');

const sandbox = sinon.sandbox.create();

describe('settings', function() {
  afterEach('reset the sandbox', function() {
    sandbox.restore();
  });

  describe('#jsonConfigsFrom', function() {
    const jsonConfigsFrom = settings.jsonConfigsFrom;

    function appendJSHypothesisConfig(document_, jsonString) {
      const el = document_.createElement('script');
      el.type = 'application/json';
      el.textContent = jsonString;
      el.classList.add('js-hypothesis-config');
      el.classList.add('js-settings-test');
      document_.body.appendChild(el);
    }

    afterEach('remove js-hypothesis-config tags', function() {
      const elements = document.querySelectorAll('.js-settings-test');
      for (let i = 0; i < elements.length; i++) {
        elements[i].remove();
      }
    });

    context('when there are no JSON scripts', function() {
      it('returns {}', function() {
        assert.deepEqual(jsonConfigsFrom(document), {});
      });
    });

    context("when there's JSON scripts with no top-level objects", function() {
      beforeEach('add JSON scripts with no top-level objects', function() {
        appendJSHypothesisConfig(document, 'null');
        appendJSHypothesisConfig(document, '23');
        appendJSHypothesisConfig(document, 'true');
      });

      it('ignores them', function() {
        assert.deepEqual(jsonConfigsFrom(document), {});
      });
    });

    context("when there's a JSON script with a top-level array", function() {
      beforeEach('add a JSON script containing a top-level array', function() {
        appendJSHypothesisConfig(document, '["a", "b", "c"]');
      });

      it('returns the array, parsed into an object', function() {
        assert.deepEqual(jsonConfigsFrom(document), { 0: 'a', 1: 'b', 2: 'c' });
      });
    });

    context("when there's a JSON script with a top-level string", function() {
      beforeEach('add a JSON script with a top-level string', function() {
        appendJSHypothesisConfig(document, '"hi"');
      });

      it('returns the string, parsed into an object', function() {
        assert.deepEqual(jsonConfigsFrom(document), { 0: 'h', 1: 'i' });
      });
    });

    context("when there's a JSON script containing invalid JSON", function() {
      beforeEach('stub console.warn()', function() {
        sandbox.stub(console, 'warn');
      });

      beforeEach('add a JSON script containing invalid JSON', function() {
        appendJSHypothesisConfig(document, 'this is not valid json');
      });

      it('logs a warning', function() {
        jsonConfigsFrom(document);

        assert.called(console.warn);
      });

      it('returns {}', function() {
        assert.deepEqual(jsonConfigsFrom(document), {});
      });

      it('still returns settings from other JSON scripts', function() {
        appendJSHypothesisConfig(document, '{"foo": "FOO", "bar": "BAR"}');

        assert.deepEqual(jsonConfigsFrom(document), { foo: 'FOO', bar: 'BAR' });
      });
    });

    context("when there's a JSON script with an empty object", function() {
      beforeEach('add a JSON script containing an empty object', function() {
        appendJSHypothesisConfig(document, '{}');
      });

      it('ignores it', function() {
        assert.deepEqual(jsonConfigsFrom(document), {});
      });
    });

    context("when there's a JSON script containing some settings", function() {
      beforeEach('add a JSON script containing some settings', function() {
        appendJSHypothesisConfig(document, '{"foo": "FOO", "bar": "BAR"}');
      });

      it('returns the settings', function() {
        assert.deepEqual(jsonConfigsFrom(document), { foo: 'FOO', bar: 'BAR' });
      });
    });

    context('when there are JSON scripts with different settings', function() {
      beforeEach('add some JSON scripts with different settings', function() {
        appendJSHypothesisConfig(document, '{"foo": "FOO"}');
        appendJSHypothesisConfig(document, '{"bar": "BAR"}');
        appendJSHypothesisConfig(document, '{"gar": "GAR"}');
      });

      it('merges them all into one returned object', function() {
        assert.deepEqual(jsonConfigsFrom(document), {
          foo: 'FOO',
          bar: 'BAR',
          gar: 'GAR',
        });
      });
    });

    context('when multiple JSON scripts contain the same setting', function() {
      beforeEach('add some JSON scripts with different settings', function() {
        appendJSHypothesisConfig(document, '{"foo": "first"}');
        appendJSHypothesisConfig(document, '{"foo": "second"}');
        appendJSHypothesisConfig(document, '{"foo": "third"}');
      });

      specify(
        'settings from later in the page override ones from earlier',
        function() {
          assert.equal(jsonConfigsFrom(document).foo, 'third');
        }
      );
    });
  });
});
