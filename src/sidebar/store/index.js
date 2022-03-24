import { createStore } from './create-store';
import { debugMiddleware } from './debug-middleware';
import { activityModule } from './modules/activity';
import { annotationsModule } from './modules/annotations';
import { defaultsModule } from './modules/defaults';
import { directLinkedModule } from './modules/direct-linked';
import { draftsModule } from './modules/drafts';
import { filtersModule } from './modules/filters';
import { framesModule } from './modules/frames';
import { groupsModule } from './modules/groups';
import { linksModule } from './modules/links';
import { realTimeUpdatesModule } from './modules/real-time-updates';
import { routeModule } from './modules/route';
import { selectionModule } from './modules/selection';
import { sessionModule } from './modules/session';
import { sidebarPanelsModule } from './modules/sidebar-panels';
import { toastMessagesModule } from './modules/toast-messages';
import { viewerModule } from './modules/viewer';

/** @typedef {ReturnType<createSidebarStore>} SidebarStore */

/**
 * Create the central state store for the sidebar application.
 *
 * This is a Redux [1] store composed of several modules, augmented with
 * _selector_ methods for querying it and _action_ methods for applying updates.
 * See the `createStore` documentation for API and usage details.
 *
 * [1] https://redux.js.org
 *
 * @param {import('../../types/config').SidebarSettings} settings
 * @inject
 */
export function createSidebarStore(settings) {
  const middleware = [debugMiddleware];

  // `const` type gives `modules` a tuple type, which allows `createStore`
  // to infer properties (eg. action and selector methods) of returned store.
  const modules = /** @type {const} */ ([
    activityModule,
    annotationsModule,
    defaultsModule,
    directLinkedModule,
    draftsModule,
    filtersModule,
    framesModule,
    linksModule,
    groupsModule,
    realTimeUpdatesModule,
    routeModule,
    selectionModule,
    sessionModule,
    sidebarPanelsModule,
    toastMessagesModule,
    viewerModule,
  ]);
  return createStore(modules, [settings], middleware);
}
