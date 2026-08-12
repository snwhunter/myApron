"use client";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Ingredient={quantity:string;name:string;aisle:string};
type Recipe={id:number;title:string;servings:number;ingredients:Ingredient[];instructions:string;frontImageKey?:string};
type Item=Ingredient&{id:string;checked:boolean;recipe?:string};
type Tab="recipes"|"scan"|"list";
const aisles=["Produce","Dairy & Eggs","Meat","Pantry","Bakery","Frozen","Household","Other"];
const guess=(name:string)=>{const n=name.toLowerCase();if(/onion|garlic|pepper|tomato|potato|lemon|lime|herb|spinach|kale|carrot/.test(n))return"Produce";if(/milk|cheese|cream|butter|egg|yogurt/.test(n))return"Dairy & Eggs";if(/chicken|beef|pork|fish|salmon|shrimp|turkey/.test(n))return"Meat";if(/bread|bun|tortilla|roll/.test(n))return"Bakery";return"Pantry"};
function parse(text:string):Ingredient[]{return text.split("\n").map(x=>x.replace(/^[•·\-*]\s*/,"").trim()).filter(x=>x.length>2&&!/^(ingredients|you.?ll need|instructions|cook|prep)/i.test(x)).slice(0,24).map(line=>{const m=line.match(/^([\d¼½¾⅓⅔⅛⅜⅝⅞/.\s]+(?:cups?|tbsp|tsp|oz|lbs?|cloves?|pieces?|bunch|head|can|package)?\s+)?(.+)$/i);const quantity=m?.[1]?.trim()||"";const name=(m?.[2]||line).trim();return{quantity,name,aisle:guess(name)}})}

export default function Home(){
 const[tab,setTab]=useState<Tab>("recipes"),[recipes,setRecipes]=useState<Recipe[]>([]),[list,setList]=useState<Item[]>([]);
 const[front,setFront]=useState<File|null>(null),[back,setBack]=useState<File|null>(null),[frontUrl,setFrontUrl]=useState(""),[backUrl,setBackUrl]=useState("");
 const[title,setTitle]=useState(""),[servings,setServings]=useState(2),[ingredients,setIngredients]=useState<Ingredient[]>([]),[instructions,setInstructions]=useState(""),[busy,setBusy]=useState(""),[search,setSearch]=useState("");
 useEffect(()=>{fetch("/api/recipes").then(r=>r.json()).then(d=>setRecipes(d.recipes||[])).catch(()=>{})},[]);
 useEffect(()=>{const s=localStorage.getItem("market-list-items");if(s)setList(JSON.parse(s))},[]);
 useEffect(()=>localStorage.setItem("market-list-items",JSON.stringify(list)),[list]);
 const filtered=recipes.filter(r=>r.title.toLowerCase().includes(search.toLowerCase())||r.ingredients.some(i=>i.name.toLowerCase().includes(search.toLowerCase())));
 const grouped=useMemo(()=>aisles.map(aisle=>({aisle,items:list.filter(i=>i.aisle===aisle)})).filter(g=>g.items.length),[list]);
 function choose(e:ChangeEvent<HTMLInputElement>,side:"front"|"back"){const f=e.target.files?.[0];if(!f)return;const u=URL.createObjectURL(f);if(side==="front"){setFront(f);setFrontUrl(u)}else{setBack(f);setBackUrl(u)}}
 async function scan(){if(!front&&!back)return;setBusy("Reading your card…");try{const{createWorker}=await import("tesseract.js");const w=await createWorker("eng");let a="",b="";if(front){setBusy("Reading the front…");a=(await w.recognize(front)).data.text}if(back){setBusy("Reading the back…");b=(await w.recognize(back)).data.text}await w.terminate();const lines=a.split("\n").map(x=>x.trim()).filter(Boolean);setTitle(lines.find(x=>x.length>5&&x.length<80)||"New recipe");setIngredients(parse(a));setInstructions(b.trim());setBusy("")}catch{setBusy("Couldn’t read it. You can still enter it below.")}}
 function update(i:number,k:keyof Ingredient,v:string){setIngredients(x=>x.map((a,n)=>n===i?{...a,[k]:v}:a))}
 async function save(){if(!title.trim())return;setBusy("Saving recipe…");const f=new FormData();f.set("title",title);f.set("servings",String(servings));f.set("ingredients",JSON.stringify(ingredients.filter(i=>i.name.trim())));f.set("instructions",instructions);if(front)f.set("front",front);if(back)f.set("back",back);const r=await fetch("/api/recipes",{method:"POST",body:f});const d=await r.json();if(!r.ok){setBusy(d.error||"Couldn’t save");return}setRecipes(x=>[d.recipe,...x]);setBusy("");setTab("recipes");setFront(null);setBack(null);setFrontUrl("");setBackUrl("");setTitle("");setIngredients([]);setInstructions("")}
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
