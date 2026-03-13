export const TAB_GROUP_PERMISSION_MESSAGE = 'Tab group permission is required for this action'
export const TAB_GROUP_MOVE_PERMISSION_MESSAGE = 'Tab group permission is required to move tabs between groups'

export async function requestTabGroupsPermission(): Promise<boolean> {
  if (!chrome.permissions?.request) return true
  try {
    return await chrome.permissions.request({ permissions: ['tabGroups'] })
  } catch (error) {
    console.error('[Shortkeys] Failed to request tabGroups permission:', error)
    return false
  }
}
