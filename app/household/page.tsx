"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Recipe={id:number;title:string;servings:number};
type Inventory={id:string;name:string;quantity:string;aisle:string;location:string;barcode?:string|null};
type Plan={id:string;weekStart:string;recipeId:number;recipeTitle:string;cookedOn?:string|null};
type Leftover={id:string;recipeId?:number|null;recipeTitle:string;cookedOn:string;servings:number;notes:string};
type Purchase={id:string;merchant:string;purchasedOn:string;totalCents:number;items:unknown[];source:string};
type Tab="inventory"|"plan"|"leftovers"|"purchases";

function monday(date=new Date()){
  const d=new Date(date);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10);
}
async function api(kind:string,body?:unknown,week?:string){
  const url=`/api/household?kind=${encodeURIComponent(kind)}${week?`&week=${encodeURIComponent(week)}`:""}`;
  const r=await fetch(url,body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:undefined);
  if(!r.ok)throw new Error(await r.text());return r.json();
}

export default function Household(){
  const[tab,setTab]=useState<Tab>("inventory"),[busy,setBusy]=useState("");
  const[inventory,setInventory]=useState<Inventory[]>([]),[recipes,setRecipes]=useState<Recipe[]>([]),[plan,setPlan]=useState<Plan[]>([]),[leftovers,setLeftovers]=useState<Leftover[]>([]),[purchases,setPurchases]=useState<Purchase[]>([]);
  const[week,setWeek]=useState(monday()),[name,setName]=useState(""),[qty,setQty]=useState(""),[location,setLocation]=useState("pantry"),[recipeId,setRecipeId]=useState<number|"">("");
  async function refresh(){setBusy("Loading…");try{const [i,r,p,l,u]=await Promise.all([api("pantry"),fetch("/api/recipes").then(x=>x.json()),api("plan",undefined,week),api("leftovers"),api("purchases")]);setInventory(i.items||[]);setRecipes(r.recipes||[]);setPlan(p.items||[]);setLeftovers(l.items||[]);setPurchases(u.items||[])}finally{setBusy("")}}
  useEffect(()=>{
    let active=true;
    Promise.all([api("pantry"),fetch("/api/recipes").then(x=>x.json()),api("plan",undefined,week),api("leftovers"),api("purchases")])
      .then(([i,r,p,l,u])=>{if(!active)return;setInventory(i.items||[]);setRecipes(r.recipes||[]);setPlan(p.items||[]);setLeftovers(l.items||[]);setPurchases(u.items||[])})
      .catch(()=>{if(active)setBusy("Couldn’t load household data")});
    return()=>{active=false};
  },[week]);
  const grouped=useMemo(()=>["pantry","fridge","freezer"].map(loc=>({loc,items:inventory.filter(i=>i.location===loc)})),[inventory]);
  async function addInventory(){if(!name.trim())return;await api("pantry",{kind:"pantry",item:{name:name.trim(),quantity:qty,location,aisle:location==="pantry"?"Pantry":"Other"}});setName("");setQty("");await refresh()}
  async function addPlan(){const r=recipes.find(x=>x.id===Number(recipeId));if(!r)return;await api("plan",{kind:"plan",item:{weekStart:week,recipeId:r.id,recipeTitle:r.title}});setRecipeId("");await refresh()}
  async function cook(item:Plan){const today=new Date().toISOString().slice(0,10);await api("plan",{kind:"plan",item:{...item,cookedOn:today}});await api("leftovers",{kind:"leftovers",item:{recipeId:item.recipeId,recipeTitle:item.recipeTitle,cookedOn:today,servings:1,notes:""}});await refresh()}
  async function remove(kind:string,id:string){await api(kind,{kind,action:"delete",id});await refresh()}
  return <main style={{maxWidth:1000,margin:"0 auto",padding:20,fontFamily:"Arial,sans-serif"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><div><Link href="/" style={{textDecoration:"none"}}>← Recipes & shopping</Link><h1 style={{margin:"8px 0"}}>myApron household</h1><p style={{margin:0}}>Pantry, fridge, freezer, weekly plan, leftovers and purchases.</p></div><div>{busy}</div></header>
    <nav style={{display:"flex",gap:8,flexWrap:"wrap",margin:"24px 0"}}>{(["inventory","plan","leftovers","purchases"] as Tab[]).map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"10px 14px",fontWeight:tab===t?700:400}}>{t}</button>)}</nav>
    {tab==="inventory"&&<section><h2>Food inventory</h2><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Item"/><input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Quantity"/><select value={location} onChange={e=>setLocation(e.target.value)}><option value="pantry">Pantry</option><option value="fridge">Fridge</option><option value="freezer">Freezer</option></select><button onClick={addInventory}>Add</button></div>{grouped.map(g=><div key={g.loc}><h3 style={{textTransform:"capitalize"}}>{g.loc} · {g.items.length}</h3>{g.items.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #ddd"}}><span><strong>{i.name}</strong> {i.quantity&&`· ${i.quantity}`}</span><button onClick={()=>remove("pantry",i.id)}>Remove</button></div>)}</div>)}</section>}
    {tab==="plan"&&<section><h2>Plan for week of {week}</h2><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}><input type="date" value={week} onChange={e=>setWeek(e.target.value)}/><select value={recipeId} onChange={e=>setRecipeId(e.target.value?Number(e.target.value):"")}><option value="">Choose recipe…</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select><button onClick={addPlan}>Add to week</button></div>{plan.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:"1px solid #ddd"}}><span><strong>{p.recipeTitle}</strong>{p.cookedOn?` · cooked ${p.cookedOn}`:""}</span><span>{!p.cookedOn&&<button onClick={()=>cook(p)}>Cook today</button>} <button onClick={()=>remove("plan",p.id)}>Remove</button></span></div>)}</section>}
    {tab==="leftovers"&&<section><h2>Leftovers</h2>{!leftovers.length&&<p>No leftovers recorded.</p>}{leftovers.map(l=><div key={l.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:"1px solid #ddd"}}><span><strong>{l.recipeTitle}</strong> · cooked {l.cookedOn} · {l.servings} serving{l.servings===1?"":"s"}</span><button onClick={()=>remove("leftovers",l.id)}>Finished</button></div>)}</section>}
    {tab==="purchases"&&<section><h2>Purchase history</h2><p>Smart Capturer can feed receipts and inventory updates through the future capture hook.</p>{!purchases.length&&<p>No purchases recorded.</p>}{purchases.map(p=><div key={p.id} style={{padding:"10px 0",borderBottom:"1px solid #ddd"}}><strong>{p.merchant||"Purchase"}</strong> · {p.purchasedOn||"date unknown"} · ${(p.totalCents/100).toFixed(2)} <small>({p.source})</small></div>)}</section>}
  </main>
}
