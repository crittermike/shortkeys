/// <reference path='../browser.d.ts' />
/**
 * Max height is 16,348px due to a limitation of Chromium.
 * Record url: https://bugs.chromium.org/p/chromium/issues/detail?id=770769&desc=2
 */
const MAX_HEIGHT = 16348

/**
 *  CaptureScreenshot works since 1.3, tagged at Chrome 64.
 *  Doc url: https://chromedevtools.github.io/devtools-protocol/1-3/Page/#method-captureScreenshot
 */
const PROTOCOL_VERSION = '1.3'

/**
 * Promisify debugger.sendCommand
 * @param {number} tabId
 * @param {string} method
 * @param {*} params
 * @param {number} [waitMilliseconds=0]
 * @returns {Promise<*>}
 */
async function sendCommand(tabId, method, params, waitMilliseconds = 0) {
  return new Promise((resolve, reject) => {
    try {
      browser.debugger.sendCommand({tabId}, method, params, (res) =>
        setTimeout(() => resolve(res), waitMilliseconds)
      )
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Get document.body.scrollHeight
 * @returns {Promise<number>}
 */
async function getBodyScrollHeight() {
  const height = await browser.tabs.executeScript({
    code: 'document.body.scrollHeight',
  })
  return height[0]
}

/**
 * Convert base64 data to a blob and download
 * @param {string} filename download filename
 * @param {string} data base64 string
 * @returns {Promise<void>}
 */
async function downloadBase64File(filename, data) {
  const res = await fetch(data)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

/**
 * Use chrome remote debugging protocol to capture screenshot.
 * @param {object} param0
 * @param {boolean} param0.fullsize Whether to capture full size screenshot.
 * @param {boolean} param0.force Whether to force set browser height to max height.
 * @returns {Promise<void>}
 */
async function captureScreenshot({fullsize = false, force = false} = {}) {
  const [
    {id: tabId, url, height: defaultHeight, width},
  ] = await browser.tabs.query({
    currentWindow: true,
    active: true,
  })

  browser.debugger.attach({tabId}, PROTOCOL_VERSION, async () => {
    try {
      let height = defaultHeight
      if (fullsize) {
        height = force ? MAX_HEIGHT : await getBodyScrollHeight()
      }
      /**
       * When debugger send command, browser will display a notice.
       * That will collapse window.innerHeight.
       * So the screenshot's height is smaller than viewport.
       * take this step can make a fix.
       */
      await sendCommand(
        tabId,
        'Emulation.setDeviceMetricsOverride',
        {
          height,
          width,
          mobile: false,
          deviceScaleFactor: 0,
        },
        /**
         * Wait until view size changed
         */
        200
      )

      /**
       * Get screenshot png base64 data
       */
      const {data} = await sendCommand(tabId, 'Page.captureScreenshot')
      const filename = `${new URL(url).hostname}.png`
      const base64 = `data:image/png;base64,${data}`
      downloadBase64File(filename, base64)
    } finally {
      browser.debugger.detach({tabId})
    }
  })
}

export default captureScreenshot
