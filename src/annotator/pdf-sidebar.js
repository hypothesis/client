// @ts-expect-error - './sidebar' needs to be converted from JS.
import Sidebar from './sidebar';

const DEFAULT_CONFIG = {
  TextSelection: {},
  PDF: {},
  BucketBar: {
    container: '.annotator-frame',
    scrollables: ['#viewerContainer'],
  },
  Toolbar: {
    container: '.annotator-frame',
  },
};

export default class PdfSidebar extends Sidebar {
  constructor(element, config) {
    super(element, Object.assign({}, DEFAULT_CONFIG, config));
  }
}
