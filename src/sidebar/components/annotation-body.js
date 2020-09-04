import { createElement } from 'preact';
import { useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { isHidden } from '../util/annotation-metadata';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';
import Excerpt from './excerpt';
import MarkdownView from './markdown-view';
import TagList from './tag-list';

/**
 * @typedef {import("../../types/api").Annotation} Annotation
 * @typedef {import("../../types/config").MergedConfig} MergedConfig
 */

/**
 * @typedef AnnotationBodyProps
 * @prop {Annotation} annotation - The annotation in question
 * @prop {MergedConfig} settings
 */

/**
 * Display the rendered content of an annotation.
 *
 * @param {AnnotationBodyProps} props
 */
function AnnotationBody({ annotation, settings }) {
  // Should the text content of `Excerpt` be rendered in a collapsed state,
  // assuming it is collapsible (exceeds allotted collapsed space)?
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Does the text content of `Excerpt` take up enough vertical space that
  // collapsing/expanding is relevant?
  const [isCollapsible, setIsCollapsible] = useState(false);

  const toggleText = isCollapsed ? 'More' : 'Less';
  const tags = annotation.tags;
  const text = annotation.text;
  const showExcerpt = text.length > 0;
  const showTagList = tags.length > 0;

  const textStyle = applyTheme(['annotationFontFamily'], settings);

  return (
    <div className="annotation-body">
      {showExcerpt && (
        <Excerpt
          collapse={isCollapsed}
          collapsedHeight={400}
          inlineControls={false}
          onCollapsibleChanged={setIsCollapsible}
          onToggleCollapsed={setIsCollapsed}
          overflowThreshold={20}
        >
          <MarkdownView
            textStyle={textStyle}
            markdown={text}
            textClass={{
              'annotation-body__text': true,
              'is-hidden': isHidden(annotation),
            }}
          />
        </Excerpt>
      )}
      {isCollapsible && (
        <div className="annotation-body__collapse-toggle">
          {/* @ts-ignore - TODO: Button props need to be fixed */}
          <Button
            buttonText={toggleText}
            className="annotation-body__collapse-toggle-button"
            isExpanded={!isCollapsed}
            onClick={() => {
              setIsCollapsed(!isCollapsed);
            }}
            aria-label="Toggle visibility of full annotation text"
            title="Toggle visibility of full annotation text"
          />
        </div>
      )}
      {showTagList && <TagList annotation={annotation} tags={tags} />}
    </div>
  );
}

AnnotationBody.propTypes = {
  annotation: propTypes.object.isRequired,
  settings: propTypes.object,
};

AnnotationBody.injectedProps = ['settings'];

export default withServices(AnnotationBody);
