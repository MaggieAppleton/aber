import { useCaptureResults } from "./capture-results";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { Att, Ctx, DumpState, Msg, ToastPart } from "../ui/pill-study";
import { act, field, json, refresh, reportError, useWorld, world } from "../data/live";
import { capture, request } from "../data/api";
const makeId=()=>crypto.randomUUID();
const base:DumpState={open:false,text:"",atts:[],ctx:[],thread:[],rec:null,busy:false,incoming:null,toast:null,picking:false,drag:null,hot:null,made:{signals:0,theories:0}};
function initialMessages(): UIMessage[] {
  return [...world.dumps].filter(d=>!field(d,"deletedAt")&&field(d,"capturedFrom")==="column").reverse().slice(-30).flatMap(d=>[
    {id:d.id,role:"user",parts:[{type:"text",text:d.text??""}],metadata:{dumpId:d.id,attachments:d.attachments??[],voice:d.attachments?.some((a:any)=>a.kind==="audio"),transcript:d.transcripts?.map((t:any)=>t.text).join("\n"),at:field(d,"capturedAt")}},
    ...json<any[]>(d.replies,[]).map(reply=>({id:reply.id,role:"assistant",parts:json<any[]>(reply.parts??reply.parts_json,[])})),
  ] as UIMessage[]);
}
export function useLiveDump(init?:Partial<DumpState>) {
  useWorld();
  const [s,setS]=useState<DumpState>(()=>({...base,...init}));
  const ref=useRef(s);ref.current=s;
  const results=useCaptureResults(s.open);
  const meter=useRef<{context:AudioContext;timer:ReturnType<typeof setInterval>}|undefined>(undefined);
  const stopMeter=()=>{if(meter.current){clearInterval(meter.current.timer);void meter.current.context.close();meter.current=undefined;}};
  const recorder=useRef<MediaRecorder|undefined>(undefined),audioStream=useRef<MediaStream|undefined>(undefined),chunks=useRef<Blob[]>([]),cancelled=useRef(false);
  const initial=useRef(initialMessages());
  const transport=useMemo(()=>new DefaultChatTransport({api:"/api/chat"}),[]);
  const chat=useChat({messages:initial.current,transport,onError:reportError,onFinish:()=>{void refresh();}});
  const chatRef=useRef(chat);chatRef.current=chat;
  const set=(patch:Partial<DumpState>|((s:DumpState)=>Partial<DumpState>))=>setS(previous=>({...previous,...(typeof patch==="function"?patch(previous):patch)}));
  const api=useMemo(()=>{
    const showToast=results.api.show;
    const context=(atts:Att[]=[])=>{
      const objects=[...ref.current.ctx.map(c=>({kind:c.kind,id:c.objectId??c.region,label:c.label})),...atts.flatMap(a=>a.object?[a.object]:[])];
      return [...new Map(objects.map(object=>[`${object.kind}:${object.id??object.label}`,object])).values()];
    };
    const filesFor=(atts:Att[])=>atts.flatMap(a=>a.file?[a.file]:[]);
    const urlsFor=(atts:Att[])=>atts.filter(a=>a.kind==="link").map(a=>a.url??`https://${a.host}`);
    const send=async()=>{
      const {text,atts,busy}=ref.current;if(busy||(!text.trim()&&!atts.length))return;
      set({text:"",atts:[],busy:true});
      try {
        const origin=results.api.token();
        const output=await capture({text:text||atts.flatMap(a=>a.object?[a.object.label]:[]).join("\n"),urls:urlsFor(atts),files:filesFor(atts),context:context(atts)});
        const dumpId:string=output.dump?.id??output.id;
        results.api.track(dumpId,origin);
        await chatRef.current.sendMessage({text:text||atts.map(a=>a.title??a.host).join(", "),metadata:{atts,dumpId}}, {body:{context:context(atts),attachments:atts.filter(a=>!a.object).map(({file,...a})=>a),urls:urlsFor(atts),dumpId}});
        await refresh();

      } catch(cause) {reportError(cause);set({text,atts});}
      finally {set({busy:false});}
    };
    const direct=async(att:Att|null)=>{
      if(!att)return;set({drag:null,busy:true,incoming:att});
      const origin=results.api.token();
      try {const output=await capture({urls:urlsFor([att]),files:filesFor([att]),text:att.kind==="link"?"":att.title??"",context:context([att])});results.api.track(output.dump?.id??output.id,origin);await refresh();}
      catch(cause){reportError(cause);}finally{set({busy:false,incoming:null});}
    };
    const attachFiles=(files:File[])=>set(p=>({atts:[...p.atts,...files.map(file=>({id:makeId(),kind:(file.type.startsWith("image/")?"image":"file") as Att["kind"],file,host:file.name,title:file.name,url:URL.createObjectURL(file)}))]}));
    const record=async()=>{
      if(recorder.current?.state==="recording")return;
      try {
        audioStream.current=await navigator.mediaDevices.getUserMedia({audio:true});cancelled.current=false;chunks.current=[];
        try {
          const context=new AudioContext(),analyser=context.createAnalyser();analyser.fftSize=512;
          context.createMediaStreamSource(audioStream.current).connect(analyser);
          const samples=new Uint8Array(analyser.fftSize);
          meter.current={context,timer:setInterval(()=>{analyser.getByteTimeDomainData(samples);const level=Math.sqrt(samples.reduce((sum,sample)=>sum+((sample-128)/128)**2,0)/samples.length);window.dispatchEvent(new CustomEvent("aber:audio-level",{detail:{level:Math.min(1,level*5)}}));},80)};
        }catch{}

        const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":"";
        const current=new MediaRecorder(audioStream.current,mime?{mimeType:mime}:{});recorder.current=current;
        current.ondataavailable=event=>{if(event.data.size)chunks.current.push(event.data);};
        current.onstop=()=>{
          stopMeter();audioStream.current?.getTracks().forEach(track=>track.stop());
          set({rec:null});if(cancelled.current)return;
          const blob=new Blob(chunks.current,{type:current.mimeType||"audio/webm"});
          const file=new File([blob],`voice-${Date.now()}.${blob.type.includes("mp4")?"m4a":"webm"}`,{type:blob.type});
          void direct({id:makeId(),kind:"audio",host:file.name,title:"Voice note",file,url:URL.createObjectURL(blob)});
        };
        current.start(200);set({rec:Date.now()});
      }catch(cause){stopMeter();audioStream.current?.getTracks().forEach(track=>track.stop());set({rec:null});reportError(cause);}
    };
    return {
      set,reset:(state?:Partial<DumpState>)=>setS({...base,...state}),open:()=>set({open:true,toast:null,picking:false}),close:()=>set({open:false,picking:false,hot:null}),
      setText:(text:string)=>set({text}),addLink:(url:string)=>{
        let host=url;try{host=new URL(url).hostname.replace(/^www\./,"");}catch{}
        const id=makeId();set(p=>({atts:[...p.atts,{id,kind:"link",host,url}]}));
        const title=(value:string)=>set(p=>({atts:p.atts.map(a=>a.id===id?{...a,title:value}:a)}));
        void request(`/api/link-preview?url=${encodeURIComponent(url)}`).then(result=>title(result.title??url)).catch(()=>title(url));
      },
      addImage:()=>{const input=document.createElement("input");input.type="file";input.multiple=true;input.onchange=()=>attachFiles([...input.files??[]]);input.click();},attachFiles,
      removeAtt:(id:string)=>set(p=>({atts:p.atts.filter(a=>a.id!==id)})),addCtx:(c:Ctx)=>set(p=>({ctx:p.ctx.some(x=>x.id===c.id)?p.ctx:[...p.ctx,c],picking:false,hot:null})),removeCtx:(id:string)=>set(p=>({ctx:p.ctx.filter(c=>c.id!==id),hot:null})),setPicking:(picking:boolean)=>set({picking,hot:null}),setHot:(hot:string|null)=>set({hot}),
      send:()=>void send(),decide:(id:string,state:"accepted"|"discarded")=>{act(state==="accepted"?"acceptDraft":"discardDraft",{id,kind:"theory"});},decideLast:(_state:"accepted"|"discarded")=>{},
      startRec:()=>void record(),cancelRec:()=>{cancelled.current=true;stopMeter();if(recorder.current?.state==="recording")recorder.current.stop();audioStream.current?.getTracks().forEach(t=>t.stop());set({rec:null});},stopRec:()=>recorder.current?.stop(),stopRecInto:()=>recorder.current?.stop(),
      dumpDirect:(att:Att|null)=>void direct(att),setDrag:(drag:Att|null)=>set({drag}),undo:results.api.undo,dismissToast:results.api.dismiss,holdToast:results.api.hold,showToast,
    };
  },[]);
  useEffect(()=>()=>{cancelled.current=true;stopMeter();if(recorder.current?.state==="recording")recorder.current.stop();audioStream.current?.getTracks().forEach(t=>t.stop());},[]);
  const saved=initialMessages();
  const textOf=(message:UIMessage)=>message.parts.filter(p=>p.type==="text").map(p=>p.text).join("");
  const savedIds=new Set(saved.map(message=>message.id));
  const persistedText=new Set(saved.map(message=>`${message.role}:${textOf(message)}`));
  const merged=[...saved,...chat.messages.filter(message=>!savedIds.has(message.id)&&!((message.metadata as any)?.dumpId&&savedIds.has((message.metadata as any).dumpId))&&!(textOf(message)&&persistedText.has(`${message.role}:${textOf(message)}`)))];
  const messages:Msg[]=merged.map((message,index)=>{
    const metadata=(message.metadata??{}) as any;
    if(message.role==="user")return {id:message.id,who:"me",text:metadata.transcript||message.parts.filter(p=>p.type==="text").map(p=>p.text).join(""),atts:(metadata.atts??metadata.attachments??[]).map((a:any)=>({...a,host:a.host??a.title??a.url??"",url:a.url??((a.mediaId??a.media_id)?`/media/${a.mediaId??a.media_id}`:undefined)})),time:metadata.at?new Date(metadata.at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"",voice:metadata.voice?0:undefined};
    return {id:message.id,who:"agent",thinking:index===chat.messages.length-1&&chat.status==="submitted",filed:[],parts:message.parts};
  });
  if(chat.status==="submitted"&&merged.at(-1)?.role!=="assistant")messages.push({id:"pending",who:"agent",thinking:true,filed:[]});
  return {s:{...s,toast:results.toast,thread:messages,busy:s.busy||chat.status==="streaming"||chat.status==="submitted"},api};
}
