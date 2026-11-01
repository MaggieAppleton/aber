import React from "react";
import { createRoot } from "react-dom/client";
import { connect } from "./data/live";
import { TooltipProvider } from "./ui/tooltip";
import "./design-tokens.css";
import "./app/base.css";
/** Agentation feedback overlay: ?feedback=1 turns it on (and remembers), ?feedback=0 turns it off. */
function feedbackOn(){
  const q=new URLSearchParams(location.search).get("feedback");
  try{ if(q!==null) localStorage.setItem("aber-feedback",q==="1"?"1":"0"); return localStorage.getItem("aber-feedback")==="1"; }
  catch{ return q==="1"; }
}
const root=createRoot(document.getElementById("root")!);
root.render(<div className="startup" role="status">Loading Aber…</div>);
void connect().then(async()=>{
  const {AppShell}=await import("./ui/app-shell");
  const Feedback=feedbackOn()?(await import("agentation")).Agentation:null;
  root.render(<><TooltipProvider><AppShell/></TooltipProvider>{Feedback&&<Feedback appName="Aber app"/>}</>);
});
