'use strict';

const fixtures = require('../../test/annotation-fixtures');
const uiConstants = require('../../ui-constants');
const tabs = require('../tabs');
const unroll = require('../../../shared/test/util').unroll;

describe('tabs', function() {
  describe('tabForAnnotation', function() {
    unroll(
      'shows annotation in correct tab',
      function(testCase) {
        const ann = testCase.ann;
        const expectedTab = testCase.expectedTab;
        assert.equal(tabs.tabForAnnotation(ann), expectedTab);
      },
      [
        {
          ann: fixtures.defaultAnnotation(),
          expectedTab: uiConstants.TAB_ANNOTATIONS,
        },
        {
          ann: fixtures.oldPageNote(),
          expectedTab: uiConstants.TAB_NOTES,
        },
        {
          ann: Object.assign(fixtures.defaultAnnotation(), { $orphan: true }),
          expectedTab: uiConstants.TAB_ORPHANS,
        },
      ]
    );
  });

  describe('shouldShowInTab', function() {
    unroll(
      'returns true if the annotation should be shown',
      function(testCase) {
        const ann = fixtures.defaultAnnotation();
        ann.$anchorTimeout = testCase.anchorTimeout;
        ann.$orphan = testCase.orphan;

        assert.equal(
          tabs.shouldShowInTab(ann, uiConstants.TAB_ANNOTATIONS),
          testCase.expectedTab === uiConstants.TAB_ANNOTATIONS
        );
        assert.equal(
          tabs.shouldShowInTab(ann, uiConstants.TAB_ORPHANS),
          testCase.expectedTab === uiConstants.TAB_ORPHANS
        );
      },
      [
        {
          // Anchoring in progress.
          anchorTimeout: false,
          orphan: undefined,
          expectedTab: null,
        },
        {
          // Anchoring succeeded.
          anchorTimeout: false,
          orphan: false,
          expectedTab: uiConstants.TAB_ANNOTATIONS,
        },
        {
          // Anchoring failed.
          anchorTimeout: false,
          orphan: true,
          expectedTab: uiConstants.TAB_ORPHANS,
        },
        {
          // Anchoring timed out.
          anchorTimeout: true,
          orphan: undefined,
          expectedTab: uiConstants.TAB_ANNOTATIONS,
        },
        {
          // Anchoring initially timed out but eventually
          // failed.
          anchorTimeout: true,
          orphan: true,
          expectedTab: uiConstants.TAB_ORPHANS,
        },
      ]
    );
  });
});
