import { Icon, LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo, useState } from 'preact/hooks';

import { useStoreProxy } from '../../store/use-store';
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
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Does the text content of `Excerpt` take up enough vertical space that
  // collapsing/expanding is relevant?
  const [isCollapsible, setIsCollapsible] = useState(false);

  const store = useStoreProxy();
  const defaultAuthority = store.defaultAuthority();
  const draft = store.getDraft(annotation);

  const toggleText = isCollapsed ? 'More' : 'Less';

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
          collapse={isCollapsed}
          collapsedHeight={400}
          inlineControls={false}
          onCollapsibleChanged={setIsCollapsible}
          onToggleCollapsed={setIsCollapsed}
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
      {(isCollapsible || showTagList) && (
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
          {isCollapsible && (
            <div>
              <LabeledButton
                classes={classnames(
                  // Pull this button up toward the bottom of the excerpt content
                  '-mt-3',
                  'text-grey-7 font-normal'
                )}
                expanded={!isCollapsed}
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={`Toggle visibility of full annotation text: Show ${toggleText}`}
              >
                <div className="flex items-center gap-x-2">
                  <Icon
                    classes="!text-tiny"
                    name={isCollapsed ? 'expand' : 'collapse'}
                    title={isCollapsed ? 'expand' : 'collapse'}
                  />
                  <div>{toggleText}</div>
                </div>
              </LabeledButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default withServices(AnnotationBody, ['settings']);
