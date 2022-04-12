import { makePresentationalComponent } from '../../shared/presentational-component';

/**
 * Render sidebar "page" content. This is used in the narrow sidebar frame
 * as well as wider interfaces like the Notebook and single-annotation view.
 */
const SidebarContent = makePresentationalComponent(
  'SidebarContent',
  // Center this content (auto margins). For larger viewports, set a
  // maximum width (768px) and add some horizontal padding.
  'mx-auto lg:px-16 lg:max-w-3xl'
);

export default SidebarContent;
