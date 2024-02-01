function injectScript (src) {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(src);
    //s.onload = () => {console.log('removed'); s.remove()};
    (document.head || document.documentElement).append(s);
}

injectScript('scripts/script-to-inject.js')
