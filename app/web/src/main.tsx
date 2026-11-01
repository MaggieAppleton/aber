import React from "react";
import { createRoot } from "react-dom/client";
import { connect } from "./data/live";
import "./design-tokens.css";
import "./app/base.css";
const root=createRoot(document.getElementById("root")!);
root.render(<div className="startup" role="status">Loading Aber…</div>);
void connect().then(async()=>{
  const {AppShell}=await import("./ui/app-shell");
  root.render(<AppShell/>);
});
