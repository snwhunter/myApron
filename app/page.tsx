"use client";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Ingredient={quantity:string;name:string;aisle:string};
type Recipe={id:number;title:string;servings:number;ingredients:Ingredient[];instructions:string;frontImageKey?:string};
type Item=Ingredient&{id:string;checked:boolean;recipe?:string};
type Tab="recipes"|"scan"|"list";
type Crop={x:number;y:number;w:number;h:number};
const aisles=["Produce","Dairy & Eggs","Meat","Pantry","Bakery","Frozen","Household","Other"];
const guess=(name:string)=>{const n=name.toLowerCase();if(/onion|garlic|pepper|tomato|potato|lemon|lime|herb|spinach|kale|carrot|zucchini|scallion|parsley|cilantro/.test(n))return"Produce";if(/milk|cheese|cream|butter|egg|yogurt|mozzarella|parmesan/.test(n))return"Dairy & Eggs";if(/chicken|beef|pork|fish|salmon|shrimp|turkey|sausage/.test(n))return"Meat";if(/bread|bun|tortilla|roll/.test(n))return"Bakery";return"Pantry"};
const clean=(s:string)=>s.replace(/[|]/g," ").replace(/^[•·●○\-*—–]+\s*/,"").replace(/\s+/g," ").trim();
const noise=(s:string)=>/blue apron|cooking for|servings?|minute recipe|nutrition|getting started|chef.?s note|limited.time|breakfast|scan the qr|instructions?|from your pantry/i.test(s);
const normalizeOcr=(s:string)=>clean(s).replace(/\bO(?=\s*(?:oz|cup|tbsp|tsp|lb)\b)/gi,"0").replace(/^(\d)([A-Za-z])/,'$1 $2');
function parse(text:string):Ingredient[]{
 const unit="cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|pieces?|bunch(?:es)?|heads?|cans?|packages?|packets?|slices?";
 const number="(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\\s*(?:-|–|to)\\s*(?:\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?";
 const full=new RegExp(`^(${number}\\s*(?:${unit})?)[\\s:,-]+(.+)$`,"i");
 const qtyOnly=new RegExp(`^(${number}\\s*(?:${unit})?)$`,"i");
 const lines=text.split("\n").map(normalizeOcr).filter(x=>x.length>1&&!noise(x));
 const out:Ingredient[]=[];let pending="";
 for(const line of lines){
  const m=line.match(full);
  if(m){const name=clean(m[2]).replace(/[•·]+$/g,"");if(name.length>1&&!/^\d+$/.test(name))out.push({quantity:clean(m[1]),name,aisle:guess(name)});pending="";continue}
  const q=line.match(qtyOnly);if(q){pending=clean(q[1]);continue}
  if(pending&&line.length>1&&!/^\d+$/.test(line)){out.push({quantity:pending,name:line,aisle:guess(line)});pending=""}
 }
 return out.slice(0,24);
}
function extractTitle(text:string){
 const lines=text.split("\n").map(clean).filter(x=>x.length>=4&&x.length<=70&&!noise(x)&&!/^\d/.test(x));
 const likely=lines.filter(x=>!/(www\.|\.com|ingredients?|pantry|step \d|cook time|prep time|recipe)/i.test(x));
 if(!likely.length)return"New recipe";
 const scored=likely.map((line,index)=>({line,score:(index<4?5-index:0)+(line.split(/\s+/).length>=3?4:0)+(line.length>=12&&line.length<=45?3:0)-(/[©®]|^[^A-Za-z]+/.test(line)?5:0)}));
 return scored.sort((a,b)=>b.score-a.score)[0].line;
}
function cleanDirections(text:string){
 return text.split("\n").map(clean).filter(x=>x.length>1&&!/blue apron|cooking for|scan the qr|continued steps|breakfast/i.test(x)).join("\n").trim();
}
async function loadImage(file:File){
 const url=URL.createObjectURL(file);
 try{return await new Promise<HTMLImageElement>((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error("Image could not be opened"));el.src=url})}
 finally{URL.revokeObjectURL(url)}
}
async function imageCanvas(file:File,crop?:Crop,maxDimension=1800,allowUpscale=false){
 const img=await loadImage(file);
 const sx=(crop?.x||0)*img.naturalWidth,sy=(crop?.y||0)*img.naturalHeight,sw=(crop?.w||1)*img.naturalWidth,sh=(crop?.h||1)*img.naturalHeight;
 const rawScale=maxDimension/Math.max(sw,sh);const scale=allowUpscale?Math.min(2.4,rawScale):Math.min(1,rawScale);
 const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Image processing unavailable");
 ctx.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);return canvas;
}
function improveForOcr(canvas:HTMLCanvasElement){
 const ctx=canvas.getContext("2d");if(!ctx)return canvas;const data=ctx.getImageData(0,0,canvas.width,canvas.height);const p=data.data;
 for(let i=0;i<p.length;i+=4){const g=.299*p[i]+.587*p[i+1]+.114*p[i+2];const v=Math.max(0,Math.min(255,(g-128)*1.45+150));p[i]=p[i+1]=p[i+2]=v}
 ctx.putImageData(data,0,0);return canvas;
}
async function ocrBlob(file:File,crop:Crop){
 const canvas=improveForOcr(await imageCanvas(file,crop,2600,true));
 return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("OCR crop failed")),"image/jpeg",0.94));
}
async function uploadFile(file:File){
 const canvas=await imageCanvas(file,undefined,1200,false);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image compression failed")),"image/jpeg",0.68));
 return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()});
}

export default function Home(){
 const[tab,setTab]=useState<Tab>("recipes"),[recipes,setRecipes]=useState<Recipe[]>([]),[list,setList]=useState<Item[]>(()=>{if(typeof window==="undefined")return[];try{const s=localStorage.getItem("market-list-items");return s?JSON.parse(s):[]}catch{return[]}});
 const[front,setFront]=useState<File|null>(null),[back,setBack]=useState<File|null>(null),[frontUrl,setFrontUrl]=useState(""),[backUrl,setBackUrl]=useState("");
 const[title,setTitle]=useState(""),[servings,setServings]=useState(2),[ingredients,setIngredients]=useState<Ingredient[]>([]),[instructions,setInstructions]=useState(""),[busy,setBusy]=useState(""),[search,setSearch]=useState("");
 useEffect(()=>{fetch("/api/recipes").then(r=>r.json()).then(d=>setRecipes(d.recipes||[])).catch(()=>{})},[]);
 useEffect(()=>localStorage.setItem("market-list-items",JSON.stringify(list)),[list]);
 const filtered=recipes.filter(r=>r.title.toLowerCase().includes(search.toLowerCase())||r.ingredients.some(i=>i.name.toLowerCase().includes(search.toLowerCase())));
 const grouped=useMemo(()=>aisles.map(aisle=>({aisle,items:list.filter(i=>i.aisle===aisle)})).filter(g=>g.items.length),[list]);
 async function choose(e:ChangeEvent<HTMLInputElement>,side:"front"|"back"){
  const f=e.target.files?.[0];if(!f)return;
  try{
   setBusy(`Preparing ${side} photo…`);await loadImage(f);const u=URL.createObjectURL(f);
   if(side==="front"){if(frontUrl)URL.revokeObjectURL(frontUrl);setFront(f);setFrontUrl(u)}else{if(backUrl)URL.revokeObjectURL(backUrl);setBack(f);setBackUrl(u)}
   setBusy("");
  }catch{setBusy("Couldn’t prepare that photo. Please retake it.")}
 }
 async function scan(){
  if(!front&&!back)return;setBusy("Reading your card…");
  try{
   const{createWorker,PSM}=await import("tesseract.js");const w=await createWorker("eng");
   await w.setParameters({preserve_interword_spaces:"1"});
   let titleText="",ingredientText="",leftDirections="",rightDirections="";
   if(front){
    setBusy("Reading the recipe title…");await w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
    titleText=(await w.recognize(await ocrBlob(front,{x:.02,y:.05,w:.46,h:.28}))).data.text;
    setBusy("Reading the ingredients…");await w.setParameters({tessedit_pageseg_mode:PSM.SINGLE_COLUMN});
    ingredientText=(await w.recognize(await ocrBlob(front,{x:.015,y:.28,w:.44,h:.52}))).data.text;
   }
   if(back){
    setBusy("Reading directions, left column…");await w.setParameters({tessedit_pageseg_mode:PSM.SINGLE_COLUMN});
    leftDirections=(await w.recognize(await ocrBlob(back,{x:.01,y:.02,w:.49,h:.90}))).data.text;
    setBusy("Reading directions, right column…");
    rightDirections=(await w.recognize(await ocrBlob(back,{x:.50,y:.02,w:.49,h:.90}))).data.text;
   }
   await w.terminate();
   if(front){setTitle(extractTitle(titleText));const parsed=parse(ingredientText);setIngredients(parsed.length?parsed:parse(titleText+"\n"+ingredientText))}
   if(back)setInstructions([cleanDirections(leftDirections),cleanDirections(rightDirections)].filter(Boolean).join("\n\n"));
   setBusy("");
  }catch{setBusy("Couldn’t read it. You can still enter it below.")}
 }
 function update(i:number,k:keyof Ingredient,v:string){setIngredients(x=>x.map((a,n)=>n===i?{...a,[k]:v}:a))}
 async function save(){
  if(!title.trim())return;setBusy("Saving recipe…");
  try{
   const f=new FormData();f.set("title",title);f.set("servings",String(servings));f.set("ingredients",JSON.stringify(ingredients.filter(i=>i.name.trim())));f.set("instructions",instructions);
   if(front){setBusy("Compressing photos…");f.set("front",await uploadFile(front))}if(back)f.set("back",await uploadFile(back));setBusy("Saving recipe…");
   const r=await fetch("/api/recipes",{method:"POST",body:f});let d:{error?:string;recipe?:Recipe}={};try{d=await r.json()}catch{}
   if(!r.ok||!d.recipe){setBusy(r.status===413?"Upload was too large. Try saving again; photos are compressed automatically.":d.error||"Couldn’t save recipe");return}
   setRecipes(x=>[d.recipe!,...x]);setBusy("");setTab("recipes");setFront(null);setBack(null);if(frontUrl)URL.revokeObjectURL(frontUrl);if(backUrl)URL.revokeObjectURL(backUrl);setFrontUrl("");setBackUrl("");setTitle("");setIngredients([]);setInstructions("");
  }catch{setBusy("Save failed. Check your connection and try again.")}
 }
 function add(r:Recipe){setList(x=>[...x,...r.ingredients.map((i,n)=>({...i,id:`${r.id}-${n}-${Date.now()}`,checked:false,recipe:r.title}))]);setTab("list")}
 const toggle=(id:string)=>setList(x=>x.map(i=>i.id===id?{...i,checked:!i.checked}:i));
 return <main className="shell"><section className="app">
  <header className="masthead"><div><p className="eyebrow">Recipe box + market list</p><h1>myApron</h1></div><button className="scan-top" onClick={()=>setTab("scan")}>＋ Scan card</button></header>
  <nav className="tabs">{(["recipes","scan","list"]as Tab[]).map(n=><button key={n} className={tab===n?"active":""} onClick={()=>setTab(n)}>{n==="list"?`List · ${list.filter(i=>!i.checked).length}`:n}</button>)}</nav>
  {tab==="recipes"&&<div className="content"><div className="section-head"><div><h2>Your recipes</h2><p>{recipes.length?`${recipes.length} cards, ready to cook`:"Scan your first card to begin"}</p></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search recipes…" /></div>
   {!filtered.length&&<button className="empty-card" onClick={()=>setTab("scan")}><span>▣</span><strong>Scan your first recipe card</strong><small>Use your phone camera. Front and back work best.</small></button>}
   <div className="recipe-grid">{filtered.map(r=><article className="recipe-card" key={r.id}><div className="recipe-photo">{r.frontImageKey?<img src={`/api/images?key=${encodeURIComponent(r.frontImageKey)}`} alt=""/>:<span>Recipe</span>}</div><div className="recipe-body"><small>{r.servings} servings · {r.ingredients.length} ingredients</small><h3>{r.title}</h3><p>{r.ingredients.slice(0,3).map(i=>i.name).join(" · ")}</p><button onClick={()=>add(r)}>Add to shopping list</button></div></article>)}</div>
  </div>}
  {tab==="scan"&&<div className="content scanner"><div className="section-head"><div><h2>Scan a recipe card</h2><p>Photograph both sides in bright, even light.</p></div></div>
   <div className="capture-grid">{(["front","back"]as const).map(side=>{const u=side==="front"?frontUrl:backUrl;return<label className={`capture ${u?"has-image":""}`} key={side}>{u?<img src={u} alt={`${side} preview`}/>:<><span className="camera">⌗</span><strong>{side} of card</strong><small>Tap to open camera</small></>}<input type="file" accept="image/*" capture="environment" onChange={e=>choose(e,side)}/></label>})}</div>
   <button className="primary wide" onClick={scan} disabled={!!busy||(!front&&!back)}>{busy||"Read card"}</button>
   {(title||ingredients.length||instructions)&&<section className="review"><div className="review-title"><div><span>Review before saving</span><h2>Check the quantities</h2></div><label>Servings<input type="number" min="1" value={servings} onChange={e=>setServings(Number(e.target.value))}/></label></div>
    <label className="field">Recipe title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="ingredient-head"><strong>Ingredients</strong><button onClick={()=>setIngredients(x=>[...x,{quantity:"",name:"",aisle:"Other"}])}>＋ Add row</button></div>
    <div className="ingredient-editor">{ingredients.map((i,n)=><div className="ingredient-row" key={n}><input aria-label="Quantity" value={i.quantity} onChange={e=>update(n,"quantity",e.target.value)} placeholder="Qty"/><input aria-label="Ingredient" value={i.name} onChange={e=>update(n,"name",e.target.value)} placeholder="Ingredient"/><select aria-label="Aisle" value={i.aisle} onChange={e=>update(n,"aisle",e.target.value)}>{aisles.map(a=><option key={a}>{a}</option>)}</select><button aria-label="Remove ingredient" onClick={()=>setIngredients(x=>x.filter((_,j)=>j!==n))}>×</button></div>)}</div>
    <label className="field">Instructions<textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={8}/></label><button className="primary wide" onClick={save} disabled={!!busy}>{busy||"Save recipe"}</button>
   </section>}
  </div>}
  {tab==="list"&&<div className="content"><div className="section-head"><div><h2>Shopping list</h2><p>{list.filter(i=>!i.checked).length} items left</p></div><button className="text-button" onClick={()=>setList(x=>x.filter(i=>!i.checked))}>Clear checked</button></div>
   {!list.length&&<div className="empty-list"><span>✓</span><h3>Your list is clear</h3><p>Add a recipe, or scan a new card.</p></div>}
   {grouped.map(g=><section className="aisle" key={g.aisle}><h3>{g.aisle}<small>{g.items.length}</small></h3>{g.items.map(i=><button className={`list-item ${i.checked?"done":""}`} key={i.id} onClick={()=>toggle(i.id)}><i>{i.checked?"✓":""}</i><span><strong>{i.name}</strong><small>{i.recipe}</small></span><em>{i.quantity}</em></button>)}</section>)}
  </div>}
  <footer>Private recipe box · Card scans are stored with your recipes</footer>
 </section></main>
}
