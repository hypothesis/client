'use strict';

var _ = require('underscore');
var $ = require('jquery');
// var lib = require('chrome_lib');
setTimeout(function () {
  var $hypothesis = $('.annotator-frame.annotator-outer');
  var breadcrumbsLoaded = false;
  var $tocToggle = $('.toc-toggle');
  var $docWrapper = $('.doc-wrapper');
  var $container = $('.rh_docs > .container');
  var offsetBuffer = 16;

  $hypothesis.css({
    marginLeft: '-300px',
    height: '100vh',
    position: 'absolute'
  });

  function getTop() {
    return $docWrapper.offset().top - offsetBuffer;
  }

  // Get bottom of the page so TOC knows when to stop.
  function getBottom() {
    return $docWrapper.height() + $docWrapper.offset().top - $hypothesis.height() - parseInt($hypothesis.css('padding-top'), 10) - parseInt($hypothesis.css('padding-bottom'), 10);
  }

  var windowHeight = $(window).height() - offsetBuffer * 2;
  var docWrapperHeight = $docWrapper.height();

  function init() {
    if (windowHeight < docWrapperHeight) {
      $hypothesis.css({
        height: windowHeight
      });
    } else {
      $hypothesis.css({
        height: docWrapperHeight
      });
    }
  }

  function scrollHandler() {
    if (windowHeight >= docWrapperHeight) {
      return;
    }

    var $marginRight = $container.offset().left;

    if (window.scrollY >= getTop()) {
      $hypothesis.css({
        top: '15px',
        position: 'fixed',
        right: $marginRight,
        left: 'auto'
      });
    }

    if (window.scrollY < getTop()) {
      $hypothesis.css({
        top: '',
        position: 'absolute',
        right: 0
      });
    }

    if (window.scrollY >= getBottom()) {
      $hypothesis.css({
        top: getBottom() - getTop(),
        position: 'absolute',
        right: 0
      });
    }
  }

  // Listen clcik events on tocToggle, if any attempt to open it when sidebar is open, close the sidebar.
  $tocToggle.on('click', function(){
    var sidebar = $('[name=hyp_sidebar_frame]');
    var toolbar = $('.annotator-toolbar');
    if (sidebar[0].style.display !== 'none'){
      sidebar[0].style.display = 'none';
      toolbar[0].style.display = '';
    }
  });

  $(window).on('scroll', _.throttle(scrollHandler.bind(this), 20));
  $(window).on('resize', _.throttle(init.bind(this)));
  init();
  scrollHandler();
}, 1000);
