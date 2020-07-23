import { createElement } from 'preact';

import Button from './Button';

//import useStore from '../store/use-store';

/**
 *
 */
export default function FilterStatus() {
  const annotationCount = 45;
  const resultCount = 4;
  const filterQuery = 'foo';
  const selectedCount = 3;
  const forcedCount = 2;
  const clearSearchText = 'Clear search';
  const clearFiltersText = 'Reset filters';
  const clearSelectionText = 'Show all';

  const studentName = 'Harriet Gorman';
  const showAllText = 'Show all';

  const filterQueryEl = (
    <span>
      <span>for</span>{' '}
      <span className="filter-status__facet--pre">&#39;{filterQuery}&#39;</span>
    </span>
  );

  return (
    <div>
      <div className="filter-status__header">2. Filtered by query</div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">{resultCount} results</span>{' '}
            {filterQueryEl}
          </div>
          <div>
            <Button
              buttonText={clearSearchText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        2a. Filtered by query, no results
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            <span className="filter-status__facet">No results</span>{' '}
            {filterQueryEl}
          </div>
          <div>
            <Button
              buttonText={clearSearchText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        3. Filtered by query, force-expanded threads
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">{resultCount} results</span>{' '}
            {filterQueryEl}{' '}
            <span className="filter-status__facet--muted">
              (and {forcedCount} more)
            </span>
          </div>
          <div>
            <Button
              buttonText={clearSearchText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">4. Annotations selected</div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">
              {selectedCount} annotations
            </span>
          </div>
          <div>
            <Button
              buttonText={`${clearSelectionText} (${annotationCount})`}
              className="button--primary"
              onClick={() => alert('foo')}
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">5. User-focus active</div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">
              {selectedCount} annotations
            </span>{' '}
            by <span className="filter-status__facet">{studentName}</span>
          </div>
          <div>
            <Button
              buttonText={showAllText}
              className="button--primary"
              onClick={() => alert('foo')}
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        5a. User-focus active, no results
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            <span className="filter-status__facet">No annotations</span> to show
            by <span className="filter-status__facet">{studentName}</span>
          </div>
          <div>
            <Button
              buttonText={showAllText}
              className="button--primary"
              onClick={() => alert('foo')}
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        6. User-focus active, filtered by query
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">{resultCount} results</span>{' '}
            {filterQueryEl} by{' '}
            <span className="filter-status__facet">{studentName}</span>
          </div>
          <div>
            <Button
              buttonText={clearSearchText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        6a. User-focus active, filtered by query, no results
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            <span className="filter-status__facet">No results</span>{' '}
            {filterQueryEl} by{' '}
            <span className="filter-status__facet">{studentName}</span>
          </div>
          <div>
            <Button
              buttonText={clearSearchText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        7. User-focus active, filtered by query, force-expanded threads
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">{resultCount} results</span>{' '}
            {filterQueryEl} by{' '}
            <span className="filter-status__facet">{studentName}</span>{' '}
            <span className="filter-status__facet--muted">
              (and {forcedCount} more)
            </span>
          </div>
          <div>
            <Button
              buttonText={clearSearchText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        8. User-focus active, selected annotations
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">
              {selectedCount} annotations
            </span>
          </div>
          <div>
            <Button
              buttonText={clearSelectionText}
              className="button--primary"
              onClick={() => alert('foo')}
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">
        9. User-focus active, force-expanded threads
      </div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">
              {resultCount} annotations
            </span>{' '}
            by <span className="filter-status__facet">{studentName}</span>{' '}
            <span className="filter-status__facet--muted">
              (and {forcedCount} more)
            </span>
          </div>
          <div>
            <Button
              buttonText={clearFiltersText}
              className="button--primary"
              onClick={() => alert('foo')}
              icon="cancel"
            />
          </div>
        </div>
      </div>

      <div className="filter-status__header">10. User-focus inactive</div>
      <div className="filter-status">
        <div className="u-layout-row--align-center">
          <div className="filter-status__text">
            Showing{' '}
            <span className="filter-status__facet">
              {selectedCount} annotations
            </span>{' '}
            by <span className="filter-status__facet">all</span>
          </div>
          <div>
            <Button
              buttonText={`Show ${studentName} only`}
              className="button--primary"
              onClick={() => alert('foo')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

FilterStatus.propTypes = {};
