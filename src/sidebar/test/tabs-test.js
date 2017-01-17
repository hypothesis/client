'use strict';

var fixtures = require('./annotation-fixtures');
var uiConstants = require('../ui-constants');
var tabs = require('../tabs');
var unroll = require('../../shared/test/util').unroll;

describe('tabs', function () {
  describe('shouldSeparateOrphans', function () {
    it('returns true if the "orphans_tab" flag is enabled', function () {
      var state = {
        session: {
          features: {'orphans_tab': true},
        },
      };
      assert.isTrue(tabs.shouldSeparateOrphans(state));
    });

    it('returns false if the "orphans_tab" flag is not enabled', function () {
      var state = {
        session: {
          features: {'orphans_tab': false},
        },
      };
      assert.isFalse(tabs.shouldSeparateOrphans(state));
    });
  });

  describe('tabForAnnotation', function () {
    unroll('shows annotation in correct tab', function (testCase) {
      var ann = testCase.ann;
      var expectedTab = testCase.expectedTab;
      assert.equal(tabs.tabForAnnotation(ann, true /* separateOrphans */), expectedTab);
    }, [{
      ann: fixtures.defaultAnnotation(),
      expectedTab: uiConstants.TAB_ANNOTATIONS,
    },{
      ann: fixtures.oldPageNote(),
      expectedTab: uiConstants.TAB_NOTES,
    },{
      ann: Object.assign(fixtures.defaultAnnotation(), {$orphan: true}),
      expectedTab: uiConstants.TAB_ORPHANS,
    }]);
  });

  describe('shouldShowInTab', function () {
    unroll('returns true if the annotation should be shown', function (testCase) {
      var ann = fixtures.defaultAnnotation();
      ann.$anchorTimeout = testCase.anchorTimeout;
      ann.$orphan = testCase.orphan;

      assert.equal(tabs.shouldShowInTab(ann, uiConstants.TAB_ANNOTATIONS,
        testCase.separateOrphans), testCase.expectedTab === uiConstants.TAB_ANNOTATIONS);
      assert.equal(tabs.shouldShowInTab(ann, uiConstants.TAB_ORPHANS,
        testCase.separateOrphans), testCase.expectedTab === uiConstants.TAB_ORPHANS);
    }, [{
      // Orphans tab disabled, anchoring in progress.
      anchorTimeout: false,
      orphan: undefined,
      separateOrphans: false,
      expectedTab: uiConstants.TAB_ANNOTATIONS,
    },{
      // Orphans tab disabled, anchoring succeeded.
      anchorTimeout: false,
      orphan: false,
      separateOrphans: false,
      expectedTab: uiConstants.TAB_ANNOTATIONS,
    },{
      // Orphans tab disabled, anchoring failed
      anchorTimeout: false,
      orphan: true,
      separateOrphans: false,
      expectedTab: uiConstants.TAB_ANNOTATIONS,
    },{
      // Orphans tab enabled, anchoring in progress.
      anchorTimeout: false,
      orphan: undefined,
      separateOrphans: true,
      expectedTab: null,
    },{
      // Orphans tab enabled, anchoring succeeded.
      anchorTimeout: false,
      orphan: false,
      separateOrphans: true,
      expectedTab: uiConstants.TAB_ANNOTATIONS,
    },{
      // Orphans tab enabled, anchoring failed.
      anchorTimeout: false,
      orphan: true,
      separateOrphans: true,
      expectedTab: uiConstants.TAB_ORPHANS,
    },{
      // Orphans tab enabled, anchoring timed out.
      anchorTimeout: true,
      orphan: undefined,
      separateOrphans: true,
      expectedTab: uiConstants.TAB_ANNOTATIONS,
    },{
      // Orphans tab enabled, anchoring initially timed out but eventually
      // failed.
      anchorTimeout: true,
      orphan: true,
      separateOrphans: true,
      expectedTab: uiConstants.TAB_ORPHANS,
    }]);
  });

  describe('counts', function () {
    var annotation = Object.assign(fixtures.defaultAnnotation(), {$orphan:false});
    var orphan = Object.assign(fixtures.defaultAnnotation(), {$orphan:true});

    it('counts Annotations and Orphans together when the Orphans tab is not enabled', function () {
      assert.deepEqual(tabs.counts([annotation, orphan], false), {
        anchoring: 0,
        annotations: 2,
        notes: 0,
        orphans: 0,
      });
    });

    it('counts Annotations and Orphans separately when the Orphans tab is enabled', function () {
      assert.deepEqual(tabs.counts([annotation, orphan], true), {
        anchoring: 0,
        annotations: 1,
        notes: 0,
        orphans: 1,
      });
    });
  });
});
