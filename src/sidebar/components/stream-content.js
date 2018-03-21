'use strict';

// @ngInject
function StreamContentController(
  $scope, $location, $route, $routeParams, annotationMapper, store,
  api, queryParser, rootThread, searchFilter, streamFilter, streamer
) {
  var self = this;

  store.setAppIsSidebar(false);

  /** `offset` parameter for the next search API call. */
  var offset = 0;

  /** Load annotations fetched from the API into the app. */
  var load = function (result) {
    offset += result.rows.length;
    annotationMapper.loadAnnotations(result.rows, result.replies);
  };

  /**
   * Fetch the next `limit` annotations starting from `offset` from the API.
   */
  var fetch = function (limit) {
    var query = Object.assign({
      _separate_replies: true,
      offset: offset,
      limit: limit,
    }, searchFilter.toObject($routeParams.q));

    api.search(query)
      .then(load)
      .catch(function (err) {
        console.error(err);
      });
  };

  // Re-do search when query changes
  var lastQuery = $routeParams.q;
  $scope.$on('$routeUpdate', function () {
    if ($routeParams.q !== lastQuery) {
      store.clearAnnotations();
      $route.reload();
    }
  });

  // Set up updates from real-time API.
  streamFilter
    .resetFilter()
    .setMatchPolicyIncludeAll();

  var terms = searchFilter.generateFacetedFilter($routeParams.q);
  queryParser.populateFilter(streamFilter, terms);
  streamer.setConfig('filter', {filter: streamFilter.getFilter()});
  streamer.connect();

  // Perform the initial search
  fetch(20);

  this.setCollapsed = store.setCollapsed;
  this.forceVisible = function (id) {
    store.setForceVisible(id, true);
  };

  Object.assign(this.search, {
    query: function () {
      return $routeParams.q || '';
    },
    update: function (q) {
      $location.search({q: q});
    },
  });

  store.subscribe(function () {
    self.rootThread = rootThread.thread(store.getState());
  });

  // Sort the stream so that the newest annotations are at the top
  store.setSortKey('Newest');

  this.loadMore = fetch;
}

module.exports = {
  controller: StreamContentController,
  controllerAs: 'vm',
  bindings: {
    search: '<',
  },
  template: require('../templates/stream-content.html'),
};
