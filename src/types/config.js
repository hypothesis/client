/**
 * Configuration for an annotation service.
 *
 * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-services
 *
 *  The `onXXX` functions may be set by the embedder of the client. The
 * `onXXXProvided` booleans are correspondingly set in the annotator if a
 *  particular function is provided.
 *
 * @typedef Service
 * @prop {string} apiUrl
 * @prop {string} authority
 * @prop {string} grantToken
 * @prop {string} [icon]
 * @prop {string[]|Promise<string[]>|'$rpc:requestGroups'} [groups] -
 *   List of IDs of groups to show. If the embedder specifies "$rpc:requestGroups",
 *   the list of groups is fetched from a parent frame and `groups` is
 *   replaced with a promise to represent the result.
 * @prop {boolean} [allowFlagging]
 * @prop {boolean} [allowLeavingGroups]
 * @prop {boolean} [enableShareLinks]
 * @prop {Function} [onLoginRequest]
 * @prop {boolean} [onLoginRequestProvided]
 * @prop {Function} [onLogoutRequest]
 * @prop {boolean} [onLogoutRequestProvided]
 * @prop {Function} [onSignupRequest]
 * @prop {boolean} [onSignupRequestProvided]
 * @prop {Function} [onProfileRequest]
 * @prop {boolean} [onProfileRequestProvided]
 * @prop {Function} [onHelpRequest]
 * @prop {boolean} [onHelpRequestProvided]
 */

/**
 * Configuration for the Sentry crash-reporting service.
 *
 * @typedef SentryConfig
 * @prop {string} dsn
 * @prop {string} environment
 */

/**
 * Configuration for the sidebar app set by the Hypothesis backend ("h")
 * or baked into the sidebar app at build time (in the browser extension).
 *
 * See `h.views.client` in the "h" application.
 *
 * @typedef ConfigFromSidebar
 * @prop {string} apiUrl
 * @prop {string} authDomain
 * @prop {string} oauthClientId
 * @prop {string[]} rpcAllowedOrigins
 * @prop {SentryConfig} [sentry]
 */

/**
 * May be provided by `ConfigFromAnnotator` to configure a known ancestor
 * frame as the "embedder" frame. `ConfigFromEmbedder` will be requested from
 * this frame, and additional messaging (via postMessage) may be configured
 * between the sidebar frame and this embedder frame.
 *
 * @typedef EmbedderFrameConfig
 * @prop {number} ancestorLevel
 * @prop {string} origin
 */

/**
 * An "embedder frame" may provide configuration to be notified (via JSON RPC)
 * of qualifying annotation activity from the sidebar frame.
 *
 * @typedef {'create'|'save'|'delete'} AnnotationActivityEvent
 *
 * @typedef ReportAnnotationActivityConfig
 *   @prop {string} method - Name of method to call in embedder frame on
 *     qualifying annotation activity
 *   @prop {AnnotationActivityEvent[]} events - Which events to notify about
 *
 */

/**
 * Configuration provided by the annotator ("host frame") as
 * `ConfigFromAnnotator` OR by an ancestor ("embedder frame") as
 * `ConfigFromEmbedder`.
 *
 * This is the subset of keys from
 * https://h.readthedocs.io/projects/client/en/latest/publishers/config/ which
 * excludes any keys used only by the "annotator" part of the application.
 *
 * @typedef ConfigFromHost
 * @prop {string} [annotations] - Direct-linked annotation ID
 * @prop {string} [group] - Direct-linked group ID
 * @prop {string} [query] - Initial filter query
 * @prop {string} [appType] - Method used to load the client
 * @prop {boolean} [openSidebar] - Whether to open the sidebar on the initial load
 * @prop {boolean} [showHighlights] - Whether to show highlights
 * @prop {object} [branding] -
 *   Theme properties (fonts, colors etc.)
 * @prop {boolean} [enableExperimentalNewNoteButton] -
 *   Whether to show the "New note" button on the "Page Notes" tab
 * @prop {EmbedderFrameConfig} [requestConfigFromFrame] - Allows annotator to
 *   designate an ancestor frame from which configuration should be requested.
 *   Only valid when provided by annotator ("host frame").
 * @prop {ReportAnnotationActivityConfig} [reportActivity] - Allows embedder to
 *   receive notifications on qualifying annotation activity. Only valid when
 *   provided by ancestor ("embedder frame").
 * @prop {Service[]} [services] -
 *   Configuration for the annotation services that the client connects to
 * @prop {string} [theme]
 *   Name of the base theme to use.
 * @prop {string} [usernameUrl]
 *   URL template for username links
 */

/**
 * Settings derived from `ConfigFromAnnotator["requestConfigFromFrame"]`.
 * These settings allow `ConfigFromEmbedder` to be requested from the
 * designated frame, and allows subsequent communication between the sidebar
 * and embedder frames.
 *
 * @typedef RPCSettings
 * @prop {Window} targetFrame
 * @prop {EmbedderFrameConfig['origin']} origin
 */

/**
 * `SidebarSettings` are created by merging "sidebar configuration"
 * (`ConfigFromSidebar`) with  "host configuration" (either
 * `ConfigFromAnnotator` OR `ConfigFromEmbedder`).
 *
 * In all cases, the annotator ("host frame") provides `ConfigFromAnnotator`
 * to the sidebar frame by encoding values into a URL fragment on the sidebar
 * frame's `src` attribute.
 *
 * In most cases, `SidebarSettings` combine `ConfigFromAnnotator` with
 * `ConfigFromSidebar`:
 *
 * +--------------------------------------------+
 * |        host frame (annotator)              |
 * |                 +-----------------------+  |
 * |                 |  sidebar frame        |  |
 * |                 |                       |  |
 * | <ConfigFromAnnotator> => iframe.src     |  |
 * |                 |                       |  |
 * |                 |                       |  |
 * |                 |                       |  |
 * |                 | <ConfigFromSidebar>   |  |
 * |                 +-----------------------+  |
 * +--------------------------------------------+
 *
 * In some cases (e.g. LMS), host configuration should instead be provided by an
 * ancestor ("embedder") frame. This is signaled by the presence of a valid
 * `requestConfigFromFrame` object on `ConfigFromAnnotator`.
 *
 * `ConfigFromEmbedder` will then be requested from the designated embedder
 * frame and combined with `ConfigFromSidebar` to produce `SidebarSettings`:
 *
 * +------------------------------------------------------------------------+
 * |                                         embedder frame                 |
 * |  +------------------------------------------+                          |
 * |  |        host frame (annotator)            |                          |
 * |  |                 +---------------------+  |                          |
 * |  |                 |  sidebar frame      |  |                          |
 * |  |                 |                     |  |                          |
 * |  | <ConfigFromAnnotator> => iframe.src   |  |                          |
 * |  |   requestConfigFromFrame              |  |                          |
 * |  |                 |                     |  |                          |
 * |  |                 |                     |  |                          |
 * |  |                 |       <====postMessage====> <ConfigFromEmbedder>  |
 * |  |                 | <ConfigFromSidebar> |  |                          |
 * |  |                 +---------------------+  |                          |
 * |  +------------------------------------------+                          |
 * +------------------------------------------------------------------------+
 *
 * @typedef {Omit<ConfigFromHost, "reportActivity">} ConfigFromAnnotator
 * @typedef {Omit<ConfigFromHost, "requestConfigFromFrame">} ConfigFromEmbedder
 * @typedef {ConfigFromHost & ConfigFromSidebar & { rpc?: RPCSettings }} SidebarSettings
 */

// Make TypeScript treat this file as a module.
export const unused = {};
