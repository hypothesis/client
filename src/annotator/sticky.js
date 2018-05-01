'use strict';

var _ = require('underscore');
var $ = require('jquery');
// var lib = require('chrome_lib');
setTimeout(function () {
  var $hypothesis = $('.annotator-frame.annotator-outer');
  var breadcrumbsLoaded = false;
  var $tocMain = $('#toc-main');
  var $tocMenu = $('.toc-menu');
  var $tocShow = $('.toc-show');
  var $tocToggle = $('.toc-toggle');
  var $docWrapper = $('.doc-wrapper');
  var $docOptions = $('.doc-options');
  var $container = $('.rh_docs > .container');
  var offsetBuffer = 15;

  $hypothesis.css({
    marginLeft: '-300px',
  });

  if ($hypothesis.outerHeight(true) >= $(window).height() - offsetBuffer * 2) {
    $hypothesis.height($(window).height() - offsetBuffer * 2);
  }
  //
  $(window).on('resize', _.throttle(resizeHandler.bind(this)));
  function resizeHandler(){
    var $marginRight = $container.css('marginRight');
    var $sidebarPosition = $hypothesis.css('position');
    if($sidebarPosition === 'absolute'){
      $marginRight = '0px';
    }
    $hypothesis.css({
      right: $marginRight,
      left: 'auto',
    });
  }

  (function ($) {
    // Handles all the scrolling and modifying as the user scrolls.
    $.fn.rhAffixHypothsis = function (options) {
      var settings = $.extend(true, {
        offset: {
          top: 0,
          bottom: $(document).height(),
        },
      }, options);

      $(window).on('scroll', _.throttle(scrollHandler.bind(this), 20));

      function scrollHandler() {
        var top = (typeof settings.offset.top === 'function') ? settings.offset.top() : settings.offset.top;
        var bottom = (typeof settings.offset.bottom === 'function') ? settings.offset.bottom() : settings.offset.bottom;
        var $marginRight = $container.css('marginRight');

        if (bottom > window.scrollY && window.scrollY > top) {
          this.css({
            top: '15px',
            position: 'fixed',
            right: $marginRight,
            left: 'auto',
          });

          this.addClass('affix').removeClass('affix-top affix-bottom');
        }
        else if (window.scrollY >= bottom) {
          this.css({
            top: bottom - top,
            position: 'absolute',
            right: 0,
          });
          this.addClass('affix-bottom').removeClass('affix-top affix');
        }
        else {
          this.css({
            top: '',
            position: 'absolute',
            right: 0,
          });
          this.addClass('affix-top').removeClass('affix affix-bottom');
        }
      }

      scrollHandler.call(this);

      return this;
    };
  }($));

  function getTop() {
    return $docWrapper.offset().top - offsetBuffer;
  }

  // Get bottom of the page so TOC knows when to stop.
  function getBottom() {
    return $docWrapper.height() + $docWrapper.offset().top - $hypothesis.height() - parseInt($hypothesis.css('padding-top'), 10) - parseInt($hypothesis.css('padding-bottom'), 10);
  }
  if ($hypothesis.outerHeight(true) >= $(window).height() - offsetBuffer * 2) {
    $hypothesis.height($(window).height() - offsetBuffer * 2);
  }

  // On first load set height of the menu list <ol>.
  // $olMenu.first().css('height', parseInt($tocMenu.height() - (parseInt($docOptions.css('margin-bottom'), 10) + $docOptions.height())), 10);

  if ($hypothesis.outerHeight(true) < $docWrapper.height()) {
    $hypothesis.rhAffixHypothsis({
      offset: {
        top: getTop,
        bottom: getBottom,
      },
    });
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


}, 3000);
