import { settingsFrom, $imports } from '../settings';

describe('annotator/config/settingsFrom', () => {
  let fakeConfigFuncSettingsFrom;
  let fakeParseJsonConfig;
  let fakeUrlFromLinkTag;

  beforeEach(() => {
    fakeConfigFuncSettingsFrom = sinon.stub().returns({});
    fakeUrlFromLinkTag = sinon.stub().returns('http://example.com/app.html');
    fakeParseJsonConfig = sinon.stub().returns({});

    $imports.$mock({
      './config-func-settings-from': {
        configFuncSettingsFrom: fakeConfigFuncSettingsFrom,
      },
      './url-from-link-tag': {
        urlFromLinkTag: fakeUrlFromLinkTag,
      },
      '../../boot/parse-json-config': { parseJsonConfig: fakeParseJsonConfig },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('#notebookAppUrl', () => {
    it('calls urlFromLinkTag with appropriate params', () => {
      assert.equal(
        settingsFrom(window).notebookAppUrl,
        'http://example.com/app.html',
      );
      assert.calledWith(fakeUrlFromLinkTag, window, 'notebook', 'html');
    });
  });

  describe('#profileAppUrl', () => {
    it('calls urlFromLinkTag with appropriate params', () => {
      assert.equal(
        settingsFrom(window).profileAppUrl,
        'http://example.com/app.html',
      );
      assert.calledWith(fakeUrlFromLinkTag, window, 'profile', 'html');
    });
  });

  describe('#sidebarAppUrl', () => {
    it('calls urlFromLinkTag with appropriate params', () => {
      assert.equal(
        settingsFrom(window).sidebarAppUrl,
        'http://example.com/app.html',
      );
      assert.calledWith(fakeUrlFromLinkTag, window, 'sidebar', 'html');
    });
  });

  describe('#clientUrl', () => {
    it('calls urlFromLinkTag with appropriate params', () => {
      assert.equal(
        settingsFrom(window).clientUrl,
        'http://example.com/app.html',
      );
      assert.calledWith(
        fakeUrlFromLinkTag,
        window,
        'hypothesis-client',
        'javascript',
      );
    });
  });

  function fakeWindow(href) {
    return {
      location: {
        href,
      },
      document: {
        querySelector: sinon.stub().returns({ href: 'hi' }),
      },
    };
  }

  describe('#annotations', () => {
    context(
      'when the host page has a js-hypothesis-config with an annotations setting',
      () => {
        beforeEach(() => {
          fakeParseJsonConfig.returns({
            annotations: 'annotationsFromJSON',
          });
        });

        it('returns the annotations from the js-hypothesis-config script', () => {
          assert.equal(
            settingsFrom(fakeWindow()).annotations,
            'annotationsFromJSON',
          );
        });

        context(
          "when there's also an `annotations` in the URL fragment",
          () => {
            it('overrides URLs with js-hypothesis-config annotations', () => {
              const window_ = fakeWindow(
                'http://localhost:3000#annotations:annotationsFromURL',
              );

              assert.equal(
                settingsFrom(window_).annotations,
                'annotationsFromJSON',
              );
            });
          },
        );
      },
    );

    [
      {
        describe: "when there's a valid #annotations:<ID> fragment",
        it: 'returns an object containing the annotation ID',
        url: 'http://localhost:3000#annotations:alphanum3ric_-only',
        returns: 'alphanum3ric_-only',
      },
      {
        describe: "when there's a non-alphanumeric annotation ID",
        it: 'returns null',
        url: 'http://localhost:3000#annotations:not%20alphanumeric',
        returns: null,
      },
      {
        describe: "when there's an unrecognised URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000#unknown',
        returns: null,
      },
      {
        describe: "when there's no URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000',
        returns: null,
      },
    ].forEach(test => {
      describe(test.describe, () => {
        it(test.it, () => {
          assert.deepEqual(
            settingsFrom(fakeWindow(test.url)).annotations,
            test.returns,
          );
        });
      });
    });
  });

  [
    {
      description:
        "returns an object with the group ID when there's a valid #annotations:group:<ID> fragment",
      url: 'http://localhost:3000#annotations:group:alphanum3ric_-only',
      returns: 'alphanum3ric_-only',
    },
    {
      description: "returns null when there's a non-alphanumeric group ID",
      url: 'http://localhost:3000#annotations:group:not%20alphanumeric',
      returns: null,
    },
    {
      description: "return null when there's an empty group ID",
      url: 'http://localhost:3000#annotations:group:',
      returns: null,
    },
  ].forEach(test => {
    it(test.description, () => {
      assert.deepEqual(settingsFrom(fakeWindow(test.url)).group, test.returns);
    });
  });

  describe('#query', () => {
    context(
      'when the host page has a js-hypothesis-config with a query setting',
      () => {
        beforeEach(() => {
          fakeParseJsonConfig.returns({
            query: 'queryFromJSON',
          });
        });

        it('returns the query from the js-hypothesis-config script', () => {
          assert.equal(settingsFrom(fakeWindow()).query, 'queryFromJSON');
        });

        context("when there's also a query in the URL fragment", () => {
          it('overrides URL query with js-hypothesis-config ones', () => {
            const window_ = fakeWindow(
              'http://localhost:3000#annotations:query:queryFromUrl',
            );

            assert.equal(settingsFrom(window_).query, 'queryFromJSON');
          });
        });
      },
    );

    [
      {
        describe: "when there's a #annotations:query:<QUERY> fragment",
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:query:user:fred',
        returns: 'user:fred',
      },
      {
        describe: "when there's a #annotations:q:<QUERY> fragment",
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:q:user:fred',
        returns: 'user:fred',
      },
      {
        describe: "when there's a #annotations:QuerY:<QUERY> fragment",
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:QuerY:user:fred',
        returns: 'user:fred',
      },
      {
        describe: 'when the query contains both a username and a tag',
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:q:user:fred%20tag:foo',
        returns: 'user:fred tag:foo',
      },
      {
        describe: 'when the query contains URI escape sequences',
        it: 'decodes the escape sequences',
        url: 'http://localhost:3000#annotations:query:user%3Ajsmith%20bar',
        returns: 'user:jsmith bar',
      },
      {
        describe: "when there's an unrecognised URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000#unknown',
        returns: null,
      },
      {
        describe: "when there's no URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000',
        returns: null,
      },
    ].forEach(test => {
      describe(test.describe, () => {
        it(test.it, () => {
          assert.deepEqual(
            settingsFrom(fakeWindow(test.url)).query,
            test.returns,
          );
        });
      });
    });

    describe('when the URL contains an invalid fragment', () => {
      it('returns null', () => {
        // An invalid escape sequence which will cause decodeURIComponent() to
        // throw a URIError.
        const invalidFrag = '%aaaaa';

        const url = 'http://localhost:3000#annotations:query:' + invalidFrag;

        assert.isNull(settingsFrom(fakeWindow(url)).query);
      });
    });
  });

  describe('#showHighlights', () => {
    [
      {
        it: 'returns an "always" setting from the host page unmodified',
        input: 'always',
        output: 'always',
      },
      {
        it: 'returns a "never" setting from the host page unmodified',
        input: 'never',
        output: 'never',
      },
      {
        it: 'returns a "whenSidebarOpen" setting from the host page unmodified',
        input: 'whenSidebarOpen',
        output: 'whenSidebarOpen',
      },
      {
        it: 'changes true to "always"',
        input: true,
        output: 'always',
      },
      {
        it: 'changes false to "never"',
        input: false,
        output: 'never',
      },
      {
        it: 'defaults to "always"',
        input: undefined,
        output: 'always',
      },
      {
        it: 'converts invalid values to "always"',
        input: { someInvalidValue: true },
        output: 'always',
      },
    ].forEach(test => {
      it(test.it, () => {
        fakeParseJsonConfig.returns({
          showHighlights: test.input,
        });
        const settings = settingsFrom(fakeWindow());

        assert.deepEqual(settings.showHighlights, test.output);
      });

      it(test.it, () => {
        fakeConfigFuncSettingsFrom.returns({
          showHighlights: test.input,
        });
        const settings = settingsFrom(fakeWindow());

        assert.deepEqual(settings.showHighlights, test.output);
      });
    });

    it("defaults to 'always' if there's no showHighlights setting in the host page", () => {
      assert.equal(settingsFrom(fakeWindow()).showHighlights, 'always');
    });
  });

  describe('#hostPageSetting', () => {
    [
      {
        when: 'the client is embedded in a web page',
        title: 'returns setting values from window.hypothesisConfig()',
        configFuncSettings: { foo: 'configFuncValue' },
        jsonSettings: { foo: 'ignored' }, // hypothesisConfig() overrides js-hypothesis-config
        expected: 'configFuncValue',
      },
      {
        when: 'the client is embedded in a web page',
        title:
          'ignores settings from js-hypothesis-config if `ignoreOtherConfiguration` is present',
        isBrowserExtension: false,
        configFuncSettings: { ignoreOtherConfiguration: '1' },
        jsonSettings: { foo: 'ignored' },
        expected: undefined,
      },
      {
        when: 'the client is embedded in a web page',
        title: 'returns setting values from js-hypothesis-config objects',
        configFuncSettings: {},
        jsonSettings: { foo: 'jsonValue' },
        expected: 'jsonValue',
      },
      {
        when: 'the client is embedded in a web page',
        title:
          'overrides js-hypothesis-config with hypothesisConfig() settings',
        configFuncSettings: { foo: 'configFuncValue' },
        jsonSettings: { foo: 'jsonValue' },
        expected: 'configFuncValue',
      },
      {
        when: 'the client is embedded in a web page',
        title:
          'overrides js-hypothesis-config even with null from hypothesisConfig()',
        configFuncSettings: { foo: null },
        jsonSettings: { foo: 'jsonValue' },
        expected: null,
      },
      {
        when: 'the client is embedded in a web page',
        title:
          'overrides js-hypothesis-config even with undefined from hypothesisConfig()',
        configFuncSettings: { foo: undefined },
        jsonSettings: { foo: 'jsonValue' },
        expected: undefined,
      },
    ].forEach(test => {
      context(test.when, () => {
        it(test.title, () => {
          fakeConfigFuncSettingsFrom.returns(test.configFuncSettings);
          fakeParseJsonConfig.returns(test.jsonSettings);
          const settings = settingsFrom(fakeWindow());
          const setting = settings.hostPageSetting('foo');
          assert.strictEqual(setting, test.expected);
        });
      });
    });
  });

  describe('#sideBySide', () => {
    const fakeIsActive = () => true;

    [
      {
        input: 'foo',
        expectedResult: { mode: 'auto' },
      },
      {
        input: {},
        expectedResult: { mode: 'auto' },
      },
      {
        input: { mode: 'invalid' },
        expectedResult: { mode: 'auto' },
      },
      {
        input: { mode: 'auto' },
        expectedResult: { mode: 'auto' },
      },
      {
        input: { mode: 'auto', isActive: fakeIsActive },
        expectedResult: { mode: 'auto' },
      },
      {
        input: { mode: 'manual', isActive: 42 },
        expectedResult: { mode: 'manual', isActive: undefined },
      },
      {
        input: { mode: 'manual', isActive: fakeIsActive },
        expectedResult: { mode: 'manual', isActive: fakeIsActive },
      },
    ].forEach(({ input, expectedResult }) => {
      it('parses config from script', () => {
        fakeParseJsonConfig.returns({
          sideBySide: input,
        });
        const settings = settingsFrom(fakeWindow());

        assert.deepEqual(settings.sideBySide, expectedResult);
      });

      it('parses config from window', () => {
        fakeConfigFuncSettingsFrom.returns({
          sideBySide: input,
        });
        const settings = settingsFrom(fakeWindow());

        assert.deepEqual(settings.sideBySide, expectedResult);
      });
    });
  });
});
