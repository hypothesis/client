export function nodeIsElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function nodeIsText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}
