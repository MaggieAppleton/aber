import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { createObject, findObjects } from "../app/dialogs";
import { THEMES, PROTOTYPES, theoriesIn } from "./data";
import { Icon, IconButton, Mark } from "./atoms";
import { ThemeName, ProtoName, type OnOpen } from "./panes";
import { TooltipButton } from "./tooltip";
import "./current-sidebar.css";

const PREFERENCE = "aber:current-sidebar-collapsed";
function remembered() { try { return sessionStorage.getItem(PREFERENCE) === "1"; } catch { return false; } }

/** The theme index stays available without taking the space needed by its sections. */
export function CurrentSidebar({ active, onTheme, onOpen, onCollapsedChange }: {
  active: string; onTheme: (id: string) => void; onOpen?: OnOpen; onCollapsedChange: (collapsed: boolean) => void;
}) {
  const rail = useRef<HTMLElement>(null), body = useRef<HTMLDivElement>(null), expand = useRef<HTMLButtonElement>(null);
  const observedTight = useRef(false);
  const resizeFocus = useRef<{ element: HTMLElement; collapsing: boolean; label: string | null; prototypes: boolean } | null>(null);
  const [manual, setManual] = useState(remembered), [tight, setTight] = useState(false);
  const [overlay, setOverlay] = useState<"themes" | "prototypes" | null>(null);
  const [prototypesOpen, setPrototypesOpen] = useState(false);
  const collapsed = manual || tight;
  const remember = (value: boolean) => { setManual(value); try { sessionStorage.setItem(PREFERENCE, value ? "1" : "0"); } catch { /* Optional session preference. */ } };
  const closeOverlay = (restore = false) => { setOverlay(null); if (restore) requestAnimationFrame(() => expand.current?.focus()); };
  const reveal = (section: "themes" | "prototypes" = "themes") => {
    remember(false); if (section === "prototypes") setPrototypesOpen(true);
    if (tight) setOverlay(section);
    else requestAnimationFrame(() => body.current?.querySelector<HTMLElement>(section === "prototypes" ? ".cur-protos" : ".cur-index a[data-active]")?.focus());
  };
  useLayoutEffect(() => {
    const host = rail.current?.parentElement; if (!host) return;
    const measure = () => {
      const next = host.clientWidth < 528 ? true : host.clientWidth >= 560 ? false : observedTight.current;
      if (next === observedTight.current) return;
      const focused = document.activeElement;
      resizeFocus.current = focused instanceof HTMLElement && rail.current?.contains(focused)
        ? { element: focused, collapsing: next, label: focused.getAttribute("aria-label"), prototypes: focused.classList.contains("cur-protos-mini") } : null;
      observedTight.current = next;
      setTight(next);
    };
    const observer = new ResizeObserver(measure); observer.observe(host); measure();
    return () => { observer.disconnect(); resizeFocus.current = null; };
  }, []);
  useLayoutEffect(() => { onCollapsedChange(collapsed); if (!collapsed) setOverlay(null); }, [collapsed, onCollapsedChange]);
  // Repair only focus that this resize removed; never take focus from the pane, composer or chrome.
  useLayoutEffect(() => {
    const pending = resizeFocus.current; resizeFocus.current = null;
    if (!pending || pending.element.isConnected) return;
    if (document.activeElement && document.activeElement !== document.body && document.activeElement !== pending.element) return;
    const selector = pending.prototypes ? ".cur-protos" : pending.label === "Themes" ? ".cur-index a[data-active]"
      : pending.label === "Expand theme sidebar" ? '[aria-label="Collapse theme sidebar"]' : `[aria-label="${CSS.escape(pending.label ?? "")}"]`;
    const target = pending.collapsing ? expand.current : body.current?.querySelector<HTMLElement>(selector)
      ?? body.current?.querySelector<HTMLElement>('[aria-label="Collapse theme sidebar"]');
    target?.focus({ preventScroll: true });
  }, [tight, collapsed]);
  useLayoutEffect(() => {
    if (overlay) body.current?.querySelector<HTMLElement>(overlay === "prototypes" ? ".cur-protos" : ".cur-index a[data-active]")?.focus();
  }, [overlay]);
  useEffect(() => {
    if (!overlay) return;
    const outside = (event: PointerEvent) => { if (!body.current?.contains(event.target as Node)) closeOverlay(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); closeOverlay(true); }
    };
    document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", escape); };
  }, [overlay]);
  const collapse = () => { if (overlay) closeOverlay(true); else { remember(true); requestAnimationFrame(() => expand.current?.focus()); } };
  return <aside className="cur-rail" ref={rail} data-sidebar="" data-collapsed={collapsed ? "" : undefined} aria-label="Theme sidebar">
    {collapsed && !overlay && <div className="cur-sidebar-mini">
      <TooltipButton ref={expand} className="ap-iconbtn" aria-label="Expand theme sidebar" tooltip="Expand theme sidebar" aria-expanded="false" onClick={() => reveal()}><Icon name="sidebar" /></TooltipButton>
      <IconButton icon="search" label="Find (⌘K)" onClick={() => void findObjects()} />
      <IconButton icon="plus" label="New theme" onClick={() => void createObject("theme")} />
      <IconButton icon="theme" label="Themes" onClick={() => reveal()} />
      <TooltipButton className="ap-iconbtn cur-protos-mini" aria-label={`Prototypes (${PROTOTYPES.length})`} tooltip={`Prototypes (${PROTOTYPES.length})`} onClick={() => reveal("prototypes")}>
        <Icon name="prototype" /><span className="cur-sidebar-count ap-num">{PROTOTYPES.length}</span>
      </TooltipButton>
    </div>}
    {(!collapsed || overlay) && <div className="cur-sidebar-body" ref={body} data-overlay={overlay ? "" : undefined}>
      <div className="cur-brand"><span>Aber</span><IconButton icon="search" label="Find (⌘K)" onClick={() => void findObjects()} /><IconButton icon="plus" label="New theme" onClick={() => void createObject("theme")} /><IconButton icon="sidebar" label="Collapse theme sidebar" onClick={collapse} /></div>
      <div className="cur-sidebar-scroll ap-scroll">
        <nav className="cur-index" aria-label="Themes">
          {THEMES.map(theme => <a key={theme.id} href={`#cur-${theme.id}`} data-active={active === theme.id ? "" : undefined} onClick={event => { event.preventDefault(); onTheme(theme.id); if (overlay) closeOverlay(true); }}>
            <span><ThemeName id={theme.id} /></span>{theme.fresh > 0 && <Mark kind="fresh" />}<span className="ap-muted ap-num">{theoriesIn(theme.id).length || null}</span>
          </a>)}
        </nav>
        <Accordion.Root className="cur-prototype-section" value={prototypesOpen ? ["prototypes"] : []} onValueChange={value => setPrototypesOpen(value.length > 0)}>
          <Accordion.Item value="prototypes">
            <Accordion.Header className="cur-prototype-heading"><Accordion.Trigger className="cur-protos">
              <Icon name="prototype" size={13} /><span className="cur-sidebar-label">Prototypes</span><span className="ap-muted ap-num">{PROTOTYPES.length}</span><span className="cur-protos-chevron"><Icon name="chevron" size={12} /></span>
            </Accordion.Trigger></Accordion.Header>
            <Accordion.Panel className="ab-accordion-panel"><div className="cur-prototype-list">
              {PROTOTYPES.map(prototype => <button className="cur-prototype-row" key={prototype.id} onClick={() => { onOpen?.("prototype", prototype.id); if (overlay) closeOverlay(true); }}>
                <Icon name="prototype" size={13} /><span className="cur-sidebar-label"><ProtoName id={prototype.id} /></span><Icon name="chevron" size={12} />
              </button>)}
              <button className="cur-prototype-row" onClick={async () => { await createObject("prototype"); if (overlay) closeOverlay(true); }}><Icon name="plus" size={13} /><span className="cur-sidebar-label">New prototype</span></button>
            </div></Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>}
  </aside>;
}
