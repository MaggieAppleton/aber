import { expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";
import { AssistantText } from "./assistant-text";

const render = (text: string) => renderToStaticMarkup(createElement(AssistantText, { text }));
const content = (text: string) => parseHTML(render(text)).document.querySelector("span")!;

test("assistant emphasis uses semantic strong and em elements", () => {
  const reply = content("Plain **bold** and *italic* with __another bold__ and _another italic_.");
  expect([...reply.querySelectorAll("strong")].map(node => node.textContent)).toEqual(["bold", "another bold"]);
  expect([...reply.querySelectorAll("em")].map(node => node.textContent)).toEqual(["italic", "another italic"]);
  expect(reply.textContent).toBe("Plain bold and italic with another bold and another italic.");
});

test("nested and triple emphasis follow Markdown delimiter rules", () => {
  const reply = content("**bold with *italic* inside** then *italic with **bold** inside* and ***both***");
  expect(reply.querySelector("strong em")?.textContent).toBe("italic");
  expect(reply.querySelector("em strong")?.textContent).toBe("bold");
  expect([...reply.querySelectorAll("em strong")].at(-1)?.textContent).toBe("both");
  expect(content("alpha_beta_gamma and 2 * 3 = 6").textContent).toBe("alpha_beta_gamma and 2 * 3 = 6");
});

test("escaped markers and code-span markers stay literal", () => {
  const reply = content(String.raw`\*literal\* and \*\*also literal\*\* and \_literal\_ beside ` + "`**code** and *code*`");
  expect(reply.querySelectorAll("strong, em")).toHaveLength(0);
  expect(reply.textContent).toBe("*literal* and **also literal** and _literal_ beside `**code** and *code*`");
});

test("streamed prefixes remain readable and acquire emphasis when their delimiters complete", () => {
  expect(content("Answer: **bo").textContent).toBe("Answer: **bo");
  expect(content("Answer: **bo").querySelectorAll("strong")).toHaveLength(0);
  const middle = content("Answer: **bold** and *ita");
  expect(middle.querySelector("strong")?.textContent).toBe("bold");
  expect(middle.textContent).toBe("Answer: bold and *ita");
  expect(content("Answer: **bold** and *italic*.").querySelector("em")?.textContent).toBe("italic");
});

test("raw HTML and unsafe Markdown links remain escaped text", () => {
  const source = '<img src=x onerror="alert(1)"><script>alert(1)</script> [click](javascript:alert(1)) ![image](https://example.com/pixel)';
  const reply = content(source);
  expect(reply.querySelectorAll("img, script, a")).toHaveLength(0);
  expect(reply.textContent).toBe(source);
  expect(render(source)).toContain("&lt;script&gt;");
});

test("plain spacing and unsupported block syntax keep the existing inline text shape", () => {
  const source = "## Heading\n\n- first line\n- second &amp; line\n\n```\n**literal fenced code**\n```";
  const reply = content(source);
  expect(reply.textContent).toBe(source);
  expect(reply.querySelectorAll("p, h2, ul, li, pre, code, strong")).toHaveLength(0);
});
