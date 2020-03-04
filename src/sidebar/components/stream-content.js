// @ngInject
function StreamContentController(
  $scope,
  annotationMapper,
  store,
  api,
  rootThread,
  searchFilter
) {
  /** `offset` parameter for the next search API call. */
  let offset = 0;

  /** Load annotations fetched from the API into the app. */
  const load = function(result) {
    offset += result.rows.length;
    annotationMapper.loadAnnotations(result.rows, result.replies);
  };

  const currentQuery = () => store.routeParams().q;

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
      searchFilter.toObject(currentQuery())
    );

    api
      .search(query)
      .then(load)
      .catch(function(err) {
        console.error(err);
      });
  };

  function clearAndFetch() {
    // In case this route loaded after a client-side route change (eg. from
    // '/a/:id'), clear any existing annotations.
    store.clearAnnotations();

    // Fetch initial batch of annotations.
    offset = 0;
    fetch(20);
  }

  let lastQuery = currentQuery();
  const unsubscribe = store.subscribe(() => {
    const query = currentQuery();
    if (query !== lastQuery) {
      lastQuery = query;
      clearAndFetch();
    }
  });
  $scope.$on('$destroy', unsubscribe);

  clearAndFetch();

  this.setCollapsed = store.setCollapsed;
  this.rootThread = () => rootThread.thread(store.getState());

  // Sort the stream so that the newest annotations are at the top
  store.setSortKey('Newest');
}

export default {
  controller: StreamContentController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/stream-content.html'),
};
