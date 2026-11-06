import { expect, test, type Locator } from "@playwright/test";
test.use({ reducedMotion: "reduce" });

async function usableTargets(controls: Locator) {
  const measure = () => controls.evaluateAll(nodes => nodes.filter(node => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== "hidden" && !node.closest("[inert],[aria-hidden=true]");
  }).map(node => {
    const rect = node.getBoundingClientRect();
    const after = getComputedStyle(node, "::after");
    const expanded = after.content !== "none" && after.content !== "normal" && after.position === "absolute";
    const width = expanded ? Math.max(rect.width, parseFloat(after.width) || 0) : rect.width;
    const height = expanded ? Math.max(rect.height, parseFloat(after.height) || 0) : rect.height;
    return { name: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 65), width, height };
  }));
  await expect.poll(async () => (await measure()).filter(rect => rect.width < 23.9 || rect.height < 23.9)).toEqual([]);
  const measurements = await measure();
  expect(measurements.length).toBeGreaterThan(0);
  expect(measurements.filter(rect => rect.width < 23.9 || rect.height < 23.9)).toEqual([]);
  return measurements;
}

for (const width of [1360, 390]) test(`full view preserves compact controls and a persistent keyboard confidence slider at ${width}px`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 844 });
  const response = await request.post("/api/tools/writeTheory", { data: { claim: `Accessible controls at ${width}px`, confidence: 3, horizon: 2028 } });
  expect(response.ok()).toBeTruthy();
  const { id } = await response.json();
  await page.goto(`/?view=default&open=theory:${id}`);
  const pane = page.getByRole("main");
  const slider = pane.getByRole("slider", { name: "Confidence", exact: true });
  await expect(slider).toHaveAttribute("aria-valuenow", "3");
  await usableTargets(pane.locator("button, .pn-conf-control"));
  const marks = await pane.locator(".pn-conf-marks i").evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height, x: rect.x }; }));
  expect(marks).toHaveLength(5);
  for (const mark of marks) { expect(mark.width).toBe(20); expect(mark.height).toBe(6); }
  expect(marks[1].x - marks[0].x).toBe(23);
  const control = pane.locator(".pn-conf-control");
  await control.click({ position: { x: 79, y: 12 } });
  await expect(slider).toHaveAttribute("aria-valuenow", "4");
  await slider.focus(); await slider.press("Home"); await expect(slider).toHaveAttribute("aria-valuenow", "1");
  await slider.press("End"); await expect(slider).toHaveAttribute("aria-valuenow", "5");
  await slider.press("ArrowLeft"); await expect(slider).toHaveAttribute("aria-valuenow", "4");
  await slider.press("ArrowDown"); await expect(slider).toHaveAttribute("aria-valuenow", "3");
  await slider.press("ArrowUp"); await expect(slider).toHaveAttribute("aria-valuenow", "4");
  for (const level of [1, 2, 3, 4, 5]) { await slider.press(String(level)); await expect(slider).toHaveAttribute("aria-valuenow", String(level)); }
  await slider.press("4"); await expect(slider).toHaveAttribute("aria-valuetext", "4 of 5");
  await pane.getByRole("button", { name: "Later", exact: true }).click();
  await expect.poll(async () => (await (await request.get(`/api/objects/theory/${id}`)).json()).confidence).toBe(4);
  await expect.poll(async () => (await (await request.get(`/api/objects/theory/${id}`)).json()).horizon).toBe(2029);
  await page.reload(); await expect(slider).toHaveAttribute("aria-valuenow", "4");
  await expect(pane.locator(".pn-field-val").first()).toHaveText("2029");
  const overlap = await pane.locator(".ab-top").evaluate(node => {
    const controls = [...node.querySelectorAll("button")].map(button => button.getBoundingClientRect()).filter(rect => rect.width);
    return controls.some((rect, index) => controls.slice(index + 1).some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top));
  });
  expect(overlap).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/web-followup/targets-${width}.png`, animations: "disabled" });
});

test("compact chrome and capture controls retain usable targets without changing jig layout", async ({ page }) => {
  await page.goto("/?view=default&type=theory&item=t1");
  await expect(page.getByRole("navigation", { name: "Views" })).toBeVisible();
  await usableTargets(page.locator(".as-switch button, .tf-rail button, .tf-list button"));
  await page.getByRole("button", { name: /^Timeline \(/ }).click();
  await usableTargets(page.locator(".t2-toolbar button"));
  // Dense chart marks are independently pointer/keyboard tested in the spatial suite.
  await expect(page.locator(".t2a-item").first()).toBeVisible();
  const picker = page.getByRole("button", { name: "Theme", exact: true }); await picker.click();
  await usableTargets(page.locator(".t2-pop button"));
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Dump or ask (⌘J)", exact: true }).click();
  await usableTargets(page.locator(".ps-panel button"));
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+Shift+L");
  await usableTargets(page.locator(".ps-log button"));
});

test("three context pills wrap inside the column with reachable remove and pick controls", async ({ page, request }) => {
  const world = await (await request.get("/api/world")).json();
  const theory = world.theories.find((row: any) => row.status === "held" && row.claim.length > 35);
  await page.goto(`/?view=columns&open=theory:${theory.id}`);
  await page.getByRole("button", { name: "Dump or ask (⌘J)", exact: true }).click();
  await expect(page.locator(".ps-ctxrow .ps-ctx")).toHaveCount(2);
  await page.getByRole("button", { name: "Add something on screen", exact: true }).click();
  await page.getByRole("button", { name: "Show Themes", exact: true }).click();
  await page.locator('.cd-col[data-kind="theme"] .cd-item-btn').first().click();
  await expect(page.locator(".ps-ctxrow .ps-ctx")).toHaveCount(3);
  const outside = await page.locator(".ps-composer").evaluate(composer => {
    const bounds = composer.getBoundingClientRect();
    return [...composer.querySelectorAll(".ps-ctxrow button")].map(button => {
      const rect = button.getBoundingClientRect();
      return { name: button.getAttribute("aria-label"), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }).filter(rect => rect.left < bounds.left || rect.right > bounds.right || rect.top < 0 || rect.bottom > innerHeight);
  });
  expect(outside).toEqual([]);
  await usableTargets(page.locator(".ps-ctxrow button"));
  const height = await page.locator(".ps-ctxrow").evaluate(node => node.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(24);
  await page.screenshot({ path: "test-results/web-followup/contexts-wrapped.png", animations: "disabled" });
  await page.locator(".ps-ctxrow .ps-chip-x").last().click();
  await expect(page.locator(".ps-ctxrow .ps-ctx")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".ps-panel")).toBeVisible();
  await expect(page.getByRole("button",{name:"Stop sharing Default",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Stop sharing Columns",exact:true})).toHaveCount(0);
  await usableTargets(page.locator(".ps-ctxrow button, .ps-inputrow button"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("the log names a processing dump paused by the daily spend limit", async ({ page, request }) => {
  const world = await (await request.get("/api/world")).json();
  const dump = world.dumps.find((row: any) => !row.deleted_at);
  dump.text = dump.first = "A queued dump at the daily budget limit";
  dump.status = "processing";
  dump.error = "Daily agent spend cap reached; queued work waits until tomorrow";
  await page.route("**/api/world", route => route.fulfill({ json: world }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Dump or ask (⌘J)", exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+L");
  const row = page.locator(".dl-row").filter({ hasText: dump.first });
  await expect(row.locator(".dl-paused")).toHaveText("Spend limit, resumes tomorrow");
  await expect(row.locator(".dl-working")).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
});
