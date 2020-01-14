/**
 * Is the instance of the application in the current `window_` within a
 * sidebar (vs. single-annotation or stream view)?
 */
const isSidebar = (window_ = window) => {
  return !(
    window_.location.pathname.startsWith('/stream') ||
    window_.location.pathname.startsWith('/a/')
  );
};

export default isSidebar;
