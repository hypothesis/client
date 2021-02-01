import { createElement } from 'preact';
import { useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import { isHidden } from '../helpers/annotation-metadata';
import { withServices } from '../service-context';
import { applyTheme } from '../helpers/theme';

import Button from './Button';
import Excerpt from './Excerpt';
import MarkdownView from './MarkdownView';
import TagList from './TagList';

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

  const store = useStoreProxy();
  const draft = store.getDraft(annotation);

  const toggleText = isCollapsed ? 'More' : 'Less';

  // If there is a draft use the tag and text from it.
  const tags = draft?.tags ?? annotation.tags;
  const text = draft?.text ?? annotation.text;
  const showExcerpt = text.length > 0;
  const showTagList = tags.length > 0;

  const textStyle = applyTheme(['annotationFontFamily'], settings);

  return (
    <div className="AnnotationBody">
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
              AnnotationBody__text: true,
              'is-hidden': isHidden(annotation),
            }}
          />
        </Excerpt>
      )}
      {isCollapsible && (
        <div className="AnnotationBody__collapse-toggle">
          {/* @ts-ignore - TODO: Button props need to be fixed */}
          <Button
            buttonText={toggleText}
            className="AnnotationBody__collapse-toggle-button"
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
