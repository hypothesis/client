/**
 * Type definitions for the sidebar
 */

/**
 * Defined panel components available in the sidebar.
 *
 * @typedef {'help'|'loginPrompt'|'shareGroupAnnotations'} PanelName
 */

/**
 * The top-level tabs in the sidebar interface. Used to reference which tab
 * is currently selected (active/visible).
 *
 * @typedef {'annotation'|'note'|'orphan'} TabName
 */

/**
 * @typedef {import('preact').ComponentChildren} Children
 * @typedef {import('preact').Ref<HTMLElement>} ElementRef
 * @typedef {import('preact').JSX.HTMLAttributes<HTMLDivElement>} DivAttributes
 */

/**
 * Common props taken by presentational-only components that style a
 * <div> element.
 *
 * @typedef PresentationalComponentProps
 * @prop {Children} [children]
 * @prop {string} [classes]
 * @prop {ElementRef} [elementRef]
 *
 * @typedef {PresentationalComponentProps & DivAttributes} PresentationalDivComponentProps
 */

// Make TypeScript treat this file as a module.
export const unused = {};
