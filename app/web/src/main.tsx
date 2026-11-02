import React from "react";
import { createRoot } from "react-dom/client";
import { connect } from "./data/live";
import { TooltipProvider } from "./ui/tooltip";
import "./design-tokens.css";
import "./app/base.css";
/** Agentation feedback overlay: only on a local machine, and only when this page load's URL has ?feedback=1. */
function feedbackOn(){
  try{ localStorage.removeItem("aber-feedback"); }catch{}   // the old remembered setting
  const local=["localhost","127.0.0.1","::1","[::1]"].includes(location.hostname);
  return local&&new URLSearchParams(location.search).get("feedback")==="1";
}
const root=createRoot(document.getElementById("root")!);
root.render(<div className="startup" role="status">Loading Aber…</div>);
void connect().then(async()=>{
  const {AppShell}=await import("./ui/app-shell");
  const Feedback=feedbackOn()?(await import("agentation")).Agentation:null;
  root.render(<><TooltipProvider><AppShell/></TooltipProvider>{Feedback&&<Feedback appName="Aber app"/>}</>);
});
