export function currentScriptOrigin(): string | null {
  // It might be possible to simplify this as `url` appears to be required
  // according to the HTML spec.
  //
  // See https://html.spec.whatwg.org/multipage/webappapis.html#hostgetimportmetaproperties.
  const { url } = import.meta;
  if (!url) {
    return null;
  }
  return new URL(url).origin;
}
