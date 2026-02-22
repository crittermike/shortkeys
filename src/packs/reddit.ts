import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'reddit',
  name: 'Reddit Navigation',
  icon: '🤖',
  description: 'Navigate Reddit with your keyboard — scroll posts, vote, open comments, and browse subreddits.',
  color: '#ff4500',
  shortcuts: [
    { key: 'j', action: 'javascript', label: 'Next post', code: "(() => { const posts = document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link'); const scrollY = window.scrollY; for (const p of posts) { if (p.getBoundingClientRect().top > 10) { p.scrollIntoView({behavior: 'smooth', block: 'start'}); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'k', action: 'javascript', label: 'Previous post', code: "(() => { const posts = [...document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link')]; for (let i = posts.length - 1; i >= 0; i--) { if (posts[i].getBoundingClientRect().top < -10) { posts[i].scrollIntoView({behavior: 'smooth', block: 'start'}); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'a', action: 'javascript', label: 'Upvote current post', code: "(() => { const posts = document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link'); for (const p of posts) { if (p.getBoundingClientRect().top >= -10 && p.getBoundingClientRect().top <= 10) { const btn = p.querySelector('[aria-label=\"upvote\"], .arrow.up'); if (btn) btn.click(); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'z', action: 'javascript', label: 'Downvote current post', code: "(() => { const posts = document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link'); for (const p of posts) { if (p.getBoundingClientRect().top >= -10 && p.getBoundingClientRect().top <= 10) { const btn = p.querySelector('[aria-label=\"downvote\"], .arrow.down'); if (btn) btn.click(); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'enter', action: 'javascript', label: 'Open comments', code: "(() => { const posts = document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link'); for (const p of posts) { if (p.getBoundingClientRect().top >= -10 && p.getBoundingClientRect().top <= 50) { const link = p.querySelector('a[data-click-id=\"comments\"], a[data-testid=\"comments-page-link-num-comments\"], a.bylink.comments'); if (link) link.click(); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'x', action: 'javascript', label: 'Expand/collapse media', code: "(() => { const posts = document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link'); for (const p of posts) { if (p.getBoundingClientRect().top >= -10 && p.getBoundingClientRect().top <= 50) { const expander = p.querySelector('[aria-label=\"expand\"], .expando-button'); if (expander) expander.click(); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'g f', action: 'javascript', label: 'Go to front page', code: "window.location.href = 'https://www.reddit.com/'", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'g s', action: 'javascript', label: 'Go to subreddit search', code: "document.querySelector('input[type=\"search\"], #header-search-bar, [name=\"q\"]')?.focus()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'd', action: 'toggledarkmode', label: 'Toggle dark mode', blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
    { key: 'h', action: 'javascript', label: 'Hide post', code: "(() => { const posts = document.querySelectorAll('article, [data-testid=\"post-container\"], .thing.link'); for (const p of posts) { if (p.getBoundingClientRect().top >= -10 && p.getBoundingClientRect().top <= 50) { const hide = p.querySelector('[aria-label=\"hide\"], .hide-button a, button[aria-label=\"Hide\"]'); if (hide) hide.click(); return; } } })()", blacklist: 'whitelist', sites: '*reddit.com*', sitesArray: ['*reddit.com*'] },
  ],
}

export default pack
