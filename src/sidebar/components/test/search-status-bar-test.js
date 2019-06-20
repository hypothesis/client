'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

describe('searchStatusBar', () => {
  before(() => {
    angular
      .module('app', [])
      .component('searchStatusBar', require('../search-status-bar'));
  });

  let fakeRootThread;
  let fakeStore;

  beforeEach(() => {
    fakeRootThread = {
      thread: sinon.stub(),
    };
    fakeStore = {
      getState: sinon.stub(),
      selectTab: sinon.stub(),
      clearSelectedAnnotations: sinon.stub(),
      clearDirectLinkedGroupFetchFailed: sinon.stub(),
      clearDirectLinkedIds: sinon.stub(),
      clearSelection: sinon.stub(),
    };
    angular.mock.module('app', {
      store: fakeStore,
      rootThread: fakeRootThread,
    });
  });

  describe('filterQuery', () => {
    ['tag:foo', null].forEach(filterQuery => {
      it('returns the `filterQuery`', () => {
        fakeStore.getState.returns({ filterQuery });

        const elem = util.createDirective(document, 'searchStatusBar', {});
        const ctrl = elem.ctrl;

        assert.equal(ctrl.filterQuery(), filterQuery);
      });
    });
  });

  describe('filterActive', () => {
    it('returns true if there is a `filterQuery`', () => {
      fakeStore.getState.returns({ filterQuery: 'tag:foo' });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.isTrue(ctrl.filterActive());
    });

    it('returns false if `filterQuery` is null', () => {
      fakeStore.getState.returns({ filterQuery: null });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.isFalse(ctrl.filterActive());
    });
  });

  describe('filterMatchCount', () => {
    it('returns the total number of visible annotations or replies', () => {
      fakeRootThread.thread.returns({
        children: [
          {
            id: '1',
            visible: true,
            children: [{ id: '3', visible: true, children: [] }],
          },
          {
            id: '2',
            visible: false,
            children: [],
          },
        ],
      });
      fakeStore.getState.returns({
        filterQuery: 'tag:foo',
      });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.equal(ctrl.filterMatchCount(), 2);
    });
  });

  describe('areAllAnnotationsVisible', () => {
    it('returns true if the direct-linked group fetch failed', () => {
      fakeStore.getState.returns({ directLinkedGroupFetchFailed: true });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.isTrue(ctrl.areAllAnnotationsVisible());
    });

    it('returns true if there are annotations selected', () => {
      fakeStore.getState.returns({
        directLinkedGroupFetchFailed: false,
        selectedAnnotationMap: { ann: true },
      });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.isTrue(ctrl.areAllAnnotationsVisible());
    });

    it('returns false if there are no annotations selected', () => {
      fakeStore.getState.returns({
        directLinkedGroupFetchFailed: false,
        selectedAnnotationMap: {},
      });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.isFalse(ctrl.areAllAnnotationsVisible());
    });

    it('returns false if the `selectedAnnotationMap` is null', () => {
      fakeStore.getState.returns({
        directLinkedGroupFetchFailed: false,
        selectedAnnotationMap: null,
      });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      const ctrl = elem.ctrl;

      assert.isFalse(ctrl.areAllAnnotationsVisible());
    });
  });

  context('when there is a filter', () => {
    it('should display the filter count', () => {
      fakeRootThread.thread.returns({
        children: [
          {
            id: '1',
            visible: true,
            children: [{ id: '3', visible: true, children: [] }],
          },
          {
            id: '2',
            visible: false,
            children: [],
          },
        ],
      });

      fakeStore.getState.returns({
        filterQuery: 'tag:foo',
      });

      const elem = util.createDirective(document, 'searchStatusBar', {});
      assert.include(elem[0].textContent, '2 search results');
    });
  });

  context('when there is a selection', () => {
    it('should display the "Show all annotations (2)" message when there are 2 annotations', () => {
      const msg = 'Show all annotations';
      const msgCount = '(2)';
      fakeStore.getState.returns({
        selectedAnnotationMap: { ann1: true },
      });
      const elem = util.createDirective(document, 'searchStatusBar', {
        totalAnnotations: 2,
        selectedTab: 'annotation',
      });
      const clearBtn = elem[0].querySelector('button');
      assert.include(clearBtn.textContent, msg);
      assert.include(clearBtn.textContent, msgCount);
    });

    it('should display the "Show all notes (3)" message when there are 3 notes', () => {
      const msg = 'Show all notes';
      const msgCount = '(3)';
      fakeStore.getState.returns({
        selectedAnnotationMap: { ann1: true },
      });
      const elem = util.createDirective(document, 'searchStatusBar', {
        totalNotes: 3,
        selectedTab: 'note',
      });
      const clearBtn = elem[0].querySelector('button');
      assert.include(clearBtn.textContent, msg);
      assert.include(clearBtn.textContent, msgCount);
    });
  });
});
