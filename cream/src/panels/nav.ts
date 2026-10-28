// Cross-panel navigation hints (e.g. the Apps tab opening Elements on a specific section).
let pendingElements: string | null = null;

export function requestElementsSection(section: string) {
  pendingElements = section;
}

/** Read (and clear) a pending Elements section request. */
export function takeElementsSection(): string | null {
  const s = pendingElements;
  pendingElements = null;
  return s;
}
