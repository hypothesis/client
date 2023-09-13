import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
} from 'reselect';
import shallowEqual from 'shallowequal';

import type {
  ContentInfoConfig,
  DocumentMetadata,
  SegmentInfo,
} from '../../../types/annotator';
import { createStoreModule, makeAction } from '../create-store';

export type Frame = {
  /**
   * Sub-frames will all have a id (frame identifier) set. The main frame's id
   * is always `null`
   */
  id: string | null;

  /** Metadata about the document currently loaded in this frame */
  metadata: DocumentMetadata;
  /** Current primary URI of the document being displayed */
  uri: string;
  isAnnotationFetchComplete?: boolean;
  /** Should this frame be retained in the sidebar if the guest disconnects? */
  persistent: boolean;

  /**
   * Information about the section of a document that is currently loaded.
   * This is for content such as EPUBs, where the content displayed in a guest
   * frame is only part of the whole document.
   */
  segment?: SegmentInfo;
};

export type State = {
  frames: Frame[];

  /**
   * Data for the content information banner shown above the content in the main
   * guest frame.
   */
  contentInfo: ContentInfoConfig | null;
};

const initialState: State = {
  frames: [],
  contentInfo: null,
};

const reducers = {
  CONNECT_FRAME(state: State, action: { frame: Frame }) {
    const frameIndex = state.frames.findIndex(
      frame => frame.id === action.frame.id,
    );
    const newFrames = [...state.frames];
    if (frameIndex !== -1) {
      newFrames[frameIndex] = action.frame;
    } else {
      newFrames.push(action.frame);
    }
    return { frames: newFrames };
  },

  DESTROY_FRAME(state: State, action: { frame: Frame }) {
    const frames = state.frames.filter(f => f !== action.frame);
    return { frames };
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS(
    state: State,
    action: { uri: string; isAnnotationFetchComplete: boolean },
  ) {
    const frames = state.frames.map(frame => {
      const match = frame.uri && frame.uri === action.uri;
      if (match) {
        return Object.assign({}, frame, {
          isAnnotationFetchComplete: action.isAnnotationFetchComplete,
        });
      } else {
        return frame;
      }
    });
    return { frames };
  },

  SET_CONTENT_INFO(state: State, action: { info: ContentInfoConfig }) {
    return { contentInfo: action.info };
  },
};

/**
 * Add or replace a frame in the list of connected frames.
 *
 * If a frame exists with the same ID as `frame` it is replaced, otherwise
 * a new frame is added.
 */
function connectFrame(frame: Frame) {
  return makeAction(reducers, 'CONNECT_FRAME', { frame });
}

/**
 * Remove a frame from the list of connected frames.
 */
function destroyFrame(frame: Frame) {
  return makeAction(reducers, 'DESTROY_FRAME', { frame });
}

/**
 * Update the `isAnnotationFetchComplete` flag of the frame.
 */
function updateFrameAnnotationFetchStatus(
  uri: string,
  isFetchComplete: boolean,
) {
  return makeAction(reducers, 'UPDATE_FRAME_ANNOTATION_FETCH_STATUS', {
    uri,
    isAnnotationFetchComplete: isFetchComplete,
  });
}

function setContentInfo(info: ContentInfoConfig) {
  return makeAction(reducers, 'SET_CONTENT_INFO', { info });
}

/**
 * Return the list of frames currently connected to the sidebar app.
 */
function frames(state: State) {
  return state.frames;
}

const firstFrameWithoutId = (frames: Frame[]) =>
  frames.find(f => !f.id) || null;

/**
 * Return the "main" frame that the sidebar is connected to.
 *
 * The sidebar may be connected to multiple frames from different URLs.
 * For some purposes, the main frame (typically the top-level one that contains
 * the sidebar) needs to be distinguished. This selector returns the main frame
 * for that purpose.
 *
 * This may be `null` during startup.
 */
const mainFrame = createSelector(
  (state: State) => state.frames,

  // Sub-frames will all have a "frame identifier" set. The main frame is the
  // one with a `null` id.
  firstFrameWithoutId,
);

/**
 * Return the default frame that annotations are assumed to be associated with,
 * if they can't be matched to a more specific frame.
 *
 * For most document types this is the same as ({@see mainFrame}), but for
 * eg. VitalSource books there is no main frame, but instead only a frame with
 * the current chapter content.
 */
const defaultContentFrame = createSelector(
  (state: State) => state.frames,
  frames => {
    const mainFrame = firstFrameWithoutId(frames);
    if (mainFrame) {
      return mainFrame;
    } else if (frames.length > 0) {
      return frames[0];
    } else {
      return null;
    }
  },
);

function searchUrisForFrame(frame: Frame): string[] {
  let uris = [frame.uri];

  if (frame.metadata && frame.metadata.documentFingerprint) {
    uris = frame.metadata.link.map(link => {
      return link.href;
    });
  }

  if (frame.metadata && frame.metadata.link) {
    frame.metadata.link.forEach(link => {
      if (link.href.startsWith('doi:')) {
        uris.push(link.href);
      }
    });
  }

  return uris;
}

// "selector creator" that uses `shallowEqual` instead of `===` for memoization
const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual,
);

/**
 * Memoized selector will return the same array (of URIs) reference unless the
 * values of the array change (are not shallow-equal).
 */
const searchUris = createShallowEqualSelector(
  (state: State) =>
    state.frames.reduce<string[]>(
      (uris, frame) => uris.concat(searchUrisForFrame(frame)),
      [],
    ),
  uris => uris,
);

function getContentInfo(state: State) {
  return state.contentInfo;
}

export const framesModule = createStoreModule(initialState, {
  namespace: 'frames',
  reducers,

  actionCreators: {
    connectFrame,
    destroyFrame,
    setContentInfo,
    updateFrameAnnotationFetchStatus,
  },

  selectors: {
    getContentInfo,
    frames,
    mainFrame,
    defaultContentFrame,
    searchUris,
  },
});
