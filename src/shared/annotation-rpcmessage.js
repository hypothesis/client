/**
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 *
 * Message sent between the sidebar and annotator about an annotation that has
 * changed.
 *
 * @typedef RPCMessage
 * @prop {string} tag
 * @prop {AnnotationData} msg
 */

/**
 * Return a minimal representation of an annotation that can be sent between the
 * sidebar app and the host frame.
 *
 * Because this representation will be exposed to untrusted third-party
 * JavaScript, it includes only the information needed to uniquely identify it
 * within the current session and anchor it in the document.
 *
 * @param {AnnotationData} annotation
 * @returns {RPCMessage}
 */
export function formatAnnotation(annotation) {
  return {
    tag: annotation.$tag,
    msg: {
      $tag: annotation.$tag,
      document: annotation.document,
      target: annotation.target,
      uri: annotation.uri,
    },
  };
}
