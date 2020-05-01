import { closest } from '../dom';

describe('annotator/util/dom', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('closest', () => {
    it('returns closest matching ancestor', () => {
      container.innerHTML = `
<div class="outer">
  <div class="middle">
    <div class="inner"></div>
  </div>
</div>
`;

      const el = container.querySelector('.inner');
      const target = container.querySelector('.outer');

      assert.equal(closest(el, '.inner'), el);
      assert.equal(closest(el, '.outer'), target);
      assert.isNull(closest(el, '.no-match'));
    });
  });
});
