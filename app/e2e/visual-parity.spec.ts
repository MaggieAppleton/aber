import { expect, test } from '@playwright/test';

test('floating chrome uses the requested twelve-pixel window insets', async ({ page }) => {
  for (const width of [1360, 852, 390]) {
    await page.setViewportSize({ width, height: 853 }); await page.goto('/?view=default');
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
