![scroll-into-view](/scrollintoview.png)

## What

Scrolls an element into view

Also scrolls any scroll-parents so that the element is in view.

## Donating

If you want to show your support financially, [I'm on Patreon](https://patreon.com/user/korynunn)

## Example

[Example](http://korynunn.github.io/scroll-into-view/example/)

## How

require it
```javascript
var scrollIntoView = require('scroll-into-view');
```
use it

```javascript
scrollIntoView(someElement);
```

You can pass settings to control the time, easing, and whether or not a parent is a valid element to scroll, and alignment:

All options are optional.

```javascript
scrollIntoView(someElement, {

    time: 500, // half a second


    ease: function(value){
        return Math.pow(value,2) - value; // Do something weird.
    },

    validTarget: function(target, parentsScrolled){

        // Only scroll the first two elements that don't have the class "dontScroll"
        // Element.matches is not supported in IE11, consider using Element.prototype.msMatchesSelector if you need to support that browser

        return parentsScrolled < 2 && target !== window && !target.matches('.dontScroll');
    },

    align:{
        top: 0 to 1, default 0.5 (center)
        left: 0 to 1, default 0.5 (center)
        topOffset: pixels to offset top alignment
        leftOffset: pixels to offset left alignment
    },

    isScrollable: function(target, defaultIsScrollable){

        // By default scroll-into-view will only attempt to scroll elements that have overflow not set to `"hidden"` and who's scroll width/height is larger than their client height.
        // You can override this check by passing an `isScrollable` function to settings:

        return defaultIsScrollable(target) || ~target.className.indexOf('scrollable');
    }

});
```

You can pass a callback that will be called when all scrolling has been completed or canceled.

```javascript
scrollIntoView(someElement [, settings], function(type){
    // Scrolling done.
    // type will be 'complete' if the scroll completed or 'canceled' if the current scroll was canceled by a new scroll
});
```

## Size

Small. ~3.03 KB for the standalone.

## Testing

Testing scrolling is really hard without stuff like webdriver, but what's there works ok for the moment.

The tests will attempt to launch google-chrome. If you don't have chrome, lol just kidding you do.

```
npm run test
```

# Standalone

If you want to use this module without browserify, you can use `scrollIntoView.min.js`

```
<script src="scrollIntoView.min.js"></script>

<script>
    window.scrollIntoView(someElement);
</script>
```
