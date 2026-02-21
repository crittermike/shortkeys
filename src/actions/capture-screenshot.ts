import { executeScript } from '../utils/execute-script'

const MAX_HEIGHT = 16348
const PROTOCOL_VERSION = '1.3'

async function sendCommand(tabId: number, method: string, params?: any, waitMs = 0): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      browser.debugger.sendCommand({ tabId }, method, params, (res: any) =>
        setTimeout(() => resolve(res), waitMs),
      )
    } catch (e) {
      reject(e)
    }
  })
}

async function getBodyScrollHeight(): Promise<number> {
  const result = await executeScript(() => document.body.scrollHeight)
  return result?.[0]?.result ?? 0
}

async function downloadBase64File(filename: string, data: string): Promise<void> {
  const res = await fetch(data)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

export default async function captureScreenshot(
  { fullsize = false, force = false } = {},
): Promise<void> {
  const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
  const { id: tabId, url, height: defaultHeight, width } = tab

  browser.debugger.attach({ tabId: tabId! }, PROTOCOL_VERSION, async () => {
    try {
      let height = defaultHeight!
      if (fullsize) {
        height = force ? MAX_HEIGHT : await getBodyScrollHeight()
      }

      await sendCommand(
        tabId!,
        'Emulation.setDeviceMetricsOverride',
        { height, width, mobile: false, deviceScaleFactor: 0 },
        200,
      )

      const { data } = await sendCommand(tabId!, 'Page.captureScreenshot')
      const filename = `${new URL(url!).hostname}.png`
      const base64 = `data:image/png;base64,${data}`
      executeScript(downloadBase64File, [filename, base64])
    } finally {
      browser.debugger.detach({ tabId: tabId! })
    }
  })
}
