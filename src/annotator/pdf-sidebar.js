import Sidebar from './sidebar';

const defaultConfig = {
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
    super(element, { ...defaultConfig, ...config });
  }
}
