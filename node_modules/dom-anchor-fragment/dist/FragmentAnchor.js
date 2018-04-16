(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'module'], factory);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    factory(exports, module);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, mod);
    global.FragmentAnchor = mod.exports;
  }
})(this, function (exports, module) {
  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var FragmentAnchor = (function () {
    function FragmentAnchor(root, id) {
      _classCallCheck(this, FragmentAnchor);

      if (root === undefined) {
        throw new Error('missing required parameter "root"');
      }
      if (id === undefined) {
        throw new Error('missing required parameter "id"');
      }

      this.root = root;
      this.id = id;
    }

    _createClass(FragmentAnchor, [{
      key: 'toRange',
      value: function toRange() {
        var el = this.root.querySelector('#' + this.id);
        if (el == null) {
          throw new Error('no element found with id "' + this.id + '"');
        }

        var range = this.root.ownerDocument.createRange();
        range.selectNodeContents(el);

        return range;
      }
    }, {
      key: 'toSelector',
      value: function toSelector() {
        var el = this.root.querySelector('#' + this.id);
        if (el == null) {
          throw new Error('no element found with id "' + this.id + '"');
        }

        var conformsTo = 'https://tools.ietf.org/html/rfc3236';
        if (el instanceof SVGElement) {
          conformsTo = 'http://www.w3.org/TR/SVG/';
        }

        return {
          type: 'FragmentSelector',
          value: this.id,
          conformsTo: conformsTo
        };
      }
    }], [{
      key: 'fromRange',
      value: function fromRange(root, range) {
        if (root === undefined) {
          throw new Error('missing required parameter "root"');
        }
        if (range === undefined) {
          throw new Error('missing required parameter "range"');
        }

        var el = range.commonAncestorContainer;
        while (el != null && !el.id) {
          if (root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINED_BY) {
            el = el.parentElement;
          } else {
            throw new Error('no fragment identifier found');
          }
        }

        return new FragmentAnchor(root, el.id);
      }
    }, {
      key: 'fromSelector',
      value: function fromSelector(root) {
        var selector = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        return new FragmentAnchor(root, selector.value);
      }
    }]);

    return FragmentAnchor;
  })();

  module.exports = FragmentAnchor;
});
//# sourceMappingURL=data:application/json;base64,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Ozs7V0FwQ2tCLGNBQWM7OzttQkFBZCxjQUFjIiwiZmlsZSI6IkZyYWdtZW50QW5jaG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgY2xhc3MgRnJhZ21lbnRBbmNob3Ige1xuICBjb25zdHJ1Y3Rvcihyb290LCBpZCkge1xuICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXIgXCJyb290XCInKTtcbiAgICB9XG4gICAgaWYgKGlkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXIgXCJpZFwiJyk7XG4gICAgfVxuXG4gICAgdGhpcy5yb290ID0gcm9vdDtcbiAgICB0aGlzLmlkID0gaWQ7XG4gIH1cblxuICBzdGF0aWMgZnJvbVJhbmdlKHJvb3QsIHJhbmdlKSB7XG4gICAgaWYgKHJvb3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlciBcInJvb3RcIicpO1xuICAgIH1cbiAgICBpZiAocmFuZ2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlciBcInJhbmdlXCInKTtcbiAgICB9XG5cbiAgICBsZXQgZWwgPSByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcbiAgICB3aGlsZSAoZWwgIT0gbnVsbCAmJiAhZWwuaWQpIHtcbiAgICAgIGlmIChyb290LmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKGVsKSAmXG4gICAgICAgICAgTm9kZS5ET0NVTUVOVF9QT1NJVElPTl9DT05UQUlORURfQlkpIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBmcmFnbWVudCBpZGVudGlmaWVyIGZvdW5kJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBGcmFnbWVudEFuY2hvcihyb290LCBlbC5pZCk7XG4gIH1cblxuICBzdGF0aWMgZnJvbVNlbGVjdG9yKHJvb3QsIHNlbGVjdG9yID0ge30pIHtcbiAgICByZXR1cm4gbmV3IEZyYWdtZW50QW5jaG9yKHJvb3QsIHNlbGVjdG9yLnZhbHVlKTtcbiAgfVxuXG4gIHRvUmFuZ2UoKSB7XG4gICAgbGV0IGVsID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3IoJyMnICsgdGhpcy5pZCk7XG4gICAgaWYgKGVsID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbm8gZWxlbWVudCBmb3VuZCB3aXRoIGlkIFwiJyArIHRoaXMuaWQgKyAnXCInKTtcbiAgICB9XG5cbiAgICBsZXQgcmFuZ2UgPSB0aGlzLnJvb3Qub3duZXJEb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgIHJhbmdlLnNlbGVjdE5vZGVDb250ZW50cyhlbCk7XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH1cblxuICB0b1NlbGVjdG9yKCkge1xuICAgIGxldCBlbCA9IHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yKCcjJyArIHRoaXMuaWQpO1xuICAgIGlmIChlbCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGVsZW1lbnQgZm91bmQgd2l0aCBpZCBcIicgKyB0aGlzLmlkICsgJ1wiJyk7XG4gICAgfVxuXG4gICAgbGV0IGNvbmZvcm1zVG8gPSAnaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMyMzYnO1xuICAgIGlmIChlbCBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHtcbiAgICAgIGNvbmZvcm1zVG8gPSAnaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHLyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdGcmFnbWVudFNlbGVjdG9yJyxcbiAgICAgIHZhbHVlOiB0aGlzLmlkLFxuICAgICAgY29uZm9ybXNUbzogY29uZm9ybXNUbyxcbiAgICB9O1xuICB9XG59XG4iXSwic291cmNlUm9vdCI6Ii4vIn0=