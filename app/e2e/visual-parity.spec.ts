import { expect, test, type Locator } from '@playwright/test';

const properties = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderRadius', 'fontSize', 'fontWeight', 'lineHeight', 'gap', 'alignItems'] as const;
async function geometry(locator: Locator, dimensions = true) {
  return locator.first().evaluate((node, options) => {
    const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
    const values: Record<string, string | number> = Object.fromEntries(options.properties.map(property => [property, style.getPropertyValue(property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`))]));
    if (options.dimensions) {
      const frame = (node.closest('.as-switch') ?? node.closest('.as'))!.getBoundingClientRect();
      values.width = Math.round(bounds.width * 10) / 10; values.height = Math.round(bounds.height * 10) / 10;
      values.x = Math.round((bounds.x - frame.x) * 10) / 10; values.y = Math.round((bounds.y - frame.y) * 10) / 10;
    }
    return values;
  }, { properties, dimensions });
}

test('shared controls and theory pane retain the rendered canonical jig geometry', async ({ page, context }) => {
  const jig = await context.newPage();
  await jig.setViewportSize({ width: 1560, height: 1100 });
  await page.setViewportSize({ width: 1360, height: 820 });
  await jig.goto('http://127.0.0.1:5181/app'); await page.goto('/?view=current');
  // The approved type is Geist 13/1.4 (surface study, 1 Nov 2026). The jig's .as shell rule still names Inter, so its
  // docked pane renders in Inter; compare geometry in the approved face rather than in that leftover.
  await jig.addStyleTag({ content: '.as { font-family: "Geist", "Inter", system-ui, sans-serif; }' });
  await Promise.all([jig.locator('.as .cur-card[data-pick=t1]').waitFor(), page.locator('.cur-card[data-pick=t1]').waitFor()]);
  await Promise.all([jig.evaluate(() => document.fonts.ready), page.evaluate(() => document.fonts.ready)]);
  for (const selector of ['.as-switch', '.as-switch-btn', '.as-switch-btn svg', '.cur-index a', '.cur-theme', '.cur-card[data-pick=t1]']) {
    await expect.poll(async () => geometry(page.locator(selector))).toEqual(await geometry(jig.locator(`.as ${selector}`)));
  }
  // UI-010 explicitly replaces the jig's 400 weight with 700. Only the heading's intrinsic width may grow;
  // its size, padding, radius, height and alignment still follow the reference.
  const headingSelector = '.cur-theme .cur-theme-name';
  const { width: _referenceHeadingWidth, ...referenceHeading } = await geometry(jig.locator(`.as ${headingSelector}`));
  expect(referenceHeading.fontWeight).toBe('400');
  for (const heading of await page.locator(headingSelector).all()) await expect(heading).toHaveCSS('font-weight', '700');
  await expect.poll(async () => {
    const { width: _headingWidth, ...heading } = await geometry(page.locator(headingSelector));
    return heading;
  }).toEqual({ ...referenceHeading, fontWeight: '700' });
  await jig.locator('.as .cur-card[data-pick=t1]').click(); await page.locator('.cur-card[data-pick=t1]').click();
  await Promise.all([jig.locator('.as-pane .pn-title').waitFor(), page.locator('.as-pane .pn-title').waitFor()]);
  await expect.poll(async () => page.locator('.as-pane').evaluate(node => getComputedStyle(node).transform)).toBe('none');
  await expect.poll(async () => jig.locator('.as-pane').evaluate(node => getComputedStyle(node).transform)).toBe('none');
  // UI-023 places the existing 28px actions beside 24px theme chips.
  // The header is 4px taller; chips stay centred and subsequent rows move 4px.
  await expect(page.locator('.pn-theory-head')).toHaveCSS('height', '28px');
  const header = await page.locator('.pn-theory-head').boundingBox();
  const actions = await page.locator('.pn-theory-actions').boundingBox();
  expect(actions!.x + actions!.width).toBeCloseTo(header!.x + header!.width, 1);
  for (const selector of ['.as-pane', '.as-pane .pn-doc', '.as-pane .pn-title', '.as-pane .pn-chip', '.as-pane .pn-step', '.as-pane .pn-step svg', '.as-pane-close .ap-iconbtn', '.as-pane-close .ap-iconbtn svg']) {
    const dimensions = !selector.endsWith('.pn-doc');
    const reference = await geometry(jig.locator(selector), dimensions);
    const offset = selector.endsWith('.pn-chip') ? 2 : /\.pn-title$|\.pn-step(?: svg)?$/.test(selector) ? 4 : 0;
    if (dimensions && offset) reference.y = Number(reference.y) + offset;
    await expect.poll(async () => geometry(page.locator(selector), dimensions)).toEqual(reference);
  }
  await page.screenshot({ path: 'test-results/parity/verified-pane-geometry.png', animations: 'disabled' });
  await jig.close();
});

test('floating chrome uses the requested twelve-pixel window insets', async ({ page }) => {
  for (const width of [1360, 852, 390]) {
    await page.setViewportSize({ width, height: 853 }); await page.goto('/?view=briefing');
    const pill=page.locator('.ps-surface:not([data-open])'); await expect(pill).toBeVisible();
    await expect.poll(async()=>pill.evaluate(node=>{const r=node.getBoundingClientRect();return{right:Math.round(innerWidth-r.right),bottom:Math.round(innerHeight-r.bottom)};})).toEqual({right:12,bottom:12});
    if(width>=640) await expect.poll(async()=>page.locator('.as-switch').evaluate(node=>{const r=node.getBoundingClientRect();return{left:Math.round(r.left),bottom:Math.round(innerHeight-r.bottom)};})).toEqual({left:12,bottom:12});
    await page.getByRole('button',{name:'Dump or ask (⌘J)',exact:true}).click();
    await expect(page.locator('.ps-panel')).toBeVisible(); await page.keyboard.press('Escape');
    await expect.poll(async()=>pill.evaluate(node=>{const r=node.getBoundingClientRect();return{right:Math.round(innerWidth-r.right),bottom:Math.round(innerHeight-r.bottom)};})).toEqual({right:12,bottom:12});
  }
});

test('packed Timeline marks remain independently clickable and keyboard accessible', async ({ page }) => {
  await page.goto('/?view=timeline');
  const claim = page.getByRole('textbox', { name: 'Claim', exact: true });
  await page.locator('[data-tid=t3]').click({ position: { x: 120, y: 15 } });
  await expect(claim).toHaveText('Agents keep context across months, not sessions');
  await page.locator('[data-tid=t1]').click({ position: { x: 5, y: 5 } });
  await expect(claim).toHaveText('Tokens become nearly free for routine work');
  await page.locator('[data-tid=t4]').click({ position: { x: 5, y: 5 } });
  await expect(claim).toHaveText('Code review becomes the bottleneck, not writing');
  await page.locator('[data-tid=t3]').focus(); await page.keyboard.press('Enter');
  await expect(claim).toHaveText('Agents keep context across months, not sessions');
  await expect.poll(async () => page.locator('.t2a-item[data-sel]').evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))).toEqual({ width: 14, height: 14 });
});
