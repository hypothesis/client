'use strict';

var mediaEmbedder = require('../media-embedder.js');

describe('media-embedder', function () {
  function domElement (html) {
    var element = document.createElement('div');
    element.innerHTML = html;
    return element;
  }

  it('replaces YouTube watch links with iframes', function () {
    var urls = [
      'https://www.youtube.com/watch?v=QCkm0lL-6lc',
      'https://www.youtube.com/watch/?v=QCkm0lL-6lc',
      'https://www.youtube.com/watch?foo=bar&v=QCkm0lL-6lc',
      'https://www.youtube.com/watch?foo=bar&v=QCkm0lL-6lc&h=j',
      'https://www.youtube.com/watch?v=QCkm0lL-6lc&foo=bar',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME', url);
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc');
    });
  });

  it('allows whitelisted parameters in YouTube watch URLs', function () {
    var urls = [
      'https://www.youtube.com/watch?v=QCkm0lL-6lc&start=5&end=10',
      'https://www.youtube.com/watch?v=QCkm0lL-6lc&end=10&start=5',
      'https://www.youtube.com/watch/?v=QCkm0lL-6lc&end=10&start=5',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME', url);
      // queryString's #stringify sorts keys, so resulting query string
      // will be reliably as follows, regardless of original ordering
      // Note also `v` param is handled elsewhere and is not "allowed" in
      // queryString.
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc?end=10&start=5');
    });
  });

  it('translates YouTube watch `t` param to `start` for embed', function () {
    var urls = [
      'https://www.youtube.com/watch?v=QCkm0lL-6lc&t=5&end=10',
      'https://www.youtube.com/watch?v=QCkm0lL-6lc&end=10&t=5',
      'https://www.youtube.com/watch/?v=QCkm0lL-6lc&end=10&t=5',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME', url);
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc?end=10&start=5');
    });
  });

  it('parses YouTube `t` param values into seconds', function () {
    var cases = [
      ['https://www.youtube.com/watch?v=QCkm0lL-6lc&t=5m',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=300'],
      ['https://www.youtube.com/watch?v=QCkm0lL-6lc&t=1h5m15s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=3915'],
      ['https://www.youtube.com/watch?v=QCkm0lL-6lc&t=20m10s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=1210'],
      ['https://www.youtube.com/watch?v=QCkm0lL-6lc&t=h20m10s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=1210'],
      ['https://www.youtube.com/watch?v=QCkm0lL-6lc&t=1h20s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=3620'],
      ['https://www.youtube.com/watch?v=QCkm0lL-6lc&t=1h20ss',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=3620'],
      ['https://www.youtube.com/watch/?v=QCkm0lL-6lc&t=5s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=5'],
      ['https://www.youtube.com/watch/?v=QCkm0lL-6lc&t=0m5s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=5'],
      ['https://www.youtube.com/watch/?v=QCkm0lL-6lc&t=m5s',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=5'],
      ['https://www.youtube.com/watch/?v=QCkm0lL-6lc&t=10',
       'https://www.youtube.com/embed/QCkm0lL-6lc?start=10'],
    ];
    cases.forEach(function (url) {
      var element = domElement('<a href="' + url[0] + '">' + url[0] + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME', url[0]);
      assert.equal(
        element.children[0].src,
        url[1]);
    });
  });

  it ('excludes non-whitelisted params in YouTube watch links', function () {
    var urls = [
      'https://www.youtube.com/watch?v=QCkm0lL-6lc&start=5&end=10&baz=dingdong',
      'https://www.youtube.com/watch/?v=QCkm0lL-6lc&autoplay=1&end=10&start=5',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME');
      // queryString's #stringify sorts keys, so resulting query string
      // will be reliably as follows, regardless of original ordering
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc?end=10&start=5');
    });
  });

  it('replaces YouTube share links with iframes', function () {
    var urls = [
      'https://youtu.be/QCkm0lL-6lc',
      'https://youtu.be/QCkm0lL-6lc/',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME');
      assert.equal(
        element.children[0].src, 'https://www.youtube.com/embed/QCkm0lL-6lc');
    });
  });

  it ('allows whitelisted parameters in YouTube share links', function () {
    var urls = [
      'https://youtu.be/QCkm0lL-6lc?start=5&end=10',
      'https://youtu.be/QCkm0lL-6lc/?end=10&start=5',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME');
      // queryString's #stringify sorts keys, so resulting query string
      // will be reliably as follows, regardless of original ordering
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc?end=10&start=5');
    });
  });

  it('translates YouTube share URL `t` param to `start` for embed', function () {
    var urls = [
      'https://youtu.be/QCkm0lL-6lc?t=5&end=10',
      'https://youtu.be/QCkm0lL-6lc/?end=10&t=5',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME', url);
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc?end=10&start=5');
    });
  });

  it ('excludes non-whitelisted params in YouTube share links', function () {
    var urls = [
      'https://youtu.be/QCkm0lL-6lc?foo=bar&t=5&end=10&baz=dingdong',
      'https://youtu.be/QCkm0lL-6lc/?autoplay=1&end=10&t=5',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME');
      // queryString's #stringify sorts keys, so resulting query string
      // will be reliably as follows, regardless of original ordering
      assert.equal(
        element.children[0].src,
        'https://www.youtube.com/embed/QCkm0lL-6lc?end=10&start=5');
    });
  });

  it('replaces Vimeo links with iframes', function () {
    var urls = [
      'https://vimeo.com/149000090',
      'https://vimeo.com/149000090/',
      'https://vimeo.com/149000090#fragment',
      'https://vimeo.com/149000090/#fragment',
      'https://vimeo.com/149000090?foo=bar&a=b',
      'https://vimeo.com/149000090/?foo=bar&a=b',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME');
      assert.equal(
        element.children[0].src, 'https://player.vimeo.com/video/149000090');
    });
  });

  it('replaces Vimeo channel links with iframes', function () {
    var urls = [
      'https://vimeo.com/channels/staffpicks/148845534',
      'https://vimeo.com/channels/staffpicks/148845534/',
      'https://vimeo.com/channels/staffpicks/148845534/?q=foo&id=bar',
      'https://vimeo.com/channels/staffpicks/148845534#fragment',
      'https://vimeo.com/channels/staffpicks/148845534/#fragment',
      'https://vimeo.com/channels/staffpicks/148845534?foo=bar&id=1',
      'https://vimeo.com/channels/otherchannel/148845534',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'IFRAME');
      assert.equal(
        element.children[0].src, 'https://player.vimeo.com/video/148845534');
    });
  });

  it('replaces internet archive links with iframes', function () {
    var urls = [
      // Video details page.
      'https://archive.org/details/PATH',
      'https://archive.org/details/PATH?start=360&end=420.3',
      'https://archive.org/details/PATH?start=360&end=420.3&unknownparam=1',

      // TV News Archive video details page.
      'https://archive.org/details/PATH/start/360/end/420.3',
      'https://archive.org/details/PATH/start/360/end/420.3?q=ignoreme',

      // Embed link generated by the "Share" links on the details pages.
      'https://archive.org/embed/PATH?start=360&end=420.3',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.children[0].tagName, 'IFRAME');

      var actual = element.children[0].src;
      var expected = url.indexOf('start') !== -1 ?
        'https://archive.org/embed/PATH?start=360&end=420.3' :
        'https://archive.org/embed/PATH';
      assert.equal(actual, expected);
    });
  });


  it('replaces audio links with html5 audio elements', function() {
    var urls = [
      'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
      'https://archive.org/download/testmp3testfile/mpthreetest.mp3#fragment',
      'https://archive.org/download/testmp3testfile/mpthreetest.mp3?foo=bar&id=1',
      'http://www.music.helsinki.fi/tmt/opetus/uusmedia/esim/a2002011001-e02.wav',
      'http://www.music.helsinki.fi/tmt/opetus/uusmedia/esim/a2002011001-e02.wav#fragment',
      'http://www.music.helsinki.fi/tmt/opetus/uusmedia/esim/a2002011001-e02.wav?foo=bar&id=4',
      'https://www.w3schools.com/html/horse.ogg',
      'https://www.w3schools.com/html/horse.ogg#fragment',
      'https://www.w3schools.com/html/horse.ogg?foo=bar&id=31',
    ];
    urls.forEach(function (url) {
      var element = domElement('<a href="' + url + '">' + url + '</a>');

      mediaEmbedder.replaceLinksWithEmbeds(element);

      assert.equal(element.childElementCount, 1);
      assert.equal(element.children[0].tagName, 'AUDIO');
      assert.equal(element.children[0].src, url.toLowerCase());
    });
  });

  it('does not replace links if the link text is different', function () {
    var url = 'https://youtu.be/QCkm0lL-6lc';
    var element = domElement('<a href="' + url + '">different label</a>');

    mediaEmbedder.replaceLinksWithEmbeds(element);

    assert.equal(element.childElementCount, 1);
    assert.equal(element.children[0].tagName, 'A');
  });

  it('does not replace non-media links', function () {
    var url = 'https://example.com/example.html';
    var element = domElement('<a href="' + url + '">' + url + '</a>');

    mediaEmbedder.replaceLinksWithEmbeds(element);

    assert.equal(element.childElementCount, 1);
    assert.equal(element.children[0].tagName, 'A');
  });

  it('does not mess with the rest of the HTML', function () {
    var url = 'https://www.youtube.com/watch?v=QCkm0lL-6lc';
    var element = domElement(
      '<p>Look at this video:</p>\n\n' +
      '<a href="' + url + '">' + url + '</a>\n\n' +
      '<p>Isn\'t it cool!</p>\n\n');

    mediaEmbedder.replaceLinksWithEmbeds(element);

    assert.equal(element.childElementCount, 3);
    assert.equal(
      element.children[0].outerHTML, '<p>Look at this video:</p>');
    assert.equal(
      element.children[2].outerHTML, '<p>Isn\'t it cool!</p>');
  });

  it('replaces multiple links with multiple embeds', function () {
    var url1 = 'https://www.youtube.com/watch?v=QCkm0lL-6lc';
    var url2 = 'https://youtu.be/abcdefg';
    var element = domElement(
        '<a href="' + url1 + '">' + url1 + '</a>\n\n' +
        '<a href="' + url2 + '">' + url2 + '</a>');

    mediaEmbedder.replaceLinksWithEmbeds(element);

    assert.equal(element.childElementCount, 2);
    assert.equal(element.children[0].tagName, 'IFRAME');
    assert.equal(
      element.children[0].src, 'https://www.youtube.com/embed/QCkm0lL-6lc');
    assert.equal(element.children[1].tagName, 'IFRAME');
    assert.equal(
      element.children[1].src, 'https://www.youtube.com/embed/abcdefg');
  });
});
