/**
 * Generate a robust CSS selector for a DOM element.
 *
 * Strategy (in priority order):
 * 1. Element has a unique ID → `#id`
 * 2. Build a path using tag + nth-of-type from the element up to an ancestor with an ID
 * 3. Fall back to a full path from `body`
 *
 * The result is always a selector that uniquely identifies the element on the page.
 */
export function generateSelector(el: Element): string {
  // Strategy 1: unique ID
  if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    return `#${CSS.escape(el.id)}`
  }

  const path: string[] = []
  let current: Element | null = el

  while (current && current !== document.body && current !== document.documentElement) {
    // If this ancestor has a unique ID, anchor there
    if (current.id && current !== el && document.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
      path.unshift(`#${CSS.escape(current.id)}`)
      break
    }

    let segment = current.tagName.toLowerCase()

    // Add nth-of-type to disambiguate siblings
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName,
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        segment += `:nth-of-type(${index})`
      }
    }

    path.unshift(segment)
    current = parent
  }

  // If we didn't anchor to an ID, start from body
  if (path.length > 0 && !path[0].startsWith('#')) {
    path.unshift('body')
  }

  return path.join(' > ')
}
