/**
 * Generate a JavaScript click expression for a DOM element.
 *
 * Strategy (in priority order):
 * 1. Element has a unique ID → getElementById
 * 2. Link (<a>) with an href → querySelector by href
 * 3. Element with a unique aria-label → querySelector by aria-label
 * 4. Element with short, unique text content → find by textContent
 * 5. Fallback → CSS selector path using nth-of-type
 *
 * Returns an object with:
 * - `code`: a JS expression string that clicks the element
 * - `label`: a human-readable description for the shortcut
 */

function escapeJs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

/**
 * Check if a querySelector expression uniquely matches the given element.
 */
function isUnique(selector: string, el: Element): boolean {
  const matches = document.querySelectorAll(selector)
  return matches.length === 1 && matches[0] === el
}

/**
 * Build a CSS selector path as a last-resort fallback.
 */
function buildSelectorPath(el: Element): string {
  if (el.id && isUnique(`#${CSS.escape(el.id)}`, el)) {
    return `#${CSS.escape(el.id)}`
  }

  const path: string[] = []
  let current: Element | null = el

  while (current && current !== document.body && current !== document.documentElement) {
    if (current.id && current !== el && isUnique(`#${CSS.escape(current.id)}`, current)) {
      path.unshift(`#${CSS.escape(current.id)}`)
      break
    }

    let segment = current.tagName.toLowerCase()
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

  if (path.length > 0 && !path[0].startsWith('#')) {
    path.unshift('body')
  }

  return path.join(' > ')
}

export function generateClickCode(el: Element): { code: string; label: string } {
  const tag = el.tagName.toLowerCase()
  const text = (el.textContent || '').trim()
  const shortText = text.length > 40 ? text.slice(0, 40) + '…' : text
  const defaultLabel = shortText ? `Click "${shortText}"` : `Click ${tag} element`

  // Strategy 1: unique ID
  if (el.id && isUnique(`#${CSS.escape(el.id)}`, el)) {
    return {
      code: `document.getElementById('${escapeJs(el.id)}')?.click()`,
      label: defaultLabel,
    }
  }

  // Strategy 2: link with href
  if (tag === 'a' && el.getAttribute('href')) {
    const href = el.getAttribute('href')!
    // Only use href if it uniquely identifies this link on the page
    const selector = `a[href='${CSS.escape(href)}']`
    if (isUnique(selector, el)) {
      return {
        code: `document.querySelector("a[href='${escapeJs(href)}']")?.click()`,
        label: shortText ? `Click "${shortText}" link` : `Click link to ${href}`,
      }
    }
  }

  // Strategy 3: unique aria-label
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) {
    const selector = `[aria-label='${CSS.escape(ariaLabel)}']`
    if (isUnique(selector, el)) {
      return {
        code: `document.querySelector("[aria-label='${escapeJs(ariaLabel)}']")?.click()`,
        label: `Click "${ariaLabel}"`,
      }
    }
  }

  // Strategy 4: unique text content (for buttons, links, spans with short text)
  const textMatchTags = ['button', 'a', 'span', 'li', 'td', 'th', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  if (textMatchTags.includes(tag) && text.length > 0 && text.length <= 60) {
    // Check that text uniquely identifies this element among same-tag siblings
    const allOfTag = document.querySelectorAll(tag)
    const textMatches = Array.from(allOfTag).filter(
      (sibling) => (sibling.textContent || '').trim() === text,
    )
    if (textMatches.length === 1 && textMatches[0] === el) {
      return {
        code: `[...document.querySelectorAll('${tag}')].find(el => el.textContent.trim() === '${escapeJs(text)}')?.click()`,
        label: `Click "${shortText}"`,
      }
    }
  }

  // Strategy 5: fallback to CSS selector path
  const selector = buildSelectorPath(el)
  return {
    code: `document.querySelector('${escapeJs(selector)}')?.click()`,
    label: defaultLabel,
  }
}
