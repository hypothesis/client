'use strict';

/**
 * Utility functions for querying annotation metadata.
 */

/** Extract a URI, domain and title from the given domain model object.
 *
 * @param {object} annotation An annotation domain model object as received
 *   from the server-side API.
 * @returns {object} An object with three properties extracted from the model:
 *   uri, domain and title.
 *
 */
function documentMetadata(annotation) {
  const uri = annotation.uri;
  let domain = new URL(uri).hostname;
  let title = domain;

  if (annotation.document && annotation.document.title) {
    title = annotation.document.title[0];
  }

  if (domain === 'localhost') {
    domain = '';
  }

  return {
    uri: uri,
    domain: domain,
    title: title,
  };
}

/**
 * Return the domain and title of an annotation for display on an annotation
 * card.
 */
function domainAndTitle(annotation) {
  return {
    domain: domainTextFromAnnotation(annotation),
    titleText: titleTextFromAnnotation(annotation),
    titleLink: titleLinkFromAnnotation(annotation),
  };
}

function titleLinkFromAnnotation(annotation) {
  let titleLink = annotation.uri;

  if (
    titleLink &&
    !(titleLink.indexOf('http://') === 0 || titleLink.indexOf('https://') === 0)
  ) {
    // We only link to http(s) URLs.
    titleLink = null;
  }

  if (annotation.links && annotation.links.incontext) {
    titleLink = annotation.links.incontext;
  }

  return titleLink;
}

function domainTextFromAnnotation(annotation) {
  const document = documentMetadata(annotation);

  let domainText = '';
  if (document.uri && document.uri.indexOf('file://') === 0 && document.title) {
    const parts = document.uri.split('/');
    const filename = parts[parts.length - 1];
    if (filename) {
      domainText = filename;
    }
  } else if (document.domain && document.domain !== document.title) {
    domainText = document.domain;
  }

  return domainText;
}

function titleTextFromAnnotation(annotation) {
  const document = documentMetadata(annotation);

  let titleText = document.title;
  if (titleText.length > 30) {
    titleText = titleText.slice(0, 30) + '…';
  }

  return titleText;
}

/** Return `true` if the given annotation is a reply, `false` otherwise. */
function isReply(annotation) {
  return (annotation.references || []).length > 0;
}

/** Return `true` if the given annotation is new, `false` otherwise.
 *
 * "New" means this annotation has been newly created client-side and not
 * saved to the server yet.
 */
function isNew(annotation) {
  return !annotation.id;
}

/** Return `true` if the given annotation is public, `false` otherwise. */
function isPublic(annotation) {
  let isPublic = false;

  if (!annotation.permissions) {
    return isPublic;
  }

  annotation.permissions.read.forEach(function(perm) {
    const readPermArr = perm.split(':');
    if (readPermArr.length === 2 && readPermArr[0] === 'group') {
      isPublic = true;
    }
  });

  return isPublic;
}

/**
 * Return `true` if `annotation` has a selector.
 *
 * An annotation which has a selector refers to a specific part of a document,
 * as opposed to a Page Note which refers to the whole document or a reply,
 * which refers to another annotation.
 */
function hasSelector(annotation) {
  return !!(
    annotation.target &&
    annotation.target.length > 0 &&
    annotation.target[0].selector
  );
}

/**
 * Return `true` if the given annotation is not yet anchored.
 *
 * Returns false if anchoring is still in process but the flag indicating that
 * the initial timeout allowed for anchoring has expired.
 */
function isWaitingToAnchor(annotation) {
  return (
    hasSelector(annotation) &&
    typeof annotation.$orphan === 'undefined' &&
    !annotation.$anchorTimeout
  );
}

/** Return `true` if the given annotation is an orphan. */
function isOrphan(annotation) {
  return hasSelector(annotation) && annotation.$orphan;
}

/** Return `true` if the given annotation is a page note. */
function isPageNote(annotation) {
  return !hasSelector(annotation) && !isReply(annotation);
}

/** Return `true` if the given annotation is a top level annotation, `false` otherwise. */
function isAnnotation(annotation) {
  return !!(hasSelector(annotation) && !isOrphan(annotation));
}

/** Return a numeric key that can be used to sort annotations by location.
 *
 * @return {number} - A key representing the location of the annotation in
 *                    the document, where lower numbers mean closer to the
 *                    start.
 */
function location(annotation) {
  if (annotation) {
    const targets = annotation.target || [];
    for (let i = 0; i < targets.length; i++) {
      const selectors = targets[i].selector || [];
      for (let k = 0; k < selectors.length; k++) {
        if (selectors[k].type === 'TextPositionSelector') {
          return selectors[k].start;
        }
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Return the number of times the annotation has been flagged
 * by other users. If moderation metadata is not present, returns `null`.
 *
 * @return {number|null}
 */
function flagCount(ann) {
  if (!ann.moderation) {
    return null;
  }
  return ann.moderation.flagCount;
}

module.exports = {
  documentMetadata: documentMetadata,
  domainAndTitle: domainAndTitle,
  flagCount: flagCount,
  isAnnotation: isAnnotation,
  isNew: isNew,
  isOrphan: isOrphan,
  isPageNote: isPageNote,
  isPublic: isPublic,
  isReply: isReply,
  isWaitingToAnchor: isWaitingToAnchor,
  location: location,
};
