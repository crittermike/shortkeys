if (typeof browser === "undefined") {
  var browser = chrome;
}

export async function executeScript(callback, args) {
  const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
  return browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: callback,
    args
  });
}
