import type { FocusUserInfo } from './rpc';

/**
 * Configuration for an annotation service.
 *
 * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-services
 *
 *  The `onXXX` functions may be set by the embedder of the client. The
 * `onXXXProvided` booleans are correspondingly set in the annotator if a
 *  particular function is provided.
 */
export type Service = {
  apiUrl: string;
  authority: string;
  grantToken: string;
  icon?: string;
  /**
   * List of IDs of groups to show. If the embedder specifies "$rpc:requestGroups",
   * the list of groups is fetched from a parent frame and `groups` is
   * replaced with a promise to represent the result.
   */
  groups?: string[] | Promise<string[]> | '$rpc:requestGroups';
  allowFlagging?: boolean;
  allowLeavingGroups?: boolean;
  enableShareLinks?: boolean;
  onHelpRequest?: () => void;
  onHelpRequestProvided?: boolean;
  onLoginRequest?: () => void;
  onLoginRequestProvided?: boolean;
  onLogoutRequest?: () => void;
  onLogoutRequestProvided?: boolean;
  onSignupRequest?: () => void;
  onSignupRequestProvided?: boolean;
  onProfileRequest?: () => void;
  onProfileRequestProvided?: boolean;
};

/**
 * Configuration for the Sentry crash-reporting service.
 */
export type SentryConfig = {
  dsn: string;
  environment: string;
};

/**
 * Configuration for the sidebar app set by the Hypothesis backend ("h")
 * or baked into the sidebar app at build time (in the browser extension).
 *
 * See `h.views.client` in the "h" application.
 */
export type ConfigFromSidebar = {
  apiUrl: string;
  authDomain: string;
  oauthClientId: string;
  rpcAllowedOrigins: string[];
  sentry?: SentryConfig;
};

/**
 * May be provided by `ConfigFromAnnotator` to configure a known ancestor
 * frame as the "embedder" frame. `ConfigFromEmbedder` will be requested from
 * this frame, and additional messaging (via postMessage) may be configured
 * between the sidebar frame and this embedder frame.
 */
export type EmbedderFrameConfig = {
  ancestorLevel: number;
  origin: string;
};

export type AnnotationEventType = 'create' | 'update' | 'flag' | 'delete';

/**
 * An "embedder frame" may provide configuration to be notified (via JSON RPC)
 * of qualifying annotation activity from the sidebar frame.
 */
export type ReportAnnotationActivityConfig = {
  /** Name of RPC method to call in embedded frame on qualifying annotation activity. */
  method: string;
  /** Which events to notify about. */
  events: AnnotationEventType[];
};

/**
 * Structure of focus-mode config, provided in settings (app config)
 */
export type FocusConfig = {
  user?: FocusUserInfo;
};

/**
 * List of theme elements which can be customized.
 */
export type ThemeProperty =
  | 'accentColor'
  | 'annotationFontFamily'
  | 'appBackgroundColor'
  | 'ctaBackgroundColor'
  | 'ctaTextColor'
  | 'selectionFontFamily';

/**
 * Configuration provided by the annotator ("host frame") as
 * `ConfigFromAnnotator` OR by an ancestor ("embedder frame") as
 * `ConfigFromEmbedder`.
 *
 * This is mostly a subset of keys from
 * https://h.readthedocs.io/projects/client/en/latest/publishers/config/ which
 * excludes any keys used only by the "annotator" part of the application.
 */
export type ConfigFromHost = {
  /** Direct-linked annotation ID. */
  annotations?: string;

  focus?: FocusConfig;

  /** Direct-linked group ID */
  group?: string;

  /** Initial filter query. */
  query?: string;

  /** Method used to load the client (extension, Via proxy, embedded by publisher etc.) */
  appType?: string;

  /** Whether to open the sidebar on the initial load. */
  openSidebar?: boolean;

  /** Whether to show highlights. */
  showHighlights?: boolean;

  /** Theme properties (fonts, colors etc.) */
  branding?: Record<ThemeProperty, string>;

  /** Whether to show the "New note" button on the "Page notes" tab. */
  enableExperimentalNewNoteButton?: boolean;

  /** Configuration for the annotation services that the client connects to. */
  services?: Service[];

  /** Name of the base theme to use. */
  theme?: string;

  /** URL template for username links. */
  usernameUrl?: string;
};

/**
 * Settings derived from `ConfigFromAnnotator["requestConfigFromFrame"]`.
 * These settings allow `ConfigFromEmbedder` to be requested from the
 * designated frame, and allows subsequent communication between the sidebar
 * and embedder frames.
 */
export type RPCSettings = {
  targetFrame: Window;
  origin: EmbedderFrameConfig['origin'];
};

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
 */
export type SidebarSettings = ConfigFromAnnotator &
  ConfigFromEmbedder &
  ConfigFromSidebar & { rpc?: RPCSettings };

/**
 * Configuration passed to Hypothesis client from the host frame.
 */
export type ConfigFromAnnotator = ConfigFromHost & {
  /**
   * Instructs the client to fetch configuration from an ancestor of the host
   * frame.
   *
   * This is primarily used in Hypothesis's LMS integration.
   */
  requestConfigFromFrame?: EmbedderFrameConfig;
};

/**
 * Configuration passed to Hypothesis client from the embedder frame. This is
 * primarily used in Hypothesis's LMS integration.
 *
 * This is a superset of the configuration which can be passed from the host
 * frame which enables some additional configuration that we don't want to
 * allow arbitrary web pages to set.
 */
export type ConfigFromEmbedder = ConfigFromHost & {
  /**
   * Feature flags to enable. When a flag is listed here, it will be turned
   * on even if disabled in the H user profile.
   */
  features?: string[];

  /**
   * Request notifications be delivered to the frame specified by
   * `requestConfigFromFrame` when certain annotation activity happens.
   */
  reportActivity?: ReportAnnotationActivityConfig;
};
