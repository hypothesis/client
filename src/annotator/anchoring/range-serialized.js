/**
 * Public: A range suitable for storing in local storage or serializing to JSON.
 */

export class SerializedRange {
  /**
   * Public: Creates a SerializedRange
   *
   * obj - The stored object. It should have the following properties.
   *       start:       An xpath to the Element containing the first TextNode
   *                    relative to the root Element.
   *       startOffset: The offset to the start of the selection from obj.start.
   *       end:         An xpath to the Element containing the last TextNode
   *                    relative to the root Element.
   *       startOffset: The offset to the end of the selection from obj.end.
   *
   * Returns an instance of SerializedRange
   */
  constructor(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }
}
