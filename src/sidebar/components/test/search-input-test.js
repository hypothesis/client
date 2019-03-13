'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

describe('searchInput', function() {
  let fakeStore;

  before(function() {
    angular
      .module('app', [])
      .component('searchInput', require('../search-input'));
  });

  beforeEach(function() {
    fakeStore = { isLoading: sinon.stub().returns(false) };
    angular.mock.module('app', {
      store: fakeStore,
    });
  });

  it('displays the search query', function() {
    const el = util.createDirective(document, 'searchInput', {
      query: 'foo',
    });
    const input = el.find('input')[0];
    assert.equal(input.value, 'foo');
  });

  it('invokes #onSearch() when the query changes', function() {
    const onSearch = sinon.stub();
    const el = util.createDirective(document, 'searchInput', {
      query: 'foo',
      onSearch: {
        args: ['$query'],
        callback: onSearch,
      },
    });
    const input = el.find('input')[0];
    const form = el.find('form');
    input.value = 'new-query';
    form.submit();
    assert.calledWith(onSearch, 'new-query');
  });

  describe('loading indicator', function() {
    it('is hidden when there are no API requests in flight', function() {
      const el = util.createDirective(document, 'search-input', {});
      const spinner = el[0].querySelector('spinner');

      fakeStore.isLoading.returns(false);
      el.scope.$digest();

      assert.equal(util.isHidden(spinner), true);
    });

    it('is visible when there are API requests in flight', function() {
      const el = util.createDirective(document, 'search-input', {});
      const spinner = el[0].querySelector('spinner');

      fakeStore.isLoading.returns(true);
      el.scope.$digest();

      assert.equal(util.isHidden(spinner), false);
    });
  });
});
