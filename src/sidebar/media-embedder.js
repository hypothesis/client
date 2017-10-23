'use strict';

/**
* Return an HTML5 audio player with the given src URL.
*/

function audioElement(src) {
  var html5audio = document.createElement('audio');
  html5audio.controls = true;
  html5audio.src      =  src;
  return html5audio;
}

/**
 * Return an iframe DOM element with the given src URL.
 */
function iframe(src) {
  var iframe_ = document.createElement('iframe');
  iframe_.src = src;
  iframe_.classList.add('annotation-media-embed');
  iframe_.setAttribute('frameborder', '0');
  iframe_.setAttribute('allowfullscreen', '');
  return iframe_;
}

/**
 * Return a YouTube embed (<iframe>) DOM element for the given video ID.
 */
function youTubeEmbed(id) {
  return iframe('https://www.youtube.com/embed/' + id);
}

function vimeoEmbed(id) {
  return iframe('https://player.vimeo.com/video/' + id);
}


/**
 * A list of functions that return an "embed" DOM element (e.g. an <iframe> or
 * an html5 <audio> element) for a given link.
 *
 * Each function either returns `undefined` if it can't generate an embed for
 * the link, or a DOM element if it can.
 *
 */
var embedGenerators = [

  // Matches URLs like https://www.youtube.com/watch?v=rw6oWkCojpw
  function iframeFromYouTubeWatchURL(link) {
    if (link.hostname !== 'www.youtube.com') {
      return null;
    }

    if (!/\/watch\/?/.test(link.pathname)) {
      return null;
    }

    var groups = /[&\?]v=([^&#]+)/.exec(link.search);
    if (groups) {
      return youTubeEmbed(groups[1]);
    }
    return null;
  },

  // Matches URLs like https://youtu.be/rw6oWkCojpw
  function iframeFromYouTubeShareURL(link) {
    if (link.hostname !== 'youtu.be') {
      return null;
    }

    var groups = /^\/([^\/]+)\/?$/.exec(link.pathname);
    if (groups) {
      return youTubeEmbed(groups[1]);
    }
    return null;
  },

  // Matches URLs like https://vimeo.com/149000090
  function iFrameFromVimeoLink(link) {
    if (link.hostname !== 'vimeo.com') {
      return null;
    }

    var groups = /^\/([^\/\?#]+)\/?$/.exec(link.pathname);
    if (groups) {
      return vimeoEmbed(groups[1]);
    }
    return null;
  },

  // Matches URLs like https://vimeo.com/channels/staffpicks/148845534
  function iFrameFromVimeoChannelLink(link) {
    if (link.hostname !== 'vimeo.com') {
      return null;
    }

    var groups = /^\/channels\/[^\/]+\/([^\/?#]+)\/?$/.exec(link.pathname);
    if (groups) {
      return vimeoEmbed(groups[1]);
    }
    return null;
  },

  /**
   * Match Internet Archive URLs
   *
   *  The patterns are:
   *
   *  1. https://archive.org/embed/{slug}?start={startTime}&end={endTime}
   *     (Embed links)
   *
   *  2. https://archive.org/details/{slug}?start={startTime}&end={endTime}
   *     (Video page links for most videos)
   *
   *  3. https://archive.org/details/{slug}/start/{startTime}/end/{endTime}
   *     (Video page links for the TV News Archive [1])
   *
   *  (2) and (3) allow users to copy and paste URLs from archive.org video
   *  details pages directly into the sidebar to generate video embeds.
   *
   *  [1] https://archive.org/details/tv
   */
  function iFrameFromInternetArchiveLink(link) {
    if (link.hostname !== 'archive.org') {
      return null;
    }

    var groups = /(embed|details)\/(.+)$/.exec(link.href);
    if (!groups) {
      return null;
    }

    var path = groups[2]; // group 2 is the path

    // Convert `/details` paths to `/embed` paths. TV News Archive links put
    // the start & end times in the paths whereas the embed links always use
    // "start" and "end" query params.
    path = path.replace('/start/', '?start=');
    path = path.replace('/end/', '&end=');

    return iframe('https://archive.org/embed/' + path);
  },


  // Matches URLs that end with .mp3, .ogg, or .wav (assumed to be audio files)
  function html5audioFromMp3Link(link) {
    if (link.pathname.endsWith('.mp3') || link.pathname.endsWith('.ogg') || link.pathname.endsWith('.wav')) {
      return audioElement(link.href);
    }
    return null;
  },

];

/**
 * Return an embed element for the given link if it's an embeddable link.
 *
 * If the link is a link for a YouTube video or other embeddable media then
 * return an embed DOM element (for example an <iframe>) for that media.
 *
 * Otherwise return undefined.
 *
 */
function embedForLink(link) {
  var embed;
  var j;
  for (j = 0; j < embedGenerators.length; j++) {
    embed = embedGenerators[j](link);
    if (embed) {
      return embed;
    }
  }
  return null;
}

/** Replace the given link element with an embed.
 *
 * If the given link element is a link to an embeddable media and if its link
 * text is the same as its href then it will be replaced in the DOM with an
 * embed (e.g. an <iframe> or html5 <audio> element) of the same media.
 *
 * If the link text is different from the href, then the link will be left
 * untouched. We want to convert links like these from the Markdown source into
 * embeds:
 *
 *     https://vimeo.com/channels/staffpicks/148845534
 *     <https://vimeo.com/channels/staffpicks/148845534>
 *
 * But we don't want to convert links like this:
 *
 *     [Custom link text](https://vimeo.com/channels/staffpicks/148845534)
 *
 * because doing so would destroy the user's custom link text, and leave users
 * with no way to just insert a media link without it being embedded.
 *
 * If the link is not a link to an embeddable media it will be left untouched.
 *
 */
function replaceLinkWithEmbed(link) {
  if (link.href !== link.textContent) {
    return;
  }
  var embed = embedForLink(link);
  if (embed){
    link.parentElement.replaceChild(embed, link);
  }
}

/**
 * Replace all embeddable link elements beneath the given element with embeds.
 *
 * All links to YouTube videos or other embeddable media will be replaced with
 * embeds of the same media.
 *
 */
function replaceLinksWithEmbeds(element) {
  var links = element.getElementsByTagName('a');

  // `links` is a "live list" of the <a> element children of `element`.
  // We want to iterate over `links` and replace some of them with embeds,
  // but we can't modify `links` while looping over it so we need to copy it to
  // a nice, normal array first.
  links = Array.prototype.slice.call(links, 0);

  var i;
  for (i = 0; i < links.length; i++) {
    replaceLinkWithEmbed(links[i]);
  }
}

module.exports = {
  replaceLinksWithEmbeds: replaceLinksWithEmbeds,
};
