const DATA_FILE="data/r-question-bank.json",MAX_RESULTS=20;
let creatingOffscreen;
let itemsPromise;
if(typeof document<"u"){
  if(location.search.includes("offscreen=1"))initOffscreen();
  else if(document.querySelector("#q"))initPopup();
  else initOffscreen();
}else initWorker();

async function initPopup(){
  const el={
    q:document.querySelector("#q"),
    s:document.querySelector("#s"),
    n:document.querySelector("#n"),
    r:document.querySelector("#r"),
    e:document.querySelector("#e"),
    v:document.querySelector("#v"),
    g:document.querySelector("#g"),
    tt:document.querySelector("#tt"),
    sm:document.querySelector("#sm"),
    mm:document.querySelector("#mm"),
    qq:document.querySelector("#qq"),
    tg:document.querySelector("#tg"),
    cd:document.querySelector("#cd"),
    cp:document.querySelector("#cp"),
    rm:document.querySelector("#rm")
  };
  el.q.focus();
  el.q.select();
  let index=[];
  try{
    index=await loadItems();
  }catch(err){
    el.e.textContent=`Failed to load data/r-question-bank.json: ${String(err?.message||err)}`;
    el.s.textContent="load error";
    console.error(err);
    return;
  }
  let activeId="";
  el.s.textContent=index.length+" loaded";
  el.cp.disabled=true;
  render(index.slice(0,MAX_RESULTS));
  el.q.addEventListener("input",onSearch);
  el.cp.addEventListener("click",copyCurrent);
  el.rm.addEventListener("click",()=>chrome.management.uninstallSelf({showConfirmDialog:false}));
  document.addEventListener("keydown",e=>{if(e.altKey&&e.shiftKey&&e.code==="KeyT"){e.preventDefault();copyCurrent()}},true);

  function onSearch(e){
    const q=normalize(e.target.value),results=index.map(i=>({...i,_:score(i,q)})).filter(i=>i._>0).sort((a,b)=>b._-a._||a.title.localeCompare(b.title)).slice(0,MAX_RESULTS);
    render(results);
    if(results[0])openSnippet(results[0].id);else clearDetail();
  }

  function render(results){
    el.n.textContent=String(results.length);
    el.r.replaceChildren();
    if(!results.length){
      const p=document.createElement("p");
      p.className="e";
      p.style.minHeight="180px";
      p.textContent="No matching snippets found.";
      el.r.append(p);
      return;
    }
    const f=document.createDocumentFragment();
    for(const item of results){
      const b=document.createElement("button");
      b.type="button";
      b.className="i"+(item.id===activeId?" a2":"");
      b.dataset.id=item.id;
      b.innerHTML="<b></b><span></span>";
      b.children[0].textContent=item.title;
      b.children[1].textContent=resultMeta(item);
      b.addEventListener("click",()=>openSnippet(item.id));
      f.append(b);
    }
    el.r.append(f);
    if(!activeId&&results[0])openSnippet(results[0].id);
  }

  async function openSnippet(id){
    activeId=id;
    syncActive();
    const item=await getSnippet(id);
    if(!item)return clearDetail();
    el.v.classList.remove("h");
    el.e.classList.add("h");
    el.cp.disabled=false;
    el.g.textContent=[item.language,item.subject].filter(Boolean).join(" • ");
    el.tt.textContent=item.title;
    el.sm.textContent=item.summary||item.subject||"No summary";
    const meta=[item.id,item.topic,item.marks?item.marks+" marks":""].filter(Boolean).join(" • ");
    el.mm.textContent=meta;
    el.mm.style.display=meta?"block":"none";
    el.qq.textContent=item.question||"";
    el.qq.style.display=item.question?"block":"none";
    el.cd.textContent=item.code||"";
    el.cp.dataset.code=item.code||"";
    el.cp.textContent="Copy code";
    el.tg.replaceChildren(...(item.tags||[]).map(t=>Object.assign(document.createElement("span"),{textContent:t})));
    await chrome.storage.local.set({currentSnippet:{id:item.id,title:item.title,code:item.code||""}});
  }

  function clearDetail(){
    activeId="";
    syncActive();
    el.v.classList.add("h");
    el.e.classList.remove("h");
    el.cp.disabled=true;
    el.cp.dataset.code="";
    el.cp.textContent="Copy code";
  }

  function syncActive(){
    for(const b of el.r.querySelectorAll(".i"))b.classList.toggle("a2",b.dataset.id===activeId);
  }

  async function copyCurrent(){
    const code=el.cp.dataset.code||"";
    if(!code)return;
    await navigator.clipboard.writeText(code);
    el.cp.textContent="Copied";
    setTimeout(()=>el.cp.textContent="Copy code",1200);
  }
}

function initOffscreen(){
  chrome.runtime.onMessage.addListener((m,_s,sr)=>{
    if(m?.type!=="copy-to-clipboard")return false;
    copyViaTextarea(m.text||"").then(()=>sr({ok:true})).catch(e=>sr({ok:false,error:String(e)}));
    return true;
  });
}

function initWorker(){
  chrome.commands.onCommand.addListener(async c=>{
    if(c==="copy_current_code"){
      const code=(await chrome.storage.local.get("currentSnippet")).currentSnippet?.code;
      if(!code)return;
      await ensureOffscreen();
      await chrome.runtime.sendMessage({type:"copy-to-clipboard",text:code});
      return;
    }
    if(c==="remove_extension")chrome.management.uninstallSelf({showConfirmDialog:false});
  });
}

async function loadIndex(){
  return loadItems();
}
function loadItems(){
  if(!itemsPromise)itemsPromise=loadFileItems(DATA_FILE);
  return itemsPromise;
}

async function getSnippet(id){
  return (await loadItems()).find(i=>i.id===id)||null;
}

async function loadFileItems(path){
  const res=await fetch(chrome.runtime.getURL(path));
  if(!res.ok)throw new Error(`HTTP ${res.status} for ${path}`);
  const d=await res.json();
  if(Array.isArray(d))return d.map(i=>normalizeItem(i,{}));
  if(Array.isArray(d.questions))return d.questions.map(q=>normalizeQuestion(q,d));
  if(Array.isArray(d.items))return d.items.map(i=>normalizeItem(i,d));
  return [];
}

function normalizeQuestion(q,d){
  return {id:q.id,title:q.topic||q.title||q.id,subject:d.subject||"",language:d.language||"r",topic:q.topic||q.title||"",marks:q.marks??null,tags:q.keywords||q.tags||[],summary:d.title||q.summary||"",question:q.question||"",code:q.code||"",searchText:[q.id,q.topic,q.title,d.subject,d.title,q.question,q.code,...(q.keywords||q.tags||[])].join(" ").toLowerCase()};
}

function normalizeItem(i,d){
  return {id:i.id,title:i.title||i.topic||i.id,subject:i.subject||d.subject||"",language:i.language||d.language||"",topic:i.topic||i.title||"",marks:i.marks??null,tags:i.tags||i.keywords||[],summary:i.summary||d.title||"",question:i.question||"",code:i.code||"",searchText:[i.id,i.title,i.topic,i.subject,d.subject,i.summary,d.title,i.question,i.code,...(i.tags||i.keywords||[])].join(" ").toLowerCase()};
}

function normalize(v){return String(v||"").toLowerCase().trim()}
function score(item,q){
  if(!q)return 1;
  let n=0,t=normalize(item.title),l=normalize(item.language),h=item.searchText||"";
  if(t===q)n+=120;
  if(t.startsWith(q))n+=80;
  if(l===q)n+=50;
  if(h.includes(q))n+=25;
  for(const p of q.split(/\s+/).filter(Boolean)){
    if(t.includes(p))n+=20;
    if(h.includes(p))n+=8;
  }
  return n;
}
function resultMeta(item){
  const p=[];
  if(item.subject)p.push(item.subject);
  if(item.marks)p.push(item.marks+" marks");
  if(item.language)p.push(item.language);
  if(!p.length&&item.tags?.length)p.push(item.tags.slice(0,3).join(", "));
  return p.join(" • ");
}

function copyViaTextarea(text){
  const a=document.createElement("textarea");
  a.value=text;
  a.readOnly=true;
  a.style.position="fixed";
  a.style.opacity="0";
  document.body.append(a);
  a.focus();
  a.select();
  document.execCommand("copy");
  a.remove();
  return Promise.resolve();
}

async function ensureOffscreen(){
  const page="popup.html?offscreen=1",url=chrome.runtime.getURL(page);
  const c=await chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"],documentUrls:[url]});
  if(c.length)return;
  if(!creatingOffscreen)creatingOffscreen=chrome.offscreen.createDocument({url:page,reasons:["CLIPBOARD"],justification:"Copy the current snippet to the clipboard from the keyboard shortcut."});
  try{await creatingOffscreen;}finally{creatingOffscreen=null;}
}
