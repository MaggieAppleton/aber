import React from "react";
import { createRoot } from "react-dom/client";
import { connect } from "./data/live";
import { TooltipProvider } from "./ui/tooltip";
// Geist and Geist Mono are bundled so the app keeps its type offline.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./design-tokens.css";
import "./app/base.css";
// The surface tokens live on :root in homes.css; load it with the entry so the startup screen and portals have them.
import "./ui/homes.css";
const root=createRoot(document.getElementById("root")!);
root.render(<div className="startup" role="status">Loading Aber…</div>);
// Timeline labels are measured on a canvas, so the face must be ready before the first layout.
const fonts=Promise.all(["400","500","600"].map(weight=>document.fonts.load(`${weight} 13px "Geist Variable"`))).catch(()=>undefined);
void Promise.all([connect(),fonts]).then(async()=>{
  const {AppShell}=await import("./ui/app-shell");
  root.render(<TooltipProvider><AppShell/></TooltipProvider>);
});
