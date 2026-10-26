import { test, expect } from './fixtures'
import { By, Key } from 'selenium-webdriver'
import { CONTROL } from '../support/keys'

test.beforeEach(async ({ ff }) => {
  await ff.seed([CONTROL])
})

test('a shortcut created in options fires on a page and persists', async ({ ff, server }) => {
  await ff.addShortcut('j', 'Scroll down')
  await ff.save()
  await ff.openOptions()
  expect(await ff.driver.findElements(By.css('.shortcut-card'))).toHaveLength(2)

  await ff.openPage(server.url('/scroll'))
  await ff.press('j')
  await expect.poll(async () => (await ff.scroll()).y).toBeGreaterThan(0)
})

test('scrolling works while a link has focus (#1037)', async ({ ff, server }) => {
  await ff.addShortcut('j', 'Scroll down')
  await ff.save()

  await ff.openPage(server.url('/scroll'))
  await ff.driver.executeScript("const a = document.createElement('a'); a.href = '#'; a.textContent = 'link'; document.body.prepend(a); a.focus()")
  await ff.press('j')
  await expect.poll(async () => (await ff.scroll()).y).toBeGreaterThan(0)
})

test('saving updates open tabs without a reload, and disabled shortcuts stop firing', async ({ ff, server }) => {
  const optionsTab = await ff.driver.getWindowHandle()
  await ff.openPage(server.url('/scroll'))
  const pageTab = await ff.driver.getWindowHandle()

  await ff.driver.switchTo().window(optionsTab)
  await ff.driver.switchTo().frame(await ff.driver.findElement(By.id('frame')))
  const card = await ff.addShortcut('j', 'Scroll down')
  await ff.save()

  await ff.driver.switchTo().window(pageTab)
  await expect.poll(async () => {
    await ff.press('j')
    return (await ff.scroll()).y
  }).toBeGreaterThan(0)

  await ff.driver.switchTo().window(optionsTab)
  await ff.driver.switchTo().frame(await ff.driver.findElement(By.id('frame')))
  await (await card.findElement(By.css('.toggle'))).click()
  await ff.save()

  await ff.driver.switchTo().window(pageTab)
  await expect.poll(async () => {
    await ff.driver.executeScript('scrollTo(0, 0)')
    await ff.press('j')
    await ff.flush()
    return (await ff.scroll()).y
  }).toBe(0)
})

test('navigation shortcuts go to a configured URL and back', async ({ ff, server }) => {
  await ff.addShortcut('g', 'Go to URL')
  await (await ff.css('.shortcut-details input.field-input')).sendKeys(server.url('/b'))
  await ff.addShortcut('h', 'Go back')
  await ff.save()

  await ff.openPage(server.url('/a'))
  await ff.press('g')
  await ff.driver.wait(async () => (await ff.driver.getCurrentUrl()) === server.url('/b'), 10_000)
  await ff.waitForBindings()
  await ff.press('h')
  await ff.driver.wait(async () => (await ff.driver.getCurrentUrl()) === server.url('/a'), 10_000)
})

test('tab shortcuts open and close tabs', async ({ ff, server }) => {
  await ff.addShortcut('t', 'New tab')
  await ff.addShortcut('x', 'Close tab')
  await ff.save()

  await ff.openPage(server.url('/a'))
  const handles = await ff.driver.getAllWindowHandles()
  await ff.press('t')
  await ff.driver.wait(async () => (await ff.driver.getAllWindowHandles()).length === handles.length + 1, 10_000)

  await ff.openPage(server.url('/b'))
  const b = await ff.driver.getWindowHandle()
  // The tab can close before keyup is delivered.
  await ff.press('x').catch(async (error) => {
    if ((await ff.driver.getAllWindowHandles()).includes(b)) throw error
  })
  await ff.driver.wait(async () => !(await ff.driver.getAllWindowHandles()).includes(b), 10_000)
})

test('per-shortcut site rules limit where a shortcut fires', async ({ ff, server }) => {
  await ff.openDetails(await ff.addShortcut('j', 'Scroll down'))
  await ff.click('.seg-btn', 'Only on')
  await (await ff.css('textarea.site-patterns')).sendKeys(`*localhost:${server.port}*`)
  await ff.save()

  await ff.openPage(server.url('/scroll'))
  await ff.press('j')
  await expect.poll(async () => (await ff.scroll()).y).toBeGreaterThan(0)

  await ff.openPage(server.altUrl('/scroll'))
  await ff.press('j')
  await ff.flush()
  expect((await ff.scroll()).y).toBe(0)
})

test('shortcuts are ignored while typing unless enabled for inputs', async ({ ff, server }) => {
  await ff.addShortcut('j', 'Scroll down')
  await ff.openDetails(await ff.addShortcut('alt+d', 'Toggle dark mode'))
  await ff.click('.toggle-row-inline .toggle')
  await ff.save()

  await ff.openPage(server.url('/form'))
  for (const id of ['text', 'area', 'editable', 'box']) {
    await (await ff.css(`#${id}`)).click()
    await ff.press('j')
    await ff.driver.executeScript('document.activeElement.blur()')
    await ff.flush()
    expect((await ff.scroll()).y, id).toBe(0)
  }
  expect(await (await ff.css('#text')).getAttribute('value')).toBe('j')

  await (await ff.css('#text')).click()
  await ff.chord(Key.ALT, 'd')
  await ff.driver.wait(async () => (await ff.driver.findElements(By.id('__shortkeys-darkmode'))).length > 0, 10_000)
})
