import type { KeySetting } from '@/utils/url-matching'
import { MAX_MACRO_STEPS } from '@/actions/action-handlers'
import { useShortcuts } from './useShortcuts'
import { copyActionParameters } from '@/utils/action-parameters'

export function useMacros() {
  const { expandedRow } = useShortcuts()

  function initMacroSteps(row: KeySetting) {
    if (!row.macroSteps) row.macroSteps = []
  }

  function addMacroStep(row: KeySetting) {
    initMacroSteps(row)
    if (row.macroSteps!.length >= MAX_MACRO_STEPS) return
    row.macroSteps!.push({ action: '' })
  }

  function removeMacroStep(row: KeySetting, stepIndex: number) {
    if (row.macroSteps) row.macroSteps.splice(stepIndex, 1)
  }

  function moveMacroStep(row: KeySetting, stepIndex: number, direction: 'up' | 'down') {
    if (!row.macroSteps) return
    const target = direction === 'up' ? stepIndex - 1 : stepIndex + 1
    if (target < 0 || target >= row.macroSteps.length) return
    const temp = row.macroSteps[stepIndex]
    row.macroSteps[stepIndex] = row.macroSteps[target]
    row.macroSteps[target] = temp
  }

  function convertToMacro(row: KeySetting, index: number) {
    const previousAction = row.action
    row.action = 'macro'
    row.macroSteps = previousAction ? [{ action: previousAction, ...copyActionParameters(previousAction, row) }] : []
    expandedRow.value = index
  }

  function convertToSingleAction(row: KeySetting) {
    const firstStep = row.macroSteps?.[0]
    const firstAction = firstStep?.action || ''
    row.action = firstAction
    Object.assign(row, copyActionParameters(firstAction, firstStep || {}))
    row.macroSteps = undefined
  }

  return {
    MAX_MACRO_STEPS,
    initMacroSteps,
    addMacroStep,
    removeMacroStep,
    moveMacroStep,
    convertToMacro,
    convertToSingleAction,
  }
}
