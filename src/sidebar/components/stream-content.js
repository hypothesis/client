'use strict';

// @ngInject
function StreamContentController(
  $scope,
  $route,
  $routeParams,
  annotationMapper,
  store,
  api,
  rootThread,
  searchFilter
) {
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

  // In case this route loaded after a client-side route change (eg. from
  // '/a/:id'), clear any existing annotations.
  store.clearAnnotations();

  // Perform the initial search
  fetch(20);

  this.setCollapsed = store.setCollapsed;
  this.rootThread = () => rootThread.thread(store.getState());

  // Sort the stream so that the newest annotations are at the top
  store.setSortKey('Newest');

  this.loadMore = fetch;
}

module.exports = {
  controller: StreamContentController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/stream-content.html'),
};
