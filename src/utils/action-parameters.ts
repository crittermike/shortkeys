import type { ActionParameters } from './url-matching'
import { SCROLL_ACTIONS } from './actions-registry'

export const BOOKMARK_ACTIONS = [
  'openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab', 'openbookmarkbackgroundtabandclose',
]

const PARAMETER_FIELDS: Record<string, (keyof ActionParameters)[]> = {
  javascript: ['code'],
  openurl: ['openurl'],
  gototab: ['matchurl', 'openurl', 'currentWindow'],
  gototabbytitle: ['matchtitle', 'currentWindow'],
  gototabbyindex: ['matchindex'],
  buttonnexttab: ['button'],
  openapp: ['openappid'],
  trigger: ['trigger'],
  inserttext: ['inserttext'],
  grouptab: ['groupname'],
  togglegrouptab: ['groupname'],
  namegroup: ['groupname'],
  ...Object.fromEntries(BOOKMARK_ACTIONS.map(action => [action, ['bookmark']])),
  ...Object.fromEntries(SCROLL_ACTIONS.map(action => [action, ['smoothScrolling']])),
}

export function needsActionSettings(action: string): boolean {
  return action === 'macro' || (!!PARAMETER_FIELDS[action]?.length && !(SCROLL_ACTIONS as readonly string[]).includes(action))
}

export function copyActionParameters(action: string, source: ActionParameters): ActionParameters {
  const parameters: ActionParameters = {}
  for (const field of PARAMETER_FIELDS[action] || []) {
    Object.assign(parameters, { [field]: source[field] })
  }
  return parameters
}
