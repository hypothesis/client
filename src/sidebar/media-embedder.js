'use strict';

const queryString = require('query-string');

/**
 * Return an HTML5 audio player with the given src URL.
 */

function audioElement(src) {
  const html5audio = document.createElement('audio');
  html5audio.controls = true;
  html5audio.src = src;
  return html5audio;
}

/**
 * Return an iframe DOM element with the given src URL.
 */
function iframe(src) {
  const iframe_ = document.createElement('iframe');
  iframe_.src = src;
  iframe_.classList.add('annotation-media-embed');
  iframe_.setAttribute('frameborder', '0');
  iframe_.setAttribute('allowfullscreen', '');
  return iframe_;
}

/**
 * Return timeValue as a value in seconds, supporting `t` param's optional
 * '\dh\dm\ds' format. If `timeValue` is numeric (only),
 * it's assumed to be seconds and is left alone.
 *
 * @param {string} timeValue - value of `t` or `start` param in YouTube URL
 * @returns {string} timeValue in seconds
 * @example
 * formatYouTubeTime('5m'); // returns '300'
 * formatYouTubeTime('20m10s'); // returns '1210'
 * formatYouTubeTime('1h1s'); // returns '3601'
 * formatYouTubeTime('10'); // returns '10'
 **/
function parseTimeString(timeValue) {
  const timePattern = /(\d+)([hms]?)/g;
  const multipliers = {
    h: 60 * 60,
    m: 60,
    s: 1,
  };
  let seconds = 0;
  let match;
  // match[1] - Numeric value
  // match[2] - Unit (e.g. 'h','m','s', or empty)
  while ((match = timePattern.exec(timeValue)) !== null) {
    if (match[2]) {
      seconds += match[1] * multipliers[match[2]];
    } else {
      seconds += +match[1]; // Treat values missing units as seconds
    }
  }
  return seconds.toString();
}

/**
 * Return a YouTube URL query string containing (only) whitelisted params.
 * See https://developers.google.com/youtube/player_parameters for
 * all parameter possibilities.
 *
 * @returns {string} formatted filtered URL query string, e.g. '?start=90'
 * @example
 * // returns '?end=10&start=5'
 * youTubeQueryParams(link); // where `link.search` = '?t=5&baz=foo&end=10'
 * // - `t` is translated to `start`
 * // - `baz` is not allowed param
 * // - param keys are sorted
 */
function youTubeQueryParams(link) {
  let query;
  const allowedParams = [
    'end',
    'start',
    't', // will be translated to `start`
  ];
  const linkParams = queryString.parse(link.search);
  const filteredQuery = {};
  // Filter linkParams for allowed keys and build those entries
  // into the filteredQuery object
  Object.keys(linkParams)
    .filter(key => allowedParams.includes(key))
    .forEach(key => {
      if (key === 't') {
        // `t` is not supported in embeds; `start` is
        // `t` accepts more formats than `start`; start must be in seconds
        // so, format it as seconds first
        filteredQuery.start = parseTimeString(linkParams[key]);
      } else {
        filteredQuery[key] = linkParams[key];
      }
    });
  query = queryString.stringify(filteredQuery);
  if (query) {
    query = `?${query}`;
  }
  return query;
}
/**
 * Return a YouTube embed (<iframe>) DOM element for the given video ID.
 */
function youTubeEmbed(id, link) {
  const query = youTubeQueryParams(link);
  return iframe(`https://www.youtube.com/embed/${id}${query}`);
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
const embedGenerators = [
  // Matches URLs like https://www.youtube.com/watch?v=rw6oWkCojpw
  function iframeFromYouTubeWatchURL(link) {
    if (link.hostname !== 'www.youtube.com') {
      return null;
    }

    if (!/\/watch\/?/.test(link.pathname)) {
      return null;
    }

    const groups = /[&?]v=([^&#]+)/.exec(link.search);
    if (groups) {
      return youTubeEmbed(groups[1], link);
    }
    return null;
  },

  // Matches URLs like https://youtu.be/rw6oWkCojpw
  function iframeFromYouTubeShareURL(link) {
    if (link.hostname !== 'youtu.be') {
      return null;
    }

    // extract video ID from URL
    const groups = /^\/([^/]+)\/?$/.exec(link.pathname);
    if (groups) {
      return youTubeEmbed(groups[1], link);
    }
    return null;
  },

  // Matches URLs like https://vimeo.com/149000090
  function iFrameFromVimeoLink(link) {
    if (link.hostname !== 'vimeo.com') {
      return null;
    }

    const groups = /^\/([^/?#]+)\/?$/.exec(link.pathname);
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

    const groups = /^\/channels\/[^/]+\/([^/?#]+)\/?$/.exec(link.pathname);
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

    // Extract the unique slug from the path.
    const slugMatch = /^\/(embed|details)\/(.+)/.exec(link.pathname);
    if (!slugMatch) {
      return null;
    }

    // Extract start and end times, which may appear either as query string
    // params or path params.
    let slug = slugMatch[2];
    const linkParams = queryString.parse(link.search);
    let startTime = linkParams.start;
    let endTime = linkParams.end;

    if (!startTime) {
      const startPathParam = slug.match(/\/start\/([^/]+)/);
      if (startPathParam) {
        startTime = startPathParam[1];
        slug = slug.replace(startPathParam[0], '');
      }
    }

    if (!endTime) {
      const endPathParam = slug.match(/\/end\/([^/]+)/);
      if (endPathParam) {
        endTime = endPathParam[1];
        slug = slug.replace(endPathParam[0], '');
      }
    }

    // Generate embed URL.
    const iframeUrl = new URL(`https://archive.org/embed/${slug}`);
    if (startTime) {
      iframeUrl.searchParams.append('start', startTime);
    }
    if (endTime) {
      iframeUrl.searchParams.append('end', endTime);
    }
    return iframe(iframeUrl.href);
  },

  // Matches URLs that end with .mp3, .ogg, or .wav (assumed to be audio files)
  function html5audioFromMp3Link(link) {
    if (
      link.pathname.endsWith('.mp3') ||
      link.pathname.endsWith('.ogg') ||
      link.pathname.endsWith('.wav')
    ) {
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
  let embed;
  let j;
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
  // The link's text may or may not be percent encoded. The `link.href` property
  // will always be percent encoded. When comparing the two we need to be
  // agnostic as to which representation is used.
  if (
    link.href !== link.textContent &&
    decodeURI(link.href) !== link.textContent
  ) {
    return;
  }
  const embed = embedForLink(link);
  if (embed) {
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
  let links = element.getElementsByTagName('a');

  // `links` is a "live list" of the <a> element children of `element`.
  // We want to iterate over `links` and replace some of them with embeds,
  // but we can't modify `links` while looping over it so we need to copy it to
  // a nice, normal array first.
  links = Array.prototype.slice.call(links, 0);

  let i;
  for (i = 0; i < links.length; i++) {
    replaceLinkWithEmbed(links[i]);
  }
}

module.exports = {
  replaceLinksWithEmbeds: replaceLinksWithEmbeds,
};
