import { Icon, LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo, useState } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import { isThirdPartyUser } from '../../helpers/account-id';
import { isHidden } from '../../helpers/annotation-metadata';
import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';

import Excerpt from '../Excerpt';
import MarkdownView from '../MarkdownView';
import TagList from '../TagList';
import TagListItem from '../TagListItem';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import("../../../types/config").SidebarSettings} SidebarSettings
 */

/**
 * Button to expand or collapse the annotation excerpt (content)
 *
 * @param {object} props
 *   @param {string} [props.classes]
 *   @param {(collapse:boolean) => void} props.setCollapsed
 *   @param {boolean} props.collapsed
 */
function ToggleExcerptButton({ classes, setCollapsed, collapsed }) {
  const toggleText = collapsed ? 'More' : 'Less';
  return (
    <LabeledButton
      classes={classnames('text-grey-7 font-normal', classes)}
      expanded={!collapsed}
      onClick={() => setCollapsed(!collapsed)}
      title={`Toggle visibility of full annotation text: Show ${toggleText}`}
    >
      <div className="flex items-center gap-x-2">
        <Icon
          classes={classnames(
            // TODO: Refactor shared LabeledButton styles such that rules
            // have lower specificity and we don't need an !important rule here
            '!text-tiny'
          )}
          name={collapsed ? 'expand' : 'collapse'}
          title={collapsed ? 'expand' : 'collapse'}
        />
        <div>{toggleText}</div>
      </div>
    </LabeledButton>
  );
}

/**
 * @typedef AnnotationBodyProps
 * @prop {Annotation} annotation - The annotation in question
 * @prop {SidebarSettings} settings
 */

/**
 * Display the rendered content of an annotation.
 *
 * @param {AnnotationBodyProps} props
 */
function AnnotationBody({ annotation, settings }) {
  // Should the text content of `Excerpt` be rendered in a collapsed state,
  // assuming it is collapsible (exceeds allotted collapsed space)?
  const [collapsed, setCollapsed] = useState(true);

  // Does the text content of `Excerpt` take up enough vertical space that
  // collapsing/expanding is relevant?
  const [collapsible, setCollapsible] = useState(false);

  const store = useSidebarStore();
  const defaultAuthority = store.defaultAuthority();
  const draft = store.getDraft(annotation);

  // If there is a draft use the tag and text from it.
  const tags = draft?.tags ?? annotation.tags;
  const text = draft?.text ?? annotation.text;
  const showExcerpt = text.length > 0;
  const showTagList = tags.length > 0;

  const textStyle = applyTheme(['annotationFontFamily'], settings);

  const shouldLinkTags = useMemo(
    () => annotation && !isThirdPartyUser(annotation?.user, defaultAuthority),
    [annotation, defaultAuthority]
  );

  /**
   * @param {string} tag
   */
  const createTagSearchURL = tag => {
    return store.getLink('search.tag', { tag });
  };

  return (
    <div className="space-y-4">
      {showExcerpt && (
        <Excerpt
          collapse={collapsed}
          collapsedHeight={400}
          inlineControls={false}
          onCollapsibleChanged={setCollapsible}
          onToggleCollapsed={setCollapsed}
          overflowThreshold={20}
        >
          <MarkdownView
            markdown={text}
            classes={classnames({
              'p-redacted-text': isHidden(annotation),
            })}
            style={textStyle}
          />
        </Excerpt>
      )}
      {(collapsible || showTagList) && (
        <div className="flex flex-row gap-x-2">
          <div className="grow">
            {showTagList && (
              <TagList>
                {tags.map(tag => {
                  return (
                    <TagListItem
                      key={tag}
                      tag={tag}
                      href={
                        shouldLinkTags ? createTagSearchURL(tag) : undefined
                      }
                    />
                  );
                })}
              </TagList>
            )}
          </div>
          {collapsible && (
            <div>
              <ToggleExcerptButton
                classes={classnames(
                  // Pull button up toward bottom of excerpt content
                  '-mt-3'
                )}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default withServices(AnnotationBody, ['settings']);
