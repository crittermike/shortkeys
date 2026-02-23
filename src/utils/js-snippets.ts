export interface JsSnippet {
  id: string
  name: string
  description: string
  category: string
  code: string
}

export const SNIPPET_CATEGORIES = [
  'Page Tools',
  'Productivity',
  'Content',
  'Developer',
  'Media',
] as const

export const JS_SNIPPETS: JsSnippet[] = [
  // -- Page Tools --
  {
    id: 'dark-mode',
    name: 'Dark mode',
    description: 'Invert page colors for comfortable reading. Images stay normal.',
    category: 'Page Tools',
    code: `(function() {
  const id = '__sk_darkmode';
  const existing = document.getElementById(id);
  if (existing) { existing.remove(); return; }
  const s = document.createElement('style');
  s.id = id;
  s.textContent = 'html{filter:invert(1) hue-rotate(180deg)!important}img,video,picture,canvas,svg,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}';
  document.documentElement.appendChild(s);
})();`,
  },
  {
    id: 'reader-mode',
    name: 'Reader mode',
    description: 'Strip everything except the main content for distraction-free reading.',
    category: 'Page Tools',
    code: `(function() {
  const article = document.querySelector('article') || document.querySelector('[role="main"]') || document.querySelector('main') || document.body;
  const content = article.innerHTML;
  document.body.innerHTML = '<div style="max-width:700px;margin:40px auto;padding:0 20px;font-family:Georgia,serif;font-size:18px;line-height:1.8;color:#333">' + content + '</div>';
  document.body.style.background = '#fafafa';
})();`,
  },
  {
    id: 'hide-sticky',
    name: 'Hide sticky headers & banners',
    description: 'Remove all fixed/sticky positioned elements (cookie banners, nav bars, etc.).',
    category: 'Page Tools',
    code: `document.querySelectorAll('*').forEach(el => {
  const pos = getComputedStyle(el).position;
  if (pos === 'fixed' || pos === 'sticky') el.style.display = 'none';
});`,
  },
  {
    id: 'bigger-text',
    name: 'Increase text size',
    description: 'Make all text on the page 20% larger.',
    category: 'Page Tools',
    code: `document.querySelectorAll('*').forEach(el => {
  const size = parseFloat(getComputedStyle(el).fontSize);
  if (size) el.style.fontSize = (size * 1.2) + 'px';
});`,
  },
  {
    id: 'highlight-links',
    name: 'Highlight all links',
    description: 'Add a bright yellow background to every link on the page.',
    category: 'Page Tools',
    code: `document.querySelectorAll('a').forEach(a => {
  a.style.background = '#ffeb3b';
  a.style.color = '#000';
  a.style.padding = '2px 4px';
  a.style.borderRadius = '3px';
});`,
  },
  {
    id: 'edit-page',
    name: 'Make page editable',
    description: 'Turn the entire page into an editable document. Click anywhere to type.',
    category: 'Page Tools',
    code: `document.designMode = document.designMode === 'on' ? 'off' : 'on';`,
  },

  // -- Productivity --
  {
    id: 'copy-all-links',
    name: 'Copy all links on page',
    description: 'Extract and copy every link URL on the page to your clipboard.',
    category: 'Productivity',
    code: `const links = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href))].join('\\n');
navigator.clipboard.writeText(links);
alert(links.split('\\n').length + ' links copied!');`,
  },
  {
    id: 'word-count',
    name: 'Word count',
    description: 'Count the words on the current page and display the result.',
    category: 'Productivity',
    code: `const text = document.body.innerText;
const words = text.trim().split(/\\s+/).length;
const chars = text.length;
alert('Words: ' + words + '\\nCharacters: ' + chars);`,
  },
  {
    id: 'extract-emails',
    name: 'Extract email addresses',
    description: 'Find and copy all email addresses visible on the page.',
    category: 'Productivity',
    code: `const emails = [...new Set(document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g) || [])];
if (emails.length) { navigator.clipboard.writeText(emails.join('\\n')); alert(emails.length + ' emails copied!'); }
else alert('No emails found on this page.');`,
  },
  {
    id: 'table-to-csv',
    name: 'Export table to CSV',
    description: 'Convert the first table on the page to CSV and copy to clipboard.',
    category: 'Productivity',
    code: `const table = document.querySelector('table');
if (!table) { alert('No table found'); } else {
  const csv = [...table.rows].map(r => [...r.cells].map(c => '"' + c.innerText.replace(/"/g, '""') + '"').join(',')).join('\\n');
  navigator.clipboard.writeText(csv);
  alert('Table copied as CSV (' + table.rows.length + ' rows)');
}`,
  },
  {
    id: 'qr-code',
    name: 'Show QR code for this page',
    description: 'Generate and display a QR code for the current URL.',
    category: 'Productivity',
    code: `const url = encodeURIComponent(location.href);
const img = document.createElement('img');
img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + url;
img.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;border:8px solid white;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.3);cursor:pointer';
img.onclick = () => img.remove();
document.body.appendChild(img);`,
  },

  // -- Content --
  {
    id: 'remove-images',
    name: 'Remove all images',
    description: 'Hide every image on the page for faster reading or less distraction.',
    category: 'Content',
    code: `document.querySelectorAll('img, picture, svg, video, canvas').forEach(el => el.style.display = 'none');`,
  },
  {
    id: 'show-image-sizes',
    name: 'Show image sizes',
    description: 'Overlay the dimensions and file info on every image.',
    category: 'Content',
    code: `document.querySelectorAll('img').forEach(img => {
  const label = document.createElement('div');
  label.textContent = img.naturalWidth + '×' + img.naturalHeight;
  label.style.cssText = 'position:absolute;background:rgba(0,0,0,0.8);color:#0f0;font:bold 11px monospace;padding:2px 6px;border-radius:3px;z-index:999999;pointer-events:none';
  img.style.position = 'relative';
  img.parentElement.style.position = 'relative';
  img.parentElement.appendChild(label);
});`,
  },
  {
    id: 'extract-headings',
    name: 'Show page outline',
    description: 'Display a table of contents from all headings (h1-h6) on the page.',
    category: 'Content',
    code: `const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
const outline = headings.map(h => '  '.repeat(parseInt(h.tagName[1])-1) + h.textContent.trim()).join('\\n');
alert('Page Outline:\\n\\n' + outline);`,
  },
  {
    id: 'scroll-progress',
    name: 'Reading progress bar',
    description: 'Add a thin progress bar at the top showing how far you\'ve scrolled.',
    category: 'Content',
    code: `(function() {
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#4361ee,#7c3aed);z-index:999999;transition:width 0.1s';
  document.body.appendChild(bar);
  function update() { bar.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100) + '%'; }
  window.addEventListener('scroll', update);
  update();
})();`,
  },

  // -- Developer --
  {
    id: 'show-grid',
    name: 'Show layout grid',
    description: 'Outline every element on the page to visualize the layout structure.',
    category: 'Developer',
    code: `document.querySelectorAll('*').forEach(el => {
  el.style.outline = '1px solid rgba(255,0,0,0.2)';
  el.style.outlineOffset = '-1px';
});`,
  },
  {
    id: 'clear-storage',
    name: 'Clear site storage',
    description: 'Clear localStorage, sessionStorage, and cookies for this site.',
    category: 'Developer',
    code: `localStorage.clear();
sessionStorage.clear();
document.cookie.split(';').forEach(c => {
  document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
});
alert('Storage and cookies cleared for ' + location.hostname);`,
  },
  {
    id: 'perf-metrics',
    name: 'Show performance metrics',
    description: 'Display page load time, DOM size, and resource count.',
    category: 'Developer',
    code: `const perf = performance.getEntriesByType('navigation')[0];
const dom = document.querySelectorAll('*').length;
const resources = performance.getEntriesByType('resource').length;
alert('Page Load: ' + Math.round(perf.loadEventEnd - perf.startTime) + 'ms\\nDOM Elements: ' + dom + '\\nResources: ' + resources);`,
  },
  {
    id: 'log-events',
    name: 'Log all events',
    description: 'Log every DOM event to the console for debugging.',
    category: 'Developer',
    code: `const events = ['click','input','change','submit','keydown','keyup','focus','blur','scroll','mouseover'];
events.forEach(e => document.addEventListener(e, ev => console.log('%c' + e, 'color:cyan;font-weight:bold', ev.target), true));
console.log('Logging events:', events.join(', '));`,
  },
  {
    id: 'json-viewer',
    name: 'Pretty print JSON',
    description: 'If the page contains JSON, format and display it nicely.',
    category: 'Developer',
    code: `try {
  const json = JSON.parse(document.body.innerText);
  document.body.innerHTML = '<pre style="padding:20px;font-size:14px;background:#1e293b;color:#e2e8f0;margin:0;min-height:100vh;tab-size:2">' + JSON.stringify(json, null, 2) + '</pre>';
} catch { alert('No valid JSON found on this page.'); }`,
  },

  // -- Media --
  {
    id: 'pip',
    name: 'Picture-in-Picture',
    description: 'Pop the first video out into a floating picture-in-picture window.',
    category: 'Media',
    code: `const video = document.querySelector('video');
if (video) video.requestPictureInPicture();
else alert('No video found on this page.');`,
  },
  {
    id: 'video-speed',
    name: 'Set video speed (2x)',
    description: 'Set all videos on the page to 2x playback speed.',
    category: 'Media',
    code: `document.querySelectorAll('video').forEach(v => v.playbackRate = 2);`,
  },
  {
    id: 'download-images',
    name: 'List all image URLs',
    description: 'Copy URLs of all images on the page to clipboard.',
    category: 'Media',
    code: `const urls = [...new Set([...document.querySelectorAll('img[src]')].map(i => i.src))].join('\\n');
navigator.clipboard.writeText(urls);
alert(urls.split('\\n').length + ' image URLs copied!');`,
  },
  {
    id: 'audio-visualizer',
    name: 'Show audio volume',
    description: 'Display the current volume level of all media elements.',
    category: 'Media',
    code: `document.querySelectorAll('video,audio').forEach((m,i) => {
  alert('Media #' + (i+1) + ': volume=' + Math.round(m.volume*100) + '%, muted=' + m.muted + ', speed=' + m.playbackRate + 'x');
});`,
  },
]
