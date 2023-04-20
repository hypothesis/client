/**
 * Test whether an iframe fills the viewport of an ancestor frame.
 */
export function frameFillsAncestor(frame: Window, ancestor: Window): boolean {
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

  // Threshold for deciding when a frame occupies enough of its parent's width
  // to count as filling the viewport.
  const fullWidthThreshold = 0.8;

  return frameBox.width / frame.parent.innerWidth >= fullWidthThreshold;
}
