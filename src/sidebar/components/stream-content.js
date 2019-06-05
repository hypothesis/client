'use strict';

// @ngInject
function StreamContentController(
  $scope,
  $location,
  $route,
  $routeParams,
  annotationMapper,
  store,
  api,
  rootThread,
  searchFilter
) {
  const self = this;

  store.setAppIsSidebar(false);

  /** `offset` parameter for the next search API call. */
  let offset = 0;

  /** Load annotations fetched from the API into the app. */
  const load = function(result) {
    offset += result.rows.length;
    annotationMapper.loadAnnotations(result.rows, result.replies);
  };

  /**
   * Fetch the next `limit` annotations starting from `offset` from the API.
   */
  const fetch = function(limit) {
    const query = Object.assign(
      {
        _separate_replies: true,
        offset: offset,
        limit: limit,
      },
      searchFilter.toObject($routeParams.q)
    );

    api
      .search(query)
      .then(load)
      .catch(function(err) {
        console.error(err);
      });
  };

  // Re-do search when query changes
  const lastQuery = $routeParams.q;
  $scope.$on('$routeUpdate', function() {
    if ($routeParams.q !== lastQuery) {
      store.clearAnnotations();
      $route.reload();
    }
  });

  // Perform the initial search
  fetch(20);

  this.setCollapsed = store.setCollapsed;

  store.subscribe(function() {
    self.rootThread = rootThread.thread(store.getState());
  });

  // Sort the stream so that the newest annotations are at the top
  store.setSortKey('Newest');

  this.loadMore = fetch;

  this.$onInit = () => {
    this.search.query = () => $routeParams.q || '';
    this.search.update = q => $location.search({ q });
  };
}

module.exports = {
  controller: StreamContentController,
  controllerAs: 'vm',
  bindings: {
    search: '<',
  },
  template: require('../templates/stream-content.html'),
};
