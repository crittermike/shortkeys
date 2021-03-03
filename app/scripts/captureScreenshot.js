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
      browser.debugger.sendCommand({ tabId }, method, params, (res) =>
        setTimeout(() => resolve(res), waitMilliseconds)
      );
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Use chrome remote debugging protocol to capture screenshot.
 * @param {typeof chrome} browser
 */
async function captureScreenshot() {
  const [{ id: tabId, url, height, width }] = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });

  /**
   *  CaptureScreenshot works since 1.3, tagged at Chrome 64
   *  https://chromedevtools.github.io/devtools-protocol/1-3/Page/#method-captureScreenshot
   */
  const PROTOCOL_VERSION = "1.3";
  browser.debugger.attach({ tabId }, PROTOCOL_VERSION, async () => {
    /**
     * When debugger send command, browser will display a notice.
     * And it will collapse window.innerHeight.
     * So the screenshot's height is smaller than viewport.
     * take this step can make a fix.
     */
    await sendCommand(
      tabId,
      "Emulation.setDeviceMetricsOverride",
      {
        height,
        width,
        mobile: false,
        deviceScaleFactor: 0,
        scale: 0.8,
      },
      /**
       * Wait until view size changed
       */
      300
    );
    sendCommand(tabId, "Page.captureScreenshot").then((res) => {
      browser.tabs.executeScript(tabId, {
        code: `
          fetch("data:image/png;base64,${res.data}")
            .then(
              (res) => res.blob().then(
                blob => {
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download="${url}.png"
                  a.click()
                }
              )
            );`,
      });
      browser.debugger.detach({ tabId });
    });
  });
}

export default captureScreenshot;
