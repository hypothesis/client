angular = require('angular')

module.exports = class StreamController
  this.$inject = [
    '$scope', '$location', '$route', '$rootScope', '$routeParams',
    'annotationUI',
    'queryParser', 'rootThread', 'searchFilter', 'store',
    'streamer', 'streamFilter'
  ]
  constructor: (
     $scope,  $location,   $route,   $rootScope,   $routeParams
     annotationUI,
     queryParser,   rootThread,   searchFilter,   store,
     streamer,   streamFilter
  ) ->
    annotationUI.setAppIsSidebar(false)

    offset = 0

    fetch = (limit) ->
      options = {offset, limit}
      searchParams = searchFilter.toObject($routeParams.q)
      query = angular.extend(options, searchParams)
      query._separate_replies = true
      store.search(query)
        .then(load)
        .catch((err) -> console.error err)

    load = ({rows, replies}) ->
      offset += rows.length
      annots = rows.concat(replies)
      annotationUI.addAnnotations(annots)

    # Reload on query change (ignore hash change)
    lastQuery = $routeParams.q
    $scope.$on '$routeUpdate', ->
      if $routeParams.q isnt lastQuery
        annotationUI.clearAnnotations()
        $route.reload()

    # Initialize the base filter
    streamFilter
      .resetFilter()
      .setMatchPolicyIncludeAll()

    # Apply query clauses
    terms = searchFilter.generateFacetedFilter $routeParams.q
    queryParser.populateFilter streamFilter, terms
    streamer.setConfig('filter', {filter: streamFilter.getFilter()})
    streamer.connect()

    # Perform the initial search
    fetch(20)

    $scope.setCollapsed = (id, collapsed) ->
      annotationUI.setCollapsed(id, collapsed)

    $scope.forceVisible = (id) ->
      annotationUI.setForceVisible(id, true)

    Object.assign $scope.search, {
      query: -> $routeParams.q || ''
      update: (q) -> $location.search({q: q})
    }

    annotationUI.subscribe( ->
      $scope.rootThread = rootThread.thread(annotationUI.getState())
    );

    # Sort the stream so that the newest annotations are at the top
    annotationUI.setSortKey('Newest')

    $scope.isStream = true
    $scope.loadMore = fetch
