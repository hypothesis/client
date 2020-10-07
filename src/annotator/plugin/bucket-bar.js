import $ from 'jquery';
import Delegator from '../delegator';
import scrollIntoView from 'scroll-into-view';
import {
  findClosestOffscreenAnchor,
  constructPositionPoints,
  buildBuckets,
} from '../util/buckets';

const BUCKET_SIZE = 16; // Regular bucket size
const BUCKET_NAV_SIZE = BUCKET_SIZE + 6; // Bucket plus arrow (up/down)
const BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE; // Toolbar

// Scroll to the next closest anchor off screen in the given direction.
function scrollToClosest(anchors, direction) {
  const closest = findClosestOffscreenAnchor(anchors, direction);
  if (closest && closest.highlights?.length) {
    scrollIntoView(closest.highlights[0]);
  }
}

export default class BucketBar extends Delegator {
  constructor(element, options, annotator) {
    const defaultOptions = {
      // gapSize parameter is used by the clustering algorithm
      // If an annotation is farther then this gapSize from the next bucket
      // then that annotation will not be merged into the bucket
      // TODO: This is not currently used; reassess
      gapSize: 60,
      html: '<div class="annotator-bucket-bar"></div>',
      // Selectors for the scrollable elements on the page
      scrollables: ['body'],
    };

    const opts = { ...defaultOptions, ...options };
    super($(opts.html), opts);

    this.buckets = [];
    this.tabs = $([]);

    if (this.options.container) {
      $(this.options.container).append(this.element);
    } else {
      $(element).append(this.element);
    }

    this.annotator = annotator;

    this.updateFunc = () => this.update();

    $(window).on('resize scroll', this.updateFunc);

    this.options.scrollables.forEach(scrollable => {
      $(scrollable).on('scroll', this.updateFunc);
    });
  }

  destroy() {
    $(window).off('resize scroll', this.updateFunc);
    this.options.scrollables.forEach(scrollable => {
      $(scrollable).off('scroll', this.updateFunc);
    });
  }

  update() {
    if (this._updatePending) {
      return;
    }
    this._updatePending = true;
    requestAnimationFrame(() => {
      const updated = this._update();
      this._updatePending = false;
      return updated;
    });
  }

  _update() {
    const { above, below, points } = constructPositionPoints(
      this.annotator.anchors
    );

    this.buckets = buildBuckets(points);

    // Scroll up
    this.buckets.unshift(
      { anchors: [], position: 0 },
      { anchors: above, position: BUCKET_TOP_THRESHOLD - 1 },
      { anchors: [], position: BUCKET_TOP_THRESHOLD }
    );
    //this.index.unshift(0, BUCKET_TOP_THRESHOLD - 1, BUCKET_TOP_THRESHOLD);

    // Scroll down,
    this.buckets.push(
      { anchors: [], position: window.innerHeight - BUCKET_NAV_SIZE },
      { anchors: below, position: window.innerHeight - BUCKET_NAV_SIZE + 1 },
      { anchors: [], position: window.innerHeight }
    );
    // this.index.push(
    //   window.innerHeight - BUCKET_NAV_SIZE,
    //   window.innerHeight - BUCKET_NAV_SIZE + 1,
    //   window.innerHeight
    // );

    // Remove any extra tabs and update tabs.
    this.tabs.slice(this.buckets.length).remove();
    this.tabs = this.tabs.slice(0, this.buckets.length);

    // Create any new tabs if needed.
    $.each(this.buckets.slice(this.tabs.length), () => {
      const div = $('<div/>').appendTo(this.element);

      this.tabs.push(div[0]);

      div
        .addClass('annotator-bucket-indicator')

        // Focus corresponding highlights bucket when mouse is hovered
        // TODO: This should use event delegation on the container.
        .on('mousemove', event => {
          const bucketIndex = this.tabs.index(event.currentTarget);
          for (let anchor of this.annotator.anchors) {
            const toggle = this.buckets[bucketIndex].anchors.includes(anchor);
            $(anchor.highlights).toggleClass(
              'hypothesis-highlight-focused',
              toggle
            );
          }
        })

        .on('mouseout', event => {
          const bucket = this.tabs.index(event.currentTarget);
          this.buckets[bucket].anchors.forEach(anchor =>
            $(anchor.highlights).removeClass('hypothesis-highlight-focused')
          );
        })
        .on('click', event => {
          const bucket = this.tabs.index(event.currentTarget);
          event.stopPropagation();

          // If it's the upper tab, scroll to next anchor above
          if (this.isUpper(bucket)) {
            scrollToClosest(this.buckets[bucket].anchors, 'up');
            // If it's the lower tab, scroll to next anchor below
          } else if (this.isLower(bucket)) {
            scrollToClosest(this.buckets[bucket].anchors, 'down');
          } else {
            const annotations = this.buckets[bucket].anchors.map(
              anchor => anchor.annotation
            );
            this.annotator.selectAnnotations(
              annotations,
              event.ctrlKey || event.metaKey
            );
          }
        });
    });

    this._buildTabs();
  }

  _buildTabs() {
    this.tabs.each((index, el) => {
      let bucketSize;
      el = $(el);
      const bucket = this.buckets[index];
      const bucketLength = bucket?.anchors?.length;

      const title = (() => {
        if (bucketLength !== 1) {
          return `Show ${bucketLength} annotations`;
        } else if (bucketLength > 0) {
          return 'Show one annotation';
        }
        return '';
      })();

      el.attr('title', title);
      el.toggleClass('upper', this.isUpper(index));
      el.toggleClass('lower', this.isLower(index));

      if (this.isUpper(index) || this.isLower(index)) {
        bucketSize = BUCKET_NAV_SIZE;
      } else {
        bucketSize = BUCKET_SIZE;
      }

      el.css({
        top: (bucket.position + this.buckets[index + 1]?.position) / 2,
        marginTop: -bucketSize / 2,
        display: !bucketLength ? 'none' : '',
      });

      if (bucket) {
        el.html(`<div class='label'>${bucketLength}</div>`);
      }
    });
  }

  isUpper(i) {
    return i === 1;
  }
  isLower(i) {
    return i === this.buckets.length - 2;
  }
}

// Export constants
BucketBar.BUCKET_SIZE = BUCKET_SIZE;
BucketBar.BUCKET_NAV_SIZE = BUCKET_NAV_SIZE;
BucketBar.BUCKET_TOP_THRESHOLD = BUCKET_TOP_THRESHOLD;
