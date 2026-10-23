import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'

const evidenceDir = process.env.EVIDENCE_DIR || 'evidence/local'
const dimensions = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 320, height: 740 },
  { name: 'landscape', width: 844, height: 390 },
]

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('h1')).toBeVisible()
}

for (const size of dimensions) {
  test(`composition, accessibility and runtime: ${size.name}`, async ({ page, baseURL }) => {
    await mkdir(evidenceDir, { recursive: true })
    const errors: string[] = []
    const failedRequests: string[] = []
    const externalRequests: string[] = []
    const origin = new URL(baseURL!).origin
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('requestfailed', request => failedRequests.push(`${request.url()} ${request.failure()?.errorText}`))
    page.on('request', request => {
      const url = request.url()
      if (/^https?:/.test(url) && new URL(url).origin !== origin) externalRequests.push(url)
    })
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
    await page.setViewportSize(size)
    await page.goto('./')
    await settle(page)
    await expect(page.locator('body')).toContainText(/fictional/i)
    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    expect(overflow.scroll, `horizontal overflow at ${size.width}px`).toBeLessThanOrEqual(overflow.client + 1)
    await page.screenshot({ path: `${evidenceDir}/${size.name}.png`, fullPage: true, animations: 'disabled' })
    await page.screenshot({ path: `${evidenceDir}/${size.name}-viewport.png`, animations: 'disabled' })
    if (size.name === 'desktop') {
      await page.locator('.hero').screenshot({ path: `${evidenceDir}/hero.png`, animations: 'disabled' })
      for (const act of ['signal', 'fracture', 'afterimage']) await page.locator(`.act-${act}`).screenshot({ path: `${evidenceDir}/act-${act}.png`, animations: 'disabled' })
    }
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    await writeFile(`${evidenceDir}/axe-${size.name}.json`, JSON.stringify(axe.violations, null, 2))
    expect(axe.violations, `${size.name} axe violations`).toEqual([])
    expect(errors).toEqual([])
    expect(failedRequests).toEqual([])
    expect(externalRequests).toEqual([])
  })
}

test('keyboard focus, reduced motion and native scroll history', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await settle(page)
  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement)) return null
    const style = getComputedStyle(element)
    return { tag: element.tagName, text: element.textContent, visible: element.matches(':focus-visible'), outline: style.outlineStyle, width: style.outlineWidth }
  })
  expect(focus?.visible).toBe(true)
  expect(focus?.outline).not.toBe('none')
  expect(focus?.width).not.toBe('0px')
  await page.keyboard.press('Enter')
  await expect(page.locator('#programme')).toBeFocused()
  const durations = await page.locator('body *').evaluateAll(elements => elements.flatMap(element => {
    const style = getComputedStyle(element)
    return style.animationName === 'none' ? [] : style.animationDuration.split(',').map(duration => Number.parseFloat(duration))
  }))
  expect(durations.every(duration => duration <= 0.001)).toBe(true)
  const programmeLink = page.locator('nav a[href="#programme"]').first()
  await programmeLink.click()
  await expect(page).toHaveURL(/#programme$/)
  await expect(page.locator('#programme')).toBeInViewport()
  await page.locator('a[href="#poster"]').first().click()
  await expect(page).toHaveURL(/#poster$/)
  await page.goBack()
  await expect(page).toHaveURL(/#programme$/)
  await page.goForward()
  await expect(page).toHaveURL(/#poster$/)
  await page.keyboard.press('Home')
  const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
  expect(smooth).not.toBe('smooth')
})

test('programme filters, empty state and persistent personal night', async ({ page }) => {
  await page.goto('./')
  const list = page.locator('.programme-list')
  await expect(list.locator('article')).toHaveCount(9)
  const group = page.getByRole('group', { name: 'Filter programme by discipline' })
  for (const type of ['Sound', 'Visual', 'Live']) {
    await group.getByRole('button', { name: type, exact: true }).click()
    await expect(list.locator('article')).toHaveCount(3)
    await expect(group.getByRole('button', { name: type, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(list.locator('.session-type').first()).toContainText(type)
  }
  await group.getByRole('button', { name: 'All encounters', exact: true }).click()
  await page.getByRole('button', { name: /^My night/ }).click()
  await expect(list.locator('article')).toHaveCount(0)
  await expect(list).toContainText('Your night is still an open canvas.')
  await page.getByRole('button', { name: /Explore all encounters/ }).click()
  await expect(list.locator('article')).toHaveCount(9)
  await page.getByRole('button', { name: 'Save Soft circuit', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remove Soft circuit', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Save Retinal memory', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remove Soft circuit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove Retinal memory', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^My night/ }).click()
  await expect(list.locator('article')).toHaveCount(2)
  await group.getByRole('button', { name: 'Live', exact: true }).click()
  await expect(list).toContainText('No encounters in this frequency.')
  await group.getByRole('button', { name: 'All encounters', exact: true }).click()
  await page.getByRole('button', { name: 'Remove Soft circuit', exact: true }).click()
  await expect(list.locator('article')).toHaveCount(1)
  await page.reload()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('afterhours:night:v1')!))
  expect(stored).toEqual({ version: 1, ids: ['retinal-memory'] })
})

for (const raw of ['{broken', '{"version":2,"ids":["soft-circuit"]}', '{"version":1,"ids":["soft-circuit","soft-circuit","unknown",3]}']) {
  test(`corrupted local selection recovers: ${raw.slice(0, 25)}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('afterhours:night:v1', value), raw)
    await page.goto('./')
    await settle(page)
    await expect(page.locator('.programme-list article')).toHaveCount(9)
    const knownValid = raw.includes('unknown')
    await expect(page.getByRole('button', { name: /^My night/ })).toContainText(knownValid ? '01' : '00')
    await page.getByRole('button', { name: 'Save Retinal memory', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Remove Retinal memory', exact: true })).toBeVisible()
  })
}

test('quota errors preserve session functionality', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('QA simulated quota', 'QuotaExceededError') }
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Save Soft circuit', exact: true }).click()
  await expect(page.locator('.programme-status [role="status"]')).toContainText('Storage is unavailable. Your selection works for this visit.')
  await expect(page.getByRole('button', { name: 'Remove Soft circuit', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^My night/ }).click()
  await expect(page.locator('.programme-list article')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Save Soft circuit', exact: true })).toBeVisible()
})

test('repeated and interrupted selection actions stay consistent', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Save Soft circuit', exact: true }).click()
  await page.getByRole('button', { name: 'Remove Soft circuit', exact: true }).click()
  await page.getByRole('button', { name: 'Save Soft circuit', exact: true }).click()
  await page.locator('a[href="#poster"]').first().click()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Remove Soft circuit', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remove Soft circuit', exact: true })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('afterhours:night:v1')!))
  expect(stored.ids).toEqual(['soft-circuit'])
})

test('poster colour, range and valid SVG/PNG downloads', async ({ page }) => {
  await mkdir(`${evidenceDir}/exports`, { recursive: true })
  await page.goto('./')
  const studio = page.locator('#poster')
  const range = studio.getByRole('slider')
  await range.focus()
  await page.keyboard.press('End')
  await expect(range).toHaveValue('12')
  await expect(studio.getByRole('img')).toHaveAttribute('alt', /edition 12/)
  await page.keyboard.press('Home')
  await expect(range).toHaveValue('0')
  for (const theme of ['lime', 'coral', 'blue']) {
    await studio.getByRole('button', { name: theme, exact: true }).click()
    await expect(studio.getByRole('button', { name: theme, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(studio.getByRole('img')).toHaveAttribute('alt', new RegExp(`in ${theme}`))
    const downloadPromise = page.waitForEvent('download')
    await studio.getByRole('button', { name: 'Export SVG', exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(`afterhours-${theme}.svg`)
    const path = `${evidenceDir}/exports/${download.suggestedFilename()}`
    await download.saveAs(path)
    const svg = await readFile(path, 'utf8')
    expect(svg).toContain('FICTIONAL DESIGN CONCEPT')
    expect(svg).toContain('width="600" height="800"')
    expect(svg).not.toMatch(/<script|<foreignObject|https?:\/\/(?!www.w3.org)/i)
    const parseError = await page.evaluate(source => new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('parsererror')?.textContent, svg)
    expect(parseError).toBeUndefined()
  }
  const pngPromise = page.waitForEvent('download')
  await studio.getByRole('button', { name: 'Export PNG', exact: true }).click()
  const pngDownload = await pngPromise
  expect(pngDownload.suggestedFilename()).toBe('afterhours-blue.png')
  const pngPath = `${evidenceDir}/exports/${pngDownload.suggestedFilename()}`
  await pngDownload.saveAs(pngPath)
  const png = await readFile(pngPath)
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(png.readUInt32BE(16)).toBe(1200)
  expect(png.readUInt32BE(20)).toBe(1600)
  await expect(studio.locator('.poster-status')).toContainText('PNG download started.')
  await expect(studio.getByRole('button', { name: 'Export PNG', exact: true })).toBeEnabled()
  await writeFile(`${evidenceDir}/poster-pointer-focus.json`, JSON.stringify(await page.evaluate(() => {
    const skip = document.querySelector('.skip-link')!
    return { active: document.activeElement?.outerHTML.slice(0, 700), skipFocused: skip.matches(':focus'), skipTransform: getComputedStyle(skip).transform, skipRectangle: skip.getBoundingClientRect().toJSON() }
  }), null, 2))
  await studio.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${evidenceDir}/poster-blue.png`, animations: 'disabled' })
})

test('poster rapid clicks are guarded and unavailable PNG falls back to SVG', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
  })
  await page.goto('./')
  const studio = page.locator('#poster')
  await studio.getByRole('button', { name: 'Export PNG', exact: true }).click()
  await expect(studio.locator('.poster-status')).toContainText('PNG is unavailable in this browser. Try SVG instead.')
  await expect(studio.getByRole('button', { name: 'Export SVG', exact: true })).toBeEnabled()
  const downloads: string[] = []
  page.on('download', download => downloads.push(download.suggestedFilename()))
  const firstDownload = page.waitForEvent('download')
  await studio.getByRole('button', { name: 'Export SVG', exact: true }).evaluate(button => {
    for (let count = 0; count < 10; count += 1) (button as HTMLButtonElement).click()
  })
  await firstDownload
  await expect(studio.locator('.poster-status')).toContainText('SVG download started.')
  await page.waitForTimeout(200)
  expect(downloads).toEqual(['afterhours-lime.svg'])
})

test('interrupted PNG export leaves a fresh page functional', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      window.setTimeout(() => original.call(this, callback, ...args), 300)
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
  await page.reload()
  await settle(page)
  await expect(page.getByRole('button', { name: 'Export PNG', exact: true })).toBeEnabled()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export SVG', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('afterhours-lime.svg')
})

test('poster export preserves keyboard context', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true })
  await page.goto('./')
  const focusEvidence: object[] = []
  for (const format of ['SVG', 'PNG']) {
    const button = page.getByRole('button', { name: `Export ${format}`, exact: true })
    await button.focus()
    const download = page.waitForEvent('download')
    await page.keyboard.press('Enter')
    await download
    focusEvidence.push(await page.evaluate(formatName => ({ format: formatName, active: document.activeElement?.outerHTML.slice(0, 700), skipFocused: document.querySelector('.skip-link')?.matches(':focus'), focusVisible: document.activeElement?.matches(':focus-visible') }), format))
    await writeFile(`${evidenceDir}/export-focus.json`, JSON.stringify(focusEvidence, null, 2))
    await expect(button).toBeFocused()
    await expect(page.locator('.skip-link')).not.toBeFocused()
  }
})

test('ambient is opt-in, mute closes contexts and interruptions never resume it', async ({ page }) => {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []
    Object.assign(window, { __qaAudio: contexts })
    const Original = window.AudioContext
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this) }
    }
  })
  await page.goto('./')
  await settle(page)
  expect(await page.evaluate(() => (window as typeof window & { __qaAudio: AudioContext[] }).__qaAudio.length)).toBe(0)
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => (window as typeof window & { __qaAudio: AudioContext[] }).__qaAudio.map(context => context.state))).toEqual(['running'])
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __qaAudio: AudioContext[] }).__qaAudio.every(context => context.state === 'closed'))).toBe(true)
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __qaAudio: AudioContext[] }).__qaAudio.every(context => context.state === 'closed'))).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __qaAudio: AudioContext[] }).__qaAudio.every(context => context.state === 'closed'))).toBe(true)
  await page.goto('about:blank')
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible()
})

test('rapid ambient cancellation stays silent; unavailable audio keeps content usable', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext
    const resume = Original.prototype.resume
    Original.prototype.resume = async function () {
      await resume.call(this)
      await new Promise(resolve => window.setTimeout(resolve, 150))
    }
    const contexts: AudioContext[] = []
    Object.assign(window, { __qaAudio: contexts })
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this) }
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel sound', exact: true }).click()
  await page.waitForTimeout(200)
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => (window as typeof window & { __qaAudio: AudioContext[] }).__qaAudio.every(context => context.state === 'closed'))).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined })
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined })
  })
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sound unavailable', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.sound-toggle__status')).toContainText('Your browser could not start audio.')
  await page.getByRole('group', { name: 'Filter programme by discipline' }).getByRole('button', { name: 'Sound', exact: true }).click()
  await expect(page.locator('.programme-list article')).toHaveCount(3)
})

test('measured production navigation and input response', async ({ page, browserName, browser }) => {
  await mkdir(evidenceDir, { recursive: true })
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, longTasks: [] as number[], events: [] as object[] }
    Object.assign(window, { __qaMetrics: metrics })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!entry.hadRecentInput) metrics.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.longTasks.push(entry.duration) }).observe({ type: 'longtask', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.events.push(entry.toJSON()) }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit)
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('./')
  await settle(page)
  await page.waitForTimeout(500)
  const filterResponseMs = await page.evaluate(() => new Promise<number>(resolve => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('.filter-list button')].find(element => element.textContent === 'Sound')!
    const start = performance.now()
    button.click()
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - start)))
  }))
  await expect(page.locator('.programme-list article')).toHaveCount(3)
  const measurements = await page.evaluate(() => ({
    navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()),
    resources: performance.getEntriesByType('resource').map(entry => entry.toJSON()),
    paints: performance.getEntriesByType('paint').map(entry => entry.toJSON()),
    metrics: (window as typeof window & { __qaMetrics: { lcp: number; cls: number; longTasks: number[]; events: object[] } }).__qaMetrics,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    memory: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize,
    domNodes: document.querySelectorAll('*').length,
    devicePixelRatio: window.devicePixelRatio,
  }))
  const report = {
    at: new Date().toISOString(), browserName, browserVersion: browser.version(), viewport: '1440x1000',
    host: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem() },
    conditions: 'Headless installed Chrome with --mute-audio; fresh isolated context and cold browser cache; production preview or PLAYWRIGHT_BASE_URL; no CPU/network throttle; no warmup; navigation sample 500ms after heading/font readiness. Single synthetic sample, not Lighthouse or field Core Web Vitals. Filter response is DOM click to second requestAnimationFrame, not INP.',
    filterResponseMs,
    ...measurements,
  }
  await writeFile(`${evidenceDir}/performance.json`, JSON.stringify(report, null, 2))
  expect(measurements.metrics.cls).toBeLessThanOrEqual(0.1)
  expect(measurements.metrics.lcp).toBeGreaterThan(0)
  expect(measurements.metrics.lcp).toBeLessThan(5000)
})

test('measured constrained mobile navigation', async ({ page, context, browser }) => {
  await mkdir(evidenceDir, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, longTasks: [] as number[] }
    Object.assign(window, { __qaMetrics: metrics })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!entry.hadRecentInput) metrics.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.longTasks.push(entry.duration) }).observe({ type: 'longtask', buffered: true })
  })
  await page.goto('./')
  await settle(page)
  await page.waitForTimeout(500)
  const measurements = await page.evaluate(() => ({
    navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()),
    resources: performance.getEntriesByType('resource').map(entry => entry.toJSON()),
    paints: performance.getEntriesByType('paint').map(entry => entry.toJSON()),
    metrics: (window as typeof window & { __qaMetrics: { lcp: number; cls: number; longTasks: number[] } }).__qaMetrics,
    domNodes: document.querySelectorAll('*').length,
    userAgent: navigator.userAgent,
  }))
  await writeFile(`${evidenceDir}/performance-mobile-4x.json`, JSON.stringify({
    at: new Date().toISOString(), browserVersion: browser.version(), viewport: '390x844',
    host: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem() },
    conditions: 'Headless installed Chrome with --mute-audio; fresh isolated context; cache disabled via CDP; CPU4x slowdown; network150ms latency,200000bytes/sec download (1.6Mbps),93750bytes/sec upload (0.75Mbps). One synthetic navigation sample, not Lighthouse or field Core Web Vitals.',
    ...measurements,
  }, null, 2))
  expect(measurements.metrics.lcp).toBeGreaterThan(0)
  expect(measurements.metrics.lcp).toBeLessThan(10000)
  expect(measurements.metrics.cls).toBeLessThanOrEqual(0.1)
})
