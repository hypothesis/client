/**
 * Test whether an iframe fills the viewport of an ancestor frame.
 *
 * @param {Window} frame
 * @param {Window} ancestor
 */
export function frameFillsAncestor(frame, ancestor) {
  if (frame === ancestor) {
    return true;
  }

  if (frame.parent !== ancestor) {
    // To keep things simple, we initially only support direct ancestors.
    return false;
  }

  if (!frame.frameElement) {
    // This is a cross-origin iframe. In this case we can't tell if it fills
    // the parent frame or not.
    return false;
  }

  const frameBox = frame.frameElement.getBoundingClientRect();
  return frameBox.width / frame.parent.innerWidth >= 0.8;
}
