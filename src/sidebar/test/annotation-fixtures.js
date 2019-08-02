'use strict';

/**
 * Return a fake annotation with the basic properties filled in.
 */
function defaultAnnotation() {
  return {
    id: 'deadbeef',
    created: '2015-05-10T20:18:56.613388+00:00',
    document: {
      title: 'A special document',
    },
    target: [{ source: 'source', selector: [] }],
    uri: 'http://example.com',
    user: 'acct:bill@localhost',
    updated: '2015-05-10T20:18:56.613388+00:00',
  };
}

/**
 * Return a fake annotation created by a third-party user.
 */
function thirdPartyAnnotation() {
  return Object.assign(defaultAnnotation(), {
    user: 'acct:ben@publisher.org',
  });
}

/**
 * Return a fake public annotation with the basic properties filled in.
 */
function publicAnnotation() {
  return {
    id: 'pubann',
    document: {
      title: 'A special document',
    },
    permissions: {
      read: ['group:__world__'],
    },
    target: [{ source: 'source', selector: [] }],
    uri: 'http://example.com',
    user: 'acct:bill@localhost',
    updated: '2015-05-10T20:18:56.613388+00:00',
  };
}

/** Return an annotation domain model object for a new annotation
 * (newly-created client-side, not yet saved to the server).
 */
function newAnnotation() {
  return {
    id: undefined,
    $highlight: undefined,
    target: ['foo', 'bar'],
    references: [],
    text: 'Annotation text',
    tags: ['tag_1', 'tag_2'],
  };
}

/** Return a new reply */
function newReply() {
  return {
    id: undefined,
    $highlight: undefined,
    target: ['foo', 'bar'],
    references: ['parent-id'],
    text: 'Annotation text',
    tags: ['tag_1', 'tag_2'],
  };
}

/** Return a new annotation which has no tags or text. */
function newEmptyAnnotation() {
  return {
    id: undefined,
    $highlight: undefined,
    target: ['foo'],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for a new highlight
 * (newly-created client-side, not yet saved to the server).
 */
function newHighlight() {
  return {
    id: undefined,
    $highlight: true,
    target: [{ source: 'http://example.org' }],
  };
}

/** Return an annotation domain model object for an existing annotation
 *  received from the server.
 */
function oldAnnotation() {
  return {
    id: 'annotation_id',
    $highlight: undefined,
    target: [{ source: 'source', selector: [] }],
    references: [],
    text: 'This is my annotation',
    tags: ['tag_1', 'tag_2'],
  };
}

/** Return an annotation domain model object for an existing highlight
 *  received from the server.
 */
function oldHighlight() {
  return {
    id: 'annotation_id',
    $highlight: undefined,
    target: ['foo', 'bar'],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for an existing page note
 *  received from the server.
 */
function oldPageNote() {
  return {
    highlight: undefined,
    target: [{ source: 'http://example.org' }],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for an existing reply
 *  received from the server.
 */
function oldReply() {
  return {
    highlight: undefined,
    target: ['foo'],
    references: ['parent_annotation_id'],
    text: '',
    tags: [],
  };
}

/**
 * @typedef ModerationState
 * @property {boolean} hidden
 * @property {number} flagCount
 */

/**
 * Return an annotation with the given moderation state.
 *
 * @param {ModerationState} modInfo
 */
function moderatedAnnotation(modInfo) {
  return Object.assign(defaultAnnotation(), {
    id: 'ann-id',
    hidden: !!modInfo.hidden,
    moderation: {
      flagCount: modInfo.flagCount || 0,
    },
  });
}

module.exports = {
  defaultAnnotation: defaultAnnotation,
  publicAnnotation: publicAnnotation,
  moderatedAnnotation: moderatedAnnotation,
  newAnnotation: newAnnotation,
  newEmptyAnnotation: newEmptyAnnotation,
  newHighlight: newHighlight,
  newReply: newReply,
  oldAnnotation: oldAnnotation,
  oldHighlight: oldHighlight,
  oldPageNote: oldPageNote,
  oldReply: oldReply,
  thirdPartyAnnotation: thirdPartyAnnotation,
};
