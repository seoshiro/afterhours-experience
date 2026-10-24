import { expect, test } from '@playwright/test'

test('rapid save feedback never delays the saved state or keyboard removal', async ({ page }) => {
  await page.goto('./')
  const button = page.locator('button[data-session-id]').first()
  for (let i = 0; i < 7; i++) await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^My night/ })).toContainText('01')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await button.focus()
  await button.press('Enter')
  await expect(button).toBeFocused()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: /^My night/ })).toContainText('00')
  await page.reload()
  await expect(page.locator('button[data-session-id]').first()).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: /^My night/ })).toContainText('00')
  await page.locator('button[data-session-id]').first().evaluate(element => {
    element.addEventListener('click', () => {
      const frames: string[] = []
      const sample = () => {
        frames.push(getComputedStyle(element.querySelector('span')!).transform)
        if (frames.length < 8) requestAnimationFrame(sample)
        else element.setAttribute('data-feedback-samples', JSON.stringify(frames))
      }
      requestAnimationFrame(sample)
    }, { once: true })
  })
  await page.locator('button[data-session-id]').first().click()
  await expect(page.locator('button[data-session-id]').first()).toHaveAttribute('data-feedback-samples', /^\[/)
  const frames = JSON.parse((await page.locator('button[data-session-id]').first().getAttribute('data-feedback-samples'))!) as string[]
  // A zero-duration state update can snap on the next rendering frame. Both
  // endpoints are valid; any interpolated rotation/scale would violate reduce.
  // Compare numerically because matrix serialization includes IEEE-754 noise.
  const matrices = frames.map(frame => frame.slice(7, -1).split(',').map(Number))
  const endpoints = [[0, -1, 1, 0, 0, 0], [1.1, 0, 0, 1.1, 0, 0]]
  const matches = (matrix: number[], endpoint: number[]) => matrix.every((value, i) => Math.abs(value - endpoint[i]) < 1e-6)
  expect(matrices.every(matrix => endpoints.some(endpoint => matches(matrix, endpoint)))).toBe(true)
  expect(matrices.slice(-3).every(matrix => matches(matrix, endpoints[1]))).toBe(true)
})
