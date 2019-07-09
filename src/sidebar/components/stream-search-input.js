'use strict';

const { createElement } = require('preact');
const { useEffect, useState } = require('preact/hooks');
const propTypes = require('prop-types');

const { withServices } = require('../util/service-context');

const SearchInput = require('./search-input');

/**
 * Search input for the single annotation view and stream.
 *
 * This displays and updates the "q" query param in the URL.
 */
function StreamSearchInput({ $location, $rootScope }) {
  const [query, setQuery] = useState($location.search().q);
  const search = query => {
    $rootScope.$apply(() => {
      // Re-route the user to `/stream` if they are on `/a/:id` and then set
      // the search query.
      $location.path('/stream').search({ q: query });
    });
  };

  useEffect(() => {
    $rootScope.$on('$locationChangeSuccess', () => {
      setQuery($location.search().q);
    });
  });

  return <SearchInput query={query} onSearch={search} alwaysExpanded={true} />;
}

StreamSearchInput.propTypes = {
  $location: propTypes.object,
  $rootScope: propTypes.object,
};

StreamSearchInput.injectedProps = ['$location', '$rootScope'];

module.exports = withServices(StreamSearchInput);
