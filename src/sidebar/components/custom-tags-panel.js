import { createElement, Fragment } from 'preact';
import { useState } from 'preact/hooks'
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import uiConstants from '../ui-constants';
import { pageSharingLink } from '../util/annotation-sharing';
import { withServices } from '../util/service-context';
import { notNull } from '../util/typing';

import Button from './button';
import SidebarPanel from './sidebar-panel';
import Spinner from './spinner';

/**
 * @typedef CustomTagsPanel
 * @prop {Object} toastMessenger - Injected service
 * @prop {Object} tags - Injected service
 */

/**
 * A panel for uploading custom tags from a link containing a CSV file
 *
 * @param {CustomTagsPanel} props
 */
function CustomTagsPanel({ toastMessenger, tags: tagsService }) {
    const store = useStoreProxy();
    const mainFrame = store.mainFrame();
    const focusedGroup = store.focusedGroup();
    const panelTitle = 'Upload custom tags';
    const [inputValue, setInputValue] = useState('');

    // To be able to concoct a sharing link, a focused group and frame need to
    // be available
    const sharingReady = focusedGroup && mainFrame;

    const shareURI =
        sharingReady &&
        pageSharingLink(notNull(mainFrame).uri, notNull(focusedGroup).id);

    const fetchSug = async (link) => {
        const isCsvFile = link.endsWith('.csv');
        const response = await fetch(link);
        const responseText = await response.text();
        const splittedText = await responseText.split('\n');
        tagsService.store(splittedText.map(tag => ({ text: tag })));
        if (isCsvFile && response){
            toastMessenger.success('Added the custom tags from the link');
        } else {
            toastMessenger.error('Unable to fetch the link');
        }

    };

    return (
        <SidebarPanel
            title={panelTitle}
            panelName={uiConstants.CUSTOM_TAG_PANEL}
        >
            {!sharingReady && (
                <div className="share-annotations-panel__spinner">
                    <Spinner />
                </div>
            )}
            {sharingReady && (
                <div className="share-annotations-panel">
                    {shareURI ? (
                        <Fragment>
                            <div className="share-annotations-panel__intro">
                                {notNull(focusedGroup).type === 'private' ? (
                                    <p>
                                        Use this link to share these annotations with other group
                                        members:
                                    </p>
                                ) : (
                                    <p>Paste the link to a CSV file containing custom tags:</p>
                                )}
                            </div>
                            <div className="u-layout-row">
                                <input
                                    aria-label="Use this URL to share these annotations"
                                    className="share-annotations-panel__form-input"
                                    type="text"
                                    value={inputValue}
                                    // @ts-ignore
                                    onChange={e => setInputValue(e.target.value)}
                                />
                                <Button
                                    icon="copy"
                                    onClick={() => fetchSug(inputValue)}
                                    title="Copy share link"
                                    className="share-annotations-panel__icon-button"
                                />
                            </div>
                        </Fragment>
                    ) : (
                        <p>
                            These annotations cannot be shared because this document is not
                            available on the web.
                        </p>
                    )}
                </div>
            )}
        </SidebarPanel>
    );
}

CustomTagsPanel.propTypes = {
    analytics: propTypes.object.isRequired,
    toastMessenger: propTypes.object.isRequired,
    tags: propTypes.object.isRequired,
};

CustomTagsPanel.injectedProps = ['analytics', 'toastMessenger', 'tags'];

export default withServices(CustomTagsPanel);
