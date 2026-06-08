import { supabase } from './supabase.js';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
async function ai(prompt, max = 1000) {
  try {
    const r = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: max,
        messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    return d.content?.map(b => b.text || "").join("") || "";
  } catch { return ""; }
}

const db = {
  set: async (k, v) => { try { await supabase.from('app_storage').upsert({ key: k, value: JSON.stringify(v) }); } catch { localStorage.setItem(k, JSON.stringify(v)); } },
  get: async (k, fb = null) => { try { const { data } = await supabase.from('app_storage').select('value').eq('key', k).single(); return data ? JSON.parse(data.value) : fb; } catch { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } } },
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_DEALS = [
  { id:"d1", company:"Nexus AI", contact:"Priya Patel", email:"priya@nexusai.io", phone:"+91 98400 11234", value:120000, stage:"Proposal", score:78, color:"#3B7BFF", sector:"AI/ML", source:"Inbound", notes:"Follow up on security review", initials:"NA", created:"2025-04-10", lastActivity:"2025-05-15", momentum:"Rising" },
  { id:"d2", company:"DataStack", contact:"Sarah Chen", email:"sarah@datastack.co", phone:"+91 99400 22345", value:89000, stage:"Demo", score:62, color:"#A78BFA", sector:"Data", source:"Referral", notes:"Demo scheduled for Thursday", initials:"DS", created:"2025-04-22", lastActivity:"2025-05-17", momentum:"Stable" },
  { id:"d3", company:"CloudPrime", contact:"James Wu", email:"james@cloudprime.dev", phone:"+91 97400 33456", value:55000, stage:"Qualified", score:38, color:"#F59E0B", sector:"Cloud", source:"Cold Outreach", notes:"Budget approval pending", initials:"CP", created:"2025-04-02", lastActivity:"2025-05-10", momentum:"Declining" },
  { id:"d4", company:"FinTech Co", contact:"Tom Bradley", email:"tom@fintechco.in", phone:"+91 98700 44567", value:67000, stage:"Negotiation", score:88, color:"#22C55E", sector:"FinTech", source:"LinkedIn", notes:"Contract redlines received", initials:"FC", created:"2025-05-01", lastActivity:"2025-05-18", momentum:"Rising" },
  { id:"d5", company:"VortexLabs", contact:"Alex Mercer", email:"alex@vortexlabs.io", phone:"+91 96400 55678", value:33500, stage:"Closed Won", score:100, color:"#22C55E", sector:"DevTools", source:"Event", notes:"Invoice sent", initials:"VL", created:"2025-03-15", lastActivity:"2025-05-12", momentum:"Stable" },
  { id:"d6", company:"AutoScale", contact:"Leila Roy", email:"leila@autoscale.cloud", phone:"+91 95400 66789", value:44000, stage:"Lead", score:22, color:"#EF4444", sector:"DevOps", source:"Website", notes:"Needs product walkthrough", initials:"AS", created:"2025-03-20", lastActivity:"2025-04-28", momentum:"Declining" },
];
const SEED_INVESTORS = [
  { id:"i1", name:"Ravi Sharma", firm:"Peak Ventures", focus:["SaaS","AI/ML","FinTech"], stage:"Seed–A", match:94, checks:"₹20L–1.5Cr", portfolio:28, color:"#3B7BFF", initials:"RS", location:"Bengaluru", status:"Not connected", bio:"Previously backed 4 unicorns. Loves capital-efficient B2B SaaS." },
  { id:"i2", name:"Monica Lee", firm:"Horizon Capital", focus:["B2B","Enterprise","Cloud"], stage:"A–B", match:88, checks:"₹75L–6Cr", portfolio:42, color:"#A78BFA", initials:"ML", location:"Mumbai", status:"Not connected", bio:"Ex-Google. Focuses on enterprise software with strong retention metrics." },
  { id:"i3", name:"David Park", firm:"Amplify Fund", focus:["Deep Tech","AI","Climate"], stage:"Pre-seed", match:81, checks:"₹8L–75L", portfolio:67, color:"#2DD4BF", initials:"DP", location:"Delhi", status:"Request sent", bio:"Founder-first investor. Backed 3 AI-native tools in last 18 months." },
  { id:"i4", name:"Elena Vasquez", firm:"Catalyst Partners", focus:["Marketplace","Data"], stage:"B+", match:76, checks:"₹3.7Cr–18Cr", portfolio:19, color:"#22C55E", initials:"EV", location:"Hyderabad", status:"Not connected", bio:"Growth equity focused. Looks for ₹2Cr+ ARR with proven NRR." },
  { id:"i5", name:"Kevin Zhang", firm:"Alpha Collective", focus:["Consumer","Creator Economy"], stage:"Seed", match:71, checks:"₹15L–1.1Cr", portfolio:54, color:"#F59E0B", initials:"KZ", location:"Pune", status:"Not connected", bio:"Community-led growth specialist. Co-leads rounds with other angels." },
  { id:"i6", name:"Sarah Okonkwo", firm:"Impact Ventures", focus:["EdTech","HealthTech"], stage:"Pre-seed", match:68, checks:"₹5L–50L", portfolio:38, color:"#EF4444", initials:"SO", location:"Chennai", status:"Connected", bio:"Impact-first investor. Requires 3× social ROI alongside financial returns." },
];
const SEED_NOTIFS = [
  { id:"n1", type:"funding", icon:"💰", title:"Nexus AI closes Series B", body:"$18M led by Sequoia. APAC expansion planned.", time:"2h ago", read:false },
  { id:"n2", type:"hiring", icon:"👥", title:"DataStack hiring surge", body:"23 engineering roles posted this week.", time:"5h ago", read:false },
  { id:"n3", type:"deal", icon:"✅", title:"VortexLabs deal closed!", body:"Deal marked Closed Won. Invoice sent.", time:"1d ago", read:true },
  { id:"n4", type:"meeting", icon:"📅", title:"Meeting reminder", body:"Discovery Call with Sarah Chen in 30 min.", time:"2d ago", read:true },
  { id:"n5", type:"investor", icon:"🤝", title:"New investor match", body:"Ravi Sharma (94% match) viewed your profile.", time:"3d ago", read:true },
];
const STAGES = ["Lead","Qualified","Demo","Proposal","Negotiation","Closed Won","Closed Lost"];
const scoreColor = s => s >= 70 ? "#22C55E" : s >= 40 ? "#F59E0B" : "#EF4444";
const scoreLabel = s => s >= 70 ? "High" : s >= 40 ? "Medium" : "Low";
const fmt = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}K`;
const uid = () => `x${Date.now()}${Math.random().toString(36).slice(2,6)}`;
const stageCls = s => s==="Closed Won"?"sg":s==="Negotiation"?"sv":s==="Proposal"?"si":s==="Demo"?"sb":s==="Qualified"?"sa":s==="Closed Lost"?"sr":"ss";

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500;700&family=Sora:wght@700;800&display=swap');
:root{
  --bg:#0A0D14; --surface:#111520; --card:#161C2D; --border:#1E2A42;
  --blue:#3B7BFF; --green:#22C55E; --amber:#F59E0B; --red:#EF4444;
  --purple:#A78BFA; --teal:#2DD4BF;
  --text:#E8EDF8; --muted:#6B7A99; --subtle:#1A2236;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E2A42;border-radius:99px}
input,select,textarea,button{font-family:'DM Sans',sans-serif}

/* LAYOUT */
.shell{display:flex;min-height:100vh}
.sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:60;transition:transform .25s ease}
.sb-logo{padding:16px 14px 13px;border-bottom:1px solid var(--border);flex-shrink:0;cursor:pointer}
.sb-logo-row{display:flex;align-items:center;gap:9px}
.sb-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;font-family:'Sora',sans-serif;flex-shrink:0}
.sb-name{font-family:'Sora',sans-serif;font-weight:800;font-size:14px;color:var(--text)}
.sb-nav{flex:1;padding:10px 8px;overflow-y:auto}
.sb-sec{margin-bottom:18px}
.sb-lbl{font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;padding:0 8px;margin-bottom:4px;opacity:.6}
.sb-item{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;cursor:pointer;transition:all .12s;font-size:12.5px;font-weight:500;color:var(--muted);margin-bottom:1px;white-space:nowrap}
.sb-item:hover{background:rgba(255,255,255,.05);color:var(--text)}
.sb-item.active{background:rgba(59,123,255,.15);color:var(--blue);font-weight:600}
.sb-item svg{width:14px;height:14px;flex-shrink:0}
.sb-chip{margin-left:auto;font-size:9px;font-weight:700;border-radius:99px;padding:1px 6px;line-height:1.7;flex-shrink:0}
.ch-b{background:var(--blue);color:#fff}.ch-g{background:var(--green);color:#fff}.ch-r{background:var(--red);color:#fff}.ch-a{background:var(--amber);color:#000}
.sb-footer{padding:10px 8px;border-top:1px solid var(--border);flex-shrink:0}
.sb-user{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:8px;cursor:pointer;transition:background .12s}
.sb-user:hover{background:rgba(255,255,255,.04)}
.ava{border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0;font-family:'Sora',sans-serif}
.sb-uname{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-plan{font-size:9px;background:rgba(59,123,255,.2);color:var(--blue);border-radius:4px;padding:1px 6px;font-weight:600;display:inline-block;margin-top:2px}

/* TOPBAR */
.main{margin-left:220px;flex:1;display:flex;flex-direction:column;min-height:100vh}
.topbar{height:50px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:10px;position:sticky;top:0;z-index:50;flex-shrink:0}
.tb-brand{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);min-width:0}
.tb-brand strong{color:var(--text);font-weight:600}
.search-trigger{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:0 11px;height:31px;min-width:180px;max-width:260px;cursor:pointer;transition:all .12s;flex:1}
.search-trigger:hover{border-color:var(--blue)}
.search-trigger-txt{font-size:12px;color:var(--muted);flex:1}
.search-kbd{font-size:9px;background:var(--border);border-radius:4px;padding:1px 5px;color:var(--muted);font-weight:600;flex-shrink:0}
.tb-right{display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0}
.icon-btn{width:31px;height:31px;border-radius:8px;border:1px solid var(--border);background:var(--card);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);transition:all .12s;position:relative;flex-shrink:0}
.icon-btn:hover{background:var(--subtle);color:var(--text)}
.icon-btn svg{width:14px;height:14px}
.ndot{position:absolute;top:6px;right:6px;width:6px;height:6px;background:var(--blue);border-radius:50%;border:1.5px solid var(--surface)}
.ai-pill{display:flex;align-items:center;gap:5px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:7px;padding:3px 9px;flex-shrink:0}
.ai-dot{width:6px;height:6px;background:var(--green);border-radius:50%;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.ai-pill-txt{font-size:10.5px;font-weight:600;color:var(--green)}

/* PAGE */
.page{padding:20px 24px;flex:1}
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap}
.ph-title{font-family:'Sora',sans-serif;font-size:19px;font-weight:800;color:var(--text);line-height:1.2}
.ph-sub{font-size:12px;color:var(--muted);margin-top:3px}
.ph-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 13px;height:32px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .13s;font-family:'DM Sans',sans-serif;border:none;white-space:nowrap}
.btn-p{background:var(--blue);color:#fff}.btn-p:hover{background:#2563eb;box-shadow:0 0 16px rgba(59,123,255,.4)}
.btn-sec{background:var(--subtle);color:var(--text);border:1px solid var(--border)}.btn-sec:hover{background:var(--border)}
.btn-out{background:transparent;color:var(--muted);border:1px solid var(--border)}.btn-out:hover{background:var(--card);color:var(--text)}
.btn-ghost{background:transparent;color:var(--muted)}.btn-ghost:hover{background:var(--subtle);color:var(--text)}
.btn-danger{background:rgba(239,68,68,.12);color:var(--red);border:1px solid rgba(239,68,68,.25)}.btn-danger:hover{background:rgba(239,68,68,.2)}
.btn-green{background:rgba(34,197,94,.12);color:var(--green);border:1px solid rgba(34,197,94,.25)}.btn-green:hover{background:rgba(34,197,94,.2)}
.btn-sm{height:28px;padding:0 11px;font-size:12px}
.btn-xs{height:24px;padding:0 8px;font-size:11px}
.btn:disabled{opacity:.4;cursor:not-allowed;pointer-events:none}

/* CARDS */
.card{background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 1px 8px rgba(0,0,0,.3)}
.card-hd{font-size:13.5px;font-weight:700;color:var(--text);margin-bottom:2px}
.card-sub{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;opacity:.7}

/* GRIDS */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}
.s2{grid-column:span 2}.s3{grid-column:span 3}

/* STAT CARDS */
.stat{background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat.blue::before{background:var(--blue)}.stat.green::before{background:var(--green)}.stat.amber::before{background:var(--amber)}.stat.red::before{background:var(--red)}
.stat-val{font-family:'DM Mono',monospace;font-size:26px;font-weight:700;color:var(--text);margin:4px 0}
.stat-lbl{font-size:11.5px;color:var(--muted)}
.chg{font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:2px;margin-top:7px;padding:2px 7px;border-radius:99px}
.up{background:rgba(34,197,94,.12);color:var(--green)}.dn{background:rgba(239,68,68,.12);color:var(--red)}

/* BADGES */
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:99px;font-size:10.5px;font-weight:600;white-space:nowrap}
.si{background:rgba(59,123,255,.15);color:var(--blue)}.sg{background:rgba(34,197,94,.15);color:var(--green)}
.sa{background:rgba(245,158,11,.15);color:var(--amber)}.sr{background:rgba(239,68,68,.15);color:var(--red)}
.ss{background:var(--subtle);color:var(--muted)}.sv{background:rgba(167,139,250,.15);color:var(--purple)}
.sb2{background:rgba(45,212,191,.12);color:var(--teal)}

/* FORM */
.input{width:100%;height:36px;border:1px solid var(--border);border-radius:8px;padding:0 12px;font-size:13px;color:var(--text);outline:none;transition:all .12s;background:var(--subtle)}
.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,123,255,.12)}
.input::placeholder{color:var(--muted)}
.textarea{width:100%;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);outline:none;resize:vertical;min-height:80px;line-height:1.5;background:var(--subtle);transition:border-color .12s}
.textarea:focus{border-color:var(--blue);outline:none}
.select{width:100%;height:36px;border:1px solid var(--border);border-radius:8px;padding:0 12px;font-size:13px;color:var(--text);outline:none;background:var(--subtle);cursor:pointer}
.select:focus{border-color:var(--blue)}
.lbl{font-size:11.5px;font-weight:600;color:var(--muted);margin-bottom:5px;display:block}
.fgrp{margin-bottom:13px}

/* TABLE */
.tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.tbl th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--subtle);white-space:nowrap}
.tbl td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle;color:var(--text)}
.tbl tr:hover td{background:var(--subtle)}
.tbl tr:last-child td{border-bottom:none}

/* PROGRESS */
.pbar{height:5px;background:var(--border);border-radius:99px;overflow:hidden}
.pfill{height:100%;border-radius:99px;transition:width .8s ease}

/* OVERLAYS & MODALS */
.overlay{position:fixed;inset:0;background:rgba(0,0,5,.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(5px)}
.modal{background:var(--card);border:1.5px solid var(--border);border-radius:18px;width:100%;max-width:640px;box-shadow:0 24px 64px rgba(0,0,0,.6);overflow:hidden;max-height:92vh;display:flex;flex-direction:column}
.modal-lg{max-width:740px}
.modal-hd{padding:18px 20px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.modal-title{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:var(--text)}
.modal-body{padding:18px 20px;overflow-y:auto;flex:1}
.modal-ft{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:7px;justify-content:flex-end;flex-shrink:0}

/* DEAL CARD */
.deal-card{background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:17px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.deal-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0}
.deal-card:hover{border-color:rgba(59,123,255,.4);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.4)}
.deal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:13px}

/* SIGNAL CHIP */
.sig-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:rgba(59,123,255,.1);border:1px solid rgba(59,123,255,.2);border-radius:99px;font-size:11px;font-weight:500;color:var(--blue);margin:2px}

/* TABS */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:14px}
.tab{padding:8px 14px;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .12s}
.tab:hover{color:var(--text)}
.tab.active{color:var(--blue);border-bottom-color:var(--blue)}

/* SENTIMENT */
.sent-pos{background:rgba(34,197,94,.12);color:var(--green);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600}
.sent-neg{background:rgba(239,68,68,.12);color:var(--red);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600}
.sent-neu{background:var(--subtle);color:var(--muted);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600}

/* AI */
.ai-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.25);border-radius:99px;font-size:10.5px;font-weight:600;color:var(--purple)}
.spin{width:13px;height:13px;border:2px solid rgba(59,123,255,.2);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}

/* MOMENTUM */
.mom-r{color:var(--green)}.mom-s{color:var(--amber)}.mom-d{color:var(--red)}

/* NOTIFICATION DRAWER */
.drawer{position:fixed;top:0;right:0;bottom:0;width:360px;background:var(--surface);border-left:1px solid var(--border);z-index:150;display:flex;flex-direction:column;box-shadow:-8px 0 32px rgba(0,0,0,.5)}
.drawer-hd{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}

/* SEARCH */
.search-modal{background:var(--card);border:1.5px solid var(--border);border-radius:14px;width:100%;max-width:560px;box-shadow:0 24px 64px rgba(0,0,0,.6);overflow:hidden}
.search-inp{display:flex;align-items:center;gap:9px;padding:13px 16px;border-bottom:1px solid var(--border)}
.search-inp input{flex:1;border:none;outline:none;font-size:14px;color:var(--text);background:transparent;font-family:'DM Sans',sans-serif}
.search-inp input::placeholder{color:var(--muted)}
.search-results{padding:6px 6px 10px;max-height:360px;overflow-y:auto}
.search-sec-lbl{font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;padding:8px 10px 4px;opacity:.6}
.search-row{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:7px;cursor:pointer;transition:background .1s}
.search-row:hover{background:var(--subtle)}

/* AI FLOAT */
.ai-float{position:fixed;bottom:20px;right:20px;z-index:100}
.ai-fab{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--purple));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(59,123,255,.4);transition:transform .2s;color:#fff;font-size:18px;flex-shrink:0}
.ai-fab:hover{transform:scale(1.1)}
.ai-win{position:absolute;bottom:56px;right:0;width:340px;background:var(--card);border-radius:14px;border:1.5px solid var(--border);box-shadow:0 20px 56px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}
.ai-win-hd{background:linear-gradient(135deg,rgba(59,123,255,.2),rgba(167,139,250,.2));padding:13px 15px;border-bottom:1px solid var(--border);flex-shrink:0}
.ai-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px;max-height:240px}
.ai-msg{padding:8px 11px;border-radius:9px;font-size:12px;line-height:1.5;max-width:90%}
.ai-msg.bot{background:var(--subtle);color:var(--text);border:1px solid var(--border);align-self:flex-start}
.ai-msg.usr{background:var(--blue);color:#fff;align-self:flex-end}
.ai-inp-row{display:flex;gap:6px;padding:9px 10px;border-top:1px solid var(--border);flex-shrink:0}
.ai-in{flex:1;height:32px;border:1px solid var(--border);border-radius:7px;padding:0 9px;font-size:12px;outline:none;background:var(--subtle);color:var(--text);font-family:'DM Sans',sans-serif}
.ai-in:focus{border-color:var(--blue)}
.ai-send{width:32px;height:32px;border-radius:7px;background:var(--blue);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}

/* TOASTS */
.toast-wrap{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999;display:flex;flex-direction:column;gap:6px;pointer-events:none;align-items:center}
.toast{padding:9px 15px;border-radius:9px;font-size:12px;font-weight:500;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4);animation:tup .22s ease;pointer-events:all;display:flex;align-items:center;gap:6px}
.toast.success{background:var(--green);color:#000}.toast.info{background:var(--blue)}.toast.warn{background:var(--amber);color:#000}.toast.error{background:var(--red)}
@keyframes tup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* AUTH */
.auth-wrap{min-height:100vh;display:flex}
.auth-left{flex:1;background:linear-gradient(135deg,#070d1e 0%,#12104a 100%);display:flex;flex-direction:column;justify-content:center;padding:56px 48px}
.auth-right{width:440px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;justify-content:center;padding:48px 44px;overflow-y:auto}
.oauth-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:37px;border:1px solid var(--border);border-radius:8px;background:var(--card);font-size:13px;font-weight:500;cursor:pointer;transition:all .12s;font-family:'DM Sans',sans-serif;color:var(--text);margin-bottom:7px}
.oauth-btn:hover{border-color:var(--blue)}
.auth-div{display:flex;align-items:center;gap:10px;margin:13px 0;font-size:12px;color:var(--muted)}
.auth-div-line{flex:1;height:1px;background:var(--border)}
.otp-grid{display:flex;gap:8px;justify-content:center;margin:16px 0}
.otp-box{width:44px;height:52px;border:1.5px solid var(--border);border-radius:8px;background:var(--subtle);color:var(--text);font-size:22px;font-family:'DM Mono',monospace;font-weight:700;text-align:center;outline:none;transition:border-color .12s}
.otp-box:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,123,255,.12)}

/* ONBOARDING */
.ob-wrap{min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px}
.ob-card{background:var(--card);border:1.5px solid var(--border);border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.4);width:100%;max-width:560px;padding:32px 38px}
.ob-dot{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;flex-shrink:0;transition:all .2s}
.ob-dot.done{background:var(--blue);color:#fff}.ob-dot.active{background:var(--blue);color:#fff;box-shadow:0 0 0 4px rgba(59,123,255,.2)}.ob-dot.todo{background:var(--subtle);color:var(--muted);border:1.5px solid var(--border)}
.ob-line{flex:1;height:2px;background:var(--border);margin:0 4px;transition:background .3s}.ob-line.done{background:var(--blue)}
.ob-option{border:1.5px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;transition:all .13s;display:flex;gap:10px;align-items:flex-start}
.ob-option:hover{border-color:var(--blue)}.ob-option.sel{border-color:var(--blue);background:rgba(59,123,255,.08)}

/* FRAPPE CONNECT */
.frappe-wrap{min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px}
.frappe-card{background:var(--card);border:1.5px solid var(--border);border-radius:18px;width:100%;max-width:480px;padding:34px 40px}
.frappe-logo{width:52px;height:52px;border-radius:12px;background:rgba(59,123,255,.12);border:1px solid rgba(59,123,255,.25);display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px}

/* LANDING */
.hero{min-height:100vh;background:linear-gradient(135deg,#060c1a 0%,#11104a 55%,#060c1a 100%);color:#fff;display:flex;flex-direction:column}
.h-nav{display:flex;align-items:center;padding:15px 56px;gap:20px;flex-shrink:0}
.h-links{display:flex;gap:20px;margin:0 auto}
.h-link{color:rgba(255,255,255,.55);font-size:13px;font-weight:500;cursor:pointer;transition:color .12s}
.h-link:hover{color:#fff}
.h-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 40px 28px}
.h-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;background:rgba(59,123,255,.18);border:1px solid rgba(59,123,255,.38);border-radius:99px;font-size:11px;font-weight:600;color:#93bbff;margin-bottom:18px}
.h-title{font-family:'Sora',sans-serif;font-size:48px;font-weight:800;line-height:1.1;max-width:740px;margin-bottom:14px}
.h-title span{background:linear-gradient(135deg,#6fa7ff,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.h-sub{font-size:15px;color:rgba(255,255,255,.52);max-width:460px;line-height:1.65;margin-bottom:26px}
.hbp{padding:11px 22px;background:var(--blue);color:#fff;border-radius:9px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .15s}
.hbp:hover{background:#2563eb;transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,123,255,.4)}
.hbs{padding:11px 22px;background:rgba(255,255,255,.07);color:#fff;border-radius:9px;font-size:13.5px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.14);font-family:'DM Sans',sans-serif;transition:all .15s}
.hbs:hover{background:rgba(255,255,255,.12)}

/* KANBAN */
.kanban{display:flex;gap:11px;overflow-x:auto;padding-bottom:12px}
.kb-col{background:var(--subtle);border:1px solid var(--border);border-radius:12px;min-width:195px;max-width:195px;display:flex;flex-direction:column;max-height:calc(100vh - 148px)}
.kb-hd{padding:10px 12px 8px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.kb-hd-name{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.kb-cnt{font-size:9.5px;background:var(--border);color:var(--muted);border-radius:99px;padding:1px 6px;font-weight:600}
.kb-cards{padding:7px;display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto}
.kb-card{background:var(--card);border:1px solid var(--border);border-radius:9px;padding:10px;cursor:pointer;transition:all .15s}
.kb-card:hover{border-color:rgba(59,123,255,.4);transform:translateY(-1px)}

/* TOGGLE */
.toggle{width:36px;height:20px;border-radius:99px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
.toggle-knob{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:3px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}

/* NEWS FEED */
.news-item{background:var(--subtle);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px}
.news-source{font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.news-headline{font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;line-height:1.4}
.news-body{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:6px}
.social-item{background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.15);border-radius:10px;padding:12px;margin-bottom:8px}

@media(max-width:900px){
  .sidebar{transform:translateX(-100%)}.sidebar.mob-open{transform:translateX(0)}
  .mob-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:55}
  .main{margin-left:0}.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr}
  .auth-left{display:none}.auth-right{width:100%}.h-title{font-size:28px}
  .h-nav{padding:12px 16px}.page{padding:12px 14px}
  .drawer{width:100%!important}.ob-card{padding:22px 18px}
  .s2,.s3{grid-column:span 1}.deal-grid{grid-template-columns:1fr}
}
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = {
  dash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  deals: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  ai: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  inv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  set: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  dots: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  arr: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  dl: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  comm: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

// ─── PROBABILITY GAUGE (SVG Semicircle with needle) ────────────────────────────
const ProbGauge = ({ score, size = 180 }) => {
  const col = scoreColor(score);
  const cx = size / 2, cy = size * 0.58, r = size * 0.38, sw = size * 0.068;
  const toRad = deg => deg * Math.PI / 180;
  const pt = (deg) => ({ x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) });
  const arcPath = (from, to, radius, strokeW, color, opacity = 1) => {
    const s = pt(from), e = pt(to);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return <path d={`M${s.x},${s.y} A${radius},${radius} 0 ${large} 1 ${e.x},${e.y}`} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" opacity={opacity}/>;
  };
  // -210 to 30 = 240 degrees total. score 0 = -210, score 100 = 30
  const scoreAngle = -210 + (score / 100) * 240;
  const needle = pt(scoreAngle);
  const zones = [[-210, -130, "#EF4444"], [-130, -50, "#F59E0B"], [-50, 30, "#22C55E"]];
  const ticks = [0, 25, 50, 75, 100].map(v => -210 + (v / 100) * 240);
  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      {/* Background arc */}
      {arcPath(-210, 30, r, sw, "#1E2A42")}
      {/* Zone arcs */}
      {zones.map(([f, t, c]) => arcPath(f, t, r, sw, c, 0.25))}
      {/* Score fill */}
      {arcPath(-210, scoreAngle, r, sw, col)}
      {/* Tick marks */}
      {ticks.map((angle, i) => {
        const inner = { x: cx + (r - sw * 0.7) * Math.cos(toRad(angle)), y: cy + (r - sw * 0.7) * Math.sin(toRad(angle)) };
        const outer = { x: cx + (r + sw * 0.3) * Math.cos(toRad(angle)), y: cy + (r + sw * 0.3) * Math.sin(toRad(angle)) };
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#1E2A42" strokeWidth="1.5"/>;
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={col} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={sw * 0.42} fill={col}/>
      <circle cx={cx} cy={cy} r={sw * 0.2} fill="#161C2D"/>
      {/* Score text */}
      <text x={cx} y={cy * 1.12} textAnchor="middle" fill={col} fontFamily="DM Mono,monospace" fontSize={size * 0.18} fontWeight="700">{score}%</text>
      <text x={cx} y={cy * 1.28} textAnchor="middle" fill={col} fontFamily="DM Sans,sans-serif" fontSize={size * 0.072} fontWeight="600">{scoreLabel(score)} Likelihood</text>
      {/* Zone labels */}
      <text x={cx - r * 0.85} y={cy + 4} textAnchor="middle" fill="#EF4444" fontFamily="DM Sans,sans-serif" fontSize={size * 0.055} fontWeight="700">LOW</text>
      <text x={cx} y={cy - r * 0.82} textAnchor="middle" fill="#F59E0B" fontFamily="DM Sans,sans-serif" fontSize={size * 0.055} fontWeight="700">MED</text>
      <text x={cx + r * 0.85} y={cy + 4} textAnchor="middle" fill="#22C55E" fontFamily="DM Sans,sans-serif" fontSize={size * 0.055} fontWeight="700">HIGH</text>
    </svg>
  );
};

// ─── MINI GAUGE (for deal cards) ──────────────────────────────────────────────
const MiniGauge = ({ score }) => {
  const col = scoreColor(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ flex: 1, height: 4, background: "#1E2A42", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: col, borderRadius: 99, transition: "width .8s" }}/>
      </div>
      <span style={{ fontFamily: "DM Mono,monospace", fontSize: 12, fontWeight: 700, color: col, minWidth: 34 }}>{score}%</span>
    </div>
  );
};

// ─── SHARE BRIEF MODAL ────────────────────────────────────────────────────────
function ShareModal({ deal, brief, onClose, showToast }) {
  const [copied, setCopied] = useState(false);
  const fullText = brief ? `DEALGUAGE ACCOUNT BRIEF — ${deal.company}\n\n📊 PROBABILITY SCORE: ${deal.score}% (${scoreLabel(deal.score)} Likelihood)\n⚡ MOMENTUM: ${deal.momentum}\n\n📋 COMPANY SUMMARY\n${brief.summary}\n\n📰 RECENT SIGNALS\n${(brief.signals||[]).map(s=>`• ${s}`).join("\n")}\n\n💡 NEXT ACTIONS\n${(brief.nextActions||[]).map((a,i)=>`${i+1}. ${a}`).join("\n")}\n\n⚠ RISK FACTORS\n${(brief.riskFactors||[]).map(r=>`• ${r}`).join("\n")}\n\nGenerated by DealGauge AI` : "";
  const copyText = () => { navigator.clipboard?.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast("Brief copied to clipboard!", "success"); };
  const download = () => { const b = new Blob([fullText], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `DealGauge_${deal.company.replace(/\s/g,"_")}_Brief.txt`; a.click(); showToast("Brief downloaded!", "success"); };
  const emailShare = () => { window.open(`mailto:?subject=Account Brief: ${deal.company} — ${deal.score}% Deal Score&body=${encodeURIComponent(fullText)}`); };
  const whatsapp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`*${deal.company} — Deal Brief*\nScore: ${deal.score}% ${scoreLabel(deal.score)}\n\n${brief?.summary||""}\n\nNext action: ${brief?.nextActions?.[0]||""}\n\n_via DealGauge AI_`)}`); };
  const slack = () => { navigator.clipboard?.writeText(`*${deal.company}* | ${deal.score}% ${scoreLabel(deal.score)} | ⚡ ${deal.momentum}\n>${brief?.summary||""}\n*Next action:* ${brief?.nextActions?.[0]||""}`); showToast("Slack-formatted brief copied!", "success"); };
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-hd">
          <div className="modal-title">Share Brief — {deal.company}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 28, height: 28, padding: 0 }}>{I.x}</button>
        </div>
        <div className="modal-body">
          <div style={{ background: "#1A2236", border: "1px solid #1E2A42", borderRadius: 9, padding: 12, marginBottom: 16, maxHeight: 120, overflowY: "auto" }}>
            <div style={{ fontFamily: "DM Mono,monospace", fontSize: 11, color: "#6B7A99", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{fullText.slice(0, 280)}…</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              [I.copy, copied ? "Copied!" : "Copy to clipboard", copyText, "si"],
              [I.dl, "Download .txt file", download, "sg"],
              [I.mail, "Send via email", emailShare, "si"],
              [<span style={{ fontSize: 16 }}>💬</span>, "Copy for Slack / Teams", slack, "sv"],
              [<span style={{ fontSize: 16 }}>📱</span>, "Share on WhatsApp", whatsapp, "sb2"],
            ].map(([icon, label, fn, cls]) => (
              <button key={label} className={`btn badge ${cls}`} style={{ justifyContent: "flex-start", gap: 10, height: 38, padding: "0 13px", borderRadius: 9, fontSize: 12.5, width: "100%" }} onClick={fn}>
                <span style={{ flexShrink: 0 }}>{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DEAL DETAIL MODAL (MVP core screen) ─────────────────────────────────────
function DealDetailModal({ deal, onClose, showToast, onEdit, savedBriefs, toggleSaveBrief }) {
  const [tab, setTab] = useState("brief");
  const [brief, setBrief] = useState(null);
  const [newsFeed, setNewsFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const saved = savedBriefs?.includes(deal.id);

  useEffect(() => { generateBrief(); }, []);

  const generateBrief = async () => {
    setLoading(true);
    const txt = await ai(`Sales intelligence for ${deal.contact} at ${deal.company} (${deal.sector}, ${deal.stage}, ${fmt(deal.value)}, current score ${deal.score}%). Return ONLY valid JSON: {"summary":"2-3 sentence company overview","signals":["signal1","signal2","signal3"],"scoreExplanation":"3-4 sentences explaining why score is ${deal.score}%","nextActions":["specific action 1","specific action 2","specific action 3"],"riskFactors":["risk1","risk2"],"momentum":"${deal.momentum}"}`, 1000);
    try { setBrief(JSON.parse(txt.replace(/```json|```/g, "").trim())); }
    catch {
      setBrief({ summary: `${deal.company} is a ${deal.sector} company with ${deal.stage} stage deal and ${scoreLabel(deal.score)} probability based on current pipeline signals.`, signals: [`${deal.stage} stage — active evaluation in progress`, `Deal value ${fmt(deal.value)} signals serious buying intent`, `Contact ${deal.contact} confirmed decision-making authority`], scoreExplanation: `Score of ${deal.score}% reflects the ${deal.stage} stage with ${deal.score >= 70 ? "strong positive signals and recent engagement." : deal.score >= 40 ? "moderate signals with some open questions remaining." : "early stage with significant qualification still needed."}`, nextActions: [`Follow up with ${deal.contact} on outstanding questions by end of week`, `Prepare a customised ROI summary for the ${deal.sector} sector`, `Schedule a technical review call to address integration concerns`], riskFactors: [`Budget approval timeline unclear`, `Evaluating 1-2 competing solutions`], momentum: deal.momentum });
    }
    setLoading(false);
  };

  const loadNews = async () => {
    if (newsFeed) return;
    setLoadingNews(true);
    const txt = await ai(`Generate 8 realistic news and social media items for ${deal.company} in ${deal.sector}. Return ONLY valid JSON array: [{"type":"news","source":"string","headline":"string","summary":"string","time":"string","sentiment":"positive|negative|neutral"},{"type":"social","platform":"LinkedIn","author":"string","authorRole":"string","content":"string","likes":number,"time":"string","sentiment":"string"},...repeat mix to 8 total]`, 1500);
    try {
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setNewsFeed(Array.isArray(parsed) ? parsed : []);
    } catch {
      setNewsFeed([
        { type: "news", source: "TechCrunch", headline: `${deal.company} announces expansion into Southeast Asia`, summary: "The company is set to open new offices in Singapore and Jakarta as part of aggressive regional growth.", time: "2 days ago", sentiment: "positive" },
        { type: "social", platform: "LinkedIn", author: deal.contact, authorRole: "VP Sales", content: `Excited to announce we've crossed our Q2 targets 3 weeks early! ${deal.sector} has never been more dynamic. Looking forward to what's next.`, likes: 214, time: "3 days ago", sentiment: "positive" },
        { type: "news", source: "Reuters", headline: `${deal.sector} sector M&A activity up 34% in Q2`, summary: "Consolidation continues as mid-market players seek scale. Analysts expect deal frequency to accelerate.", time: "4 days ago", sentiment: "neutral" },
        { type: "news", source: "Bloomberg", headline: `${deal.company} secures $12M growth funding round`, summary: "The round was led by a Tier-1 VC, signalling strong investor confidence in their product roadmap.", time: "1 week ago", sentiment: "positive" },
        { type: "social", platform: "LinkedIn", author: "Sanjay Mehta", authorRole: "CTO", content: `We're hiring senior engineers! Our tech stack is evolving fast and we need people who love building at scale. Drop me a DM.`, likes: 89, time: "1 week ago", sentiment: "positive" },
        { type: "news", source: "Economic Times", headline: `${deal.company} partners with major enterprise client`, summary: "The partnership is expected to add significantly to recurring revenue and validate the enterprise go-to-market strategy.", time: "2 weeks ago", sentiment: "positive" },
        { type: "social", platform: "LinkedIn", author: deal.contact, authorRole: "VP Sales", content: `Our latest report on ${deal.sector} transformation is live. Key finding: 73% of companies are underinvesting in automation. Full report in comments.`, likes: 156, time: "2 weeks ago", sentiment: "neutral" },
        { type: "news", source: "VCCircle", headline: `${deal.sector} startups face growing competition from incumbents`, summary: "Established players are accelerating digital roadmaps, putting pressure on newer entrants to differentiate faster.", time: "3 weeks ago", sentiment: "negative" },
      ]);
    }
    setLoadingNews(false);
  };

  useEffect(() => { if (tab === "news") loadNews(); }, [tab]);

  const col = scoreColor(deal.score);

  return (
    <>
      <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal modal-lg" style={{ maxWidth: 740 }}>
          <div className="modal-hd">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: deal.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff", flexShrink: 0 }}>{deal.initials}</div>
              <div>
                <div className="modal-title">{deal.company}</div>
                <div style={{ fontSize: 11.5, color: "#6B7A99", marginTop: 2 }}>{deal.contact} · {deal.stage} · {fmt(deal.value)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className={`btn btn-sm ${saved ? "btn-green" : "btn-sec"}`} onClick={() => { toggleSaveBrief(deal.id); showToast(saved ? "Brief unsaved" : "Brief saved! Find it in AI Briefings →", saved ? "warn" : "success"); }}>
                {I.save} {saved ? "Saved ✓" : "Save"}
              </button>
              <button className="btn btn-sm" style={{ background: "rgba(45,212,191,.1)", color: "#2DD4BF", border: "1px solid rgba(45,212,191,.2)" }} onClick={() => setShowShare(true)}>
                {I.share} Share
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 28, height: 28, padding: 0 }}>{I.x}</button>
            </div>
          </div>

          {/* Header with gauge + KPIs */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2A42", display: "flex", alignItems: "center", gap: 20, background: "rgba(0,0,0,.15)" }}>
            <ProbGauge score={deal.score} size={160}/>
            <div style={{ flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[["Stage", <span className={`badge ${stageCls(deal.stage)}`}>{deal.stage}</span>], ["Value", <span style={{ fontFamily: "DM Mono,monospace", fontWeight: 700, color: "#E8EDF8" }}>{fmt(deal.value)}</span>], ["Sector", <span style={{ color: "#6B7A99" }}>{deal.sector}</span>], ["Momentum", <span className={`mom-${deal.momentum === "Rising" ? "r" : deal.momentum === "Stable" ? "s" : "d"}`} style={{ fontWeight: 700 }}>{deal.momentum === "Rising" ? "↑" : deal.momentum === "Stable" ? "→" : "↓"} {deal.momentum}</span>]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 10, color: "#6B7A99", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".04em" }}>{k}</div>{v}</div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {(brief?.signals || deal.notes?.split(",").slice(0, 3) || []).map((s, i) => (
                  <span key={i} className="sig-chip">{s.slice(0, 40)}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: "0 20px", background: "rgba(0,0,0,.1)" }}>
            <div className="tabs">
              {[["brief", "Brief & Explanation"], ["news", "News & Social"], ["actions", "Next Actions"]].map(([id, lbl]) => (
                <div key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{lbl}</div>
              ))}
            </div>
          </div>

          <div className="modal-body" style={{ padding: "14px 20px" }}>
            {tab === "brief" && (
              <>
                {loading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7A99", padding: "24px 0" }}><div className="spin"/>Analysing signals for {deal.company}…</div>
                ) : brief && (
                  <>
                    <div style={{ background: "#1A2236", borderLeft: "3px solid #3B7BFF", borderRadius: "0 8px 8px 0", padding: "11px 14px", marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#3B7BFF", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Company Summary</div>
                      <div style={{ fontSize: 13, color: "#E8EDF8", lineHeight: 1.65 }}>{brief.summary}</div>
                    </div>
                    <div style={{ background: "rgba(59,123,255,.06)", border: "1px solid rgba(59,123,255,.15)", borderRadius: 9, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <span className="ai-chip">✦ AI Score Explanation</span>
                        <span style={{ fontSize: 11, color: "#6B7A99" }}>Why {deal.score}%?</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#E8EDF8", lineHeight: 1.65 }}>{brief.scoreExplanation}</div>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === "news" && (
              <>
                {loadingNews ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7A99", padding: "24px 0" }}><div className="spin"/>Loading signals for {deal.company}…</div>
                ) : (newsFeed || []).map((item, i) => (
                  item.type === "news" ? (
                    <div key={i} className="news-item">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div className="news-source">{item.source}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span className={`sent-${item.sentiment === "positive" ? "pos" : item.sentiment === "negative" ? "neg" : "neu"}`}>{item.sentiment}</span>
                          <span style={{ fontSize: 10, color: "#6B7A99" }}>{item.time}</span>
                        </div>
                      </div>
                      <div className="news-headline">{item.headline}</div>
                      <div className="news-body">{item.summary}</div>
                    </div>
                  ) : (
                    <div key={i} className="social-item">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(167,139,250,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#A78BFA" }}>{item.author?.[0]}</div>
                          <div><div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8EDF8" }}>{item.author}</div><div style={{ fontSize: 11, color: "#6B7A99" }}>{item.authorRole} · {item.platform}</div></div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span className={`sent-${item.sentiment === "positive" ? "pos" : item.sentiment === "negative" ? "neg" : "neu"}`}>{item.sentiment}</span>
                          <span style={{ fontSize: 10, color: "#6B7A99" }}>{item.time}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#E8EDF8", lineHeight: 1.55, marginBottom: 6 }}>{item.content}</div>
                      <div style={{ fontSize: 11, color: "#6B7A99" }}>👍 {item.likes} likes</div>
                    </div>
                  )
                ))}
              </>
            )}

            {tab === "actions" && brief && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>✦ AI Next Best Actions</div>
                  {brief.nextActions?.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 11, padding: "11px 13px", background: "#1A2236", border: "1px solid #1E2A42", borderRadius: 9, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(59,123,255,.2)", border: "1px solid rgba(59,123,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Mono,monospace", fontSize: 11, fontWeight: 700, color: "#3B7BFF", flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ fontSize: 13, color: "#E8EDF8", lineHeight: 1.5 }}>{a}</div>
                    </div>
                  ))}
                </div>
                {brief.riskFactors?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 9 }}>⚠ Risk Factors</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {brief.riskFactors.map((r, i) => (
                        <span key={i} style={{ padding: "5px 11px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 99, fontSize: 12, color: "#EF4444" }}>⚠ {r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-ft">
            <button className="btn btn-sec btn-sm" onClick={() => onEdit(deal)}>Edit deal</button>
            <button className="btn btn-p btn-sm" onClick={generateBrief} disabled={loading}>{loading ? <><div className="spin"/>Refreshing…</> : "↺ Regenerate"}</button>
          </div>
        </div>
      </div>
      {showShare && brief && <ShareModal deal={deal} brief={brief} onClose={() => setShowShare(false)} showToast={showToast}/>}
    </>
  );
}

// ─── DEAL EDIT MODAL ──────────────────────────────────────────────────────────
function DealModal({ deal, onClose, onSave, onDelete }) {
  const [f, setF] = useState(deal || { company: "", contact: "", email: "", phone: "", value: "", stage: "Lead", sector: "SaaS", source: "Inbound", notes: "", score: 30, momentum: "Stable" });
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  const COLORS = ["#3B7BFF","#A78BFA","#22C55E","#F59E0B","#EF4444","#2DD4BF"];
  const save = () => {
    if (!f.company || !f.contact) return;
    onSave({ ...f, value: Number(f.value)||0, score: Number(f.score)||30, id: f.id||uid(), color: f.color||COLORS[Math.floor(Math.random()*COLORS.length)], initials: f.company.slice(0,2).toUpperCase(), created: f.created||new Date().toISOString().slice(0,10), lastActivity: new Date().toISOString().slice(0,10) });
  };
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-title">{!deal ? "Add New Deal" : `Edit — ${deal.company}`}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 28, height: 28, padding: 0 }}>{I.x}</button>
        </div>
        <div className="modal-body">
          <div className="g2">
            <div className="fgrp"><label className="lbl">Company *</label><input className="input" placeholder="Nexus AI" value={f.company} onChange={e => up("company", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Contact *</label><input className="input" placeholder="Priya Patel" value={f.contact} onChange={e => up("contact", e.target.value)}/></div>
          </div>
          <div className="g2">
            <div className="fgrp"><label className="lbl">Email</label><input className="input" type="email" placeholder="priya@nexus.ai" value={f.email} onChange={e => up("email", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Phone</label><input className="input" placeholder="+91 98400 00000" value={f.phone} onChange={e => up("phone", e.target.value)}/></div>
          </div>
          <div className="g2">
            <div className="fgrp"><label className="lbl">Deal Value (₹)</label><input className="input" type="number" placeholder="100000" value={f.value} onChange={e => up("value", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Probability Score (0-100)</label><input className="input" type="number" min="0" max="100" value={f.score} onChange={e => up("score", Math.min(100, Math.max(0, Number(e.target.value))))}/></div>
          </div>
          <div className="g2">
            <div className="fgrp"><label className="lbl">Stage</label><select className="select" value={f.stage} onChange={e => up("stage", e.target.value)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="fgrp"><label className="lbl">Momentum</label><select className="select" value={f.momentum} onChange={e => up("momentum", e.target.value)}>{["Rising","Stable","Declining"].map(m => <option key={m}>{m}</option>)}</select></div>
          </div>
          <div className="g2">
            <div className="fgrp"><label className="lbl">Sector</label><select className="select" value={f.sector} onChange={e => up("sector", e.target.value)}>{["SaaS","FinTech","AI/ML","HealthTech","Data","Cloud","DevTools","DevOps"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="fgrp"><label className="lbl">Source</label><select className="select" value={f.source} onChange={e => up("source", e.target.value)}>{["Inbound","Referral","Cold Outreach","LinkedIn","Event","Partner"].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="fgrp"><label className="lbl">Notes</label><textarea className="textarea" placeholder="Add notes…" value={f.notes} onChange={e => up("notes", e.target.value)}/></div>
        </div>
        <div className="modal-ft">
          {deal && <button className="btn btn-danger btn-sm" onClick={() => onDelete(deal.id)} style={{ marginRight: "auto" }}>{I.trash} Delete</button>}
          <button className="btn btn-out btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={save} disabled={!f.company || !f.contact}>{I.check} {!deal ? "Add Deal" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH (Login / Signup / Forgot Password / Reset Password) ─────────────────
function Auth({ go, setUser }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot | otp | reset
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPass, setNewPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleOtp = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

 const login = async () => {
  if (!form.email || !form.password) { setErr("Please fill in all fields."); return; }
  setLoading(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
  if (error) { setErr(error.message); setLoading(false); return; }
  const u = { name: data.user.email.split("@")[0], email: data.user.email, role: "Founder", plan: "growth", avatar: data.user.email.slice(0,2).toUpperCase() };
  setUser(u); go("app"); setLoading(false);
};

const signup = async () => {
  if (!form.name || !form.email || !form.password) { setErr("Please fill all fields."); return; }
  if (form.password !== form.confirm) { setErr("Passwords do not match."); return; }
  if (form.password.length < 8) { setErr("Password must be at least 8 characters."); return; }
  setLoading(true);
  const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } });
  if (error) { setErr(error.message); setLoading(false); return; }
  const av = form.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const u = { name: form.name, email: form.email, role: "Founder", plan: "growth", avatar: av };
  setUser(u); setLoading(false); go("frappe");
};

  const sendReset = async () => {
    if (!form.email) { setErr("Enter your email first."); return; }
    setLoading(true); await new Promise(r => setTimeout(r, 600)); setLoading(false);
    setMode("otp"); setErr("");
  };

  const verifyOtp = async () => {
    if (otp.join("").length < 6) { setErr("Enter the 6-digit code."); return; }
    setLoading(true); await new Promise(r => setTimeout(r, 500)); setLoading(false);
    setMode("reset"); setErr("");
  };

  const resetPass = async () => {
    if (newPass.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setLoading(true); await new Promise(r => setTimeout(r, 600)); setLoading(false);
    setMode("login"); setErr(""); setOtp(["","","","","",""]);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 40 }}><div className="sb-icon">DG</div><span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: 15, color: "#F1F5F9" }}>DealGauge</span></div>
        <div style={{ fontFamily: "Sora,sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 13, maxWidth: 340 }}>
          Know which deal will close<br/><span style={{ background: "linear-gradient(135deg,#6fa7ff,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>before you pick up the phone.</span>
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.65, maxWidth: 320, marginBottom: 32 }}>Connect your CRM, let DealGauge score your deals, and walk into every meeting prepared in under 5 minutes.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {[["⚡", "From 45 min to under 5 min prep time"], ["🎯", "0–100% probability score per deal"], ["🧠", "AI explains every score — no guesswork"], ["🔗", "Frappe CRM native integration"]].map(([ic, t]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "rgba(255,255,255,.65)" }}><span style={{ fontSize: 16 }}>{ic}</span>{t}</div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        {/* FORGOT PASSWORD — step 1: enter email */}
        {mode === "forgot" && (
          <>
            <div style={{ cursor: "pointer", marginBottom: 22 }} onClick={() => { setMode("login"); setErr(""); }}><span style={{ fontSize: 12.5, color: "#6B7A99" }}>← Back to sign in</span></div>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Reset your password</div>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>Enter your email and we'll send a 6-digit verification code.</div>
            <div className="fgrp"><label className="lbl">Work email</label><input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => up("email", e.target.value)}/></div>
            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#EF4444", marginBottom: 12 }}>⚠ {err}</div>}
            <button className="btn btn-p" style={{ width: "100%", height: 39, fontSize: 13.5 }} onClick={sendReset} disabled={loading}>
              {loading ? <><div className="spin"/>Sending code…</> : "Send reset code →"}
            </button>
          </>
        )}

        {/* FORGOT PASSWORD — step 2: OTP */}
        {mode === "otp" && (
          <>
            <div style={{ cursor: "pointer", marginBottom: 22 }} onClick={() => setMode("forgot")}><span style={{ fontSize: 12.5, color: "#6B7A99" }}>← Back</span></div>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Enter verification code</div>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 4 }}>We sent a 6-digit code to</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#E8EDF8", marginBottom: 20 }}>{form.email}</div>
            <div className="otp-grid">
              {otp.map((v, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el} className="otp-box" maxLength={1} value={v} onChange={e => handleOtp(i, e.target.value)} onKeyDown={e => { if (e.key === "Backspace" && !v && i > 0) otpRefs.current[i-1]?.focus(); }}/>
              ))}
            </div>
            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#EF4444", marginBottom: 12 }}>⚠ {err}</div>}
            <button className="btn btn-p" style={{ width: "100%", height: 39, fontSize: 13.5 }} onClick={verifyOtp} disabled={loading}>
              {loading ? <><div className="spin"/>Verifying…</> : "Verify code →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#6B7A99" }}>Didn't get the code? <span style={{ color: "#3B7BFF", cursor: "pointer", fontWeight: 600 }} onClick={sendReset}>Resend</span></div>
          </>
        )}

        {/* FORGOT PASSWORD — step 3: new password */}
        {mode === "reset" && (
          <>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Set new password</div>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>Choose a strong password for your account.</div>
            <div className="fgrp"><label className="lbl">New password</label><input className="input" type="password" placeholder="Min 8 characters" value={newPass} onChange={e => setNewPass(e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Confirm password</label><input className="input" type="password" placeholder="Repeat password" onKeyDown={e => e.key === "Enter" && resetPass()}/></div>
            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#EF4444", marginBottom: 12 }}>⚠ {err}</div>}
            <button className="btn btn-p" style={{ width: "100%", height: 39, fontSize: 13.5 }} onClick={resetPass} disabled={loading}>
              {loading ? <><div className="spin"/>Saving…</> : "Reset password →"}
            </button>
          </>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <>
            <div style={{ cursor: "pointer", marginBottom: 24 }} onClick={() => go("landing")}><span style={{ fontSize: 12.5, color: "#6B7A99" }}>← Back to home</span></div>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Welcome back</div>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>Sign in to your DealGauge workspace.</div>
            <button className="oauth-btn">G{"\u00a0\u00a0"}Continue with Google</button>
            <button className="oauth-btn">💼{"\u00a0\u00a0"}Continue with LinkedIn</button>
            <div className="auth-div"><div className="auth-div-line"/><span>or sign in with email</span><div className="auth-div-line"/></div>
            <div className="fgrp"><label className="lbl">Work email</label><input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => up("email", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => up("password", e.target.value)} onKeyDown={e => e.key === "Enter" && login()}/></div>
            <div style={{ textAlign: "right", marginBottom: 13 }}><span style={{ fontSize: 12.5, color: "#3B7BFF", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("forgot"); setErr(""); }}>Forgot password?</span></div>
            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#EF4444", marginBottom: 12 }}>⚠ {err}</div>}
            <button className="btn btn-p" style={{ width: "100%", height: 39, fontSize: 13.5 }} onClick={login} disabled={loading}>
              {loading ? <><div className="spin"/>Signing in…</> : "Sign in →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 15, fontSize: 13, color: "#6B7A99" }}>No account? <span style={{ color: "#3B7BFF", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("signup"); setErr(""); }}>Sign up free</span></div>
          </>
        )}

        {/* SIGNUP */}
        {mode === "signup" && (
          <>
            <div style={{ cursor: "pointer", marginBottom: 24 }} onClick={() => go("landing")}><span style={{ fontSize: 12.5, color: "#6B7A99" }}>← Back to home</span></div>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Create your account</div>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>Start your 14-day free trial — no card required.</div>
            <button className="oauth-btn">G{"\u00a0\u00a0"}Continue with Google</button>
            <div className="auth-div"><div className="auth-div-line"/><span>or sign up with email</span><div className="auth-div-line"/></div>
            <div className="fgrp"><label className="lbl">Full name</label><input className="input" placeholder="Jordan Taylor" value={form.name} onChange={e => up("name", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Work email</label><input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => up("email", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Password (min 8 chars)</label><input className="input" type="password" placeholder="Choose a password" value={form.password} onChange={e => up("password", e.target.value)}/></div>
            <div className="fgrp"><label className="lbl">Confirm password</label><input className="input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => up("confirm", e.target.value)} onKeyDown={e => e.key === "Enter" && signup()}/></div>
            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#EF4444", marginBottom: 12 }}>⚠ {err}</div>}
            <button className="btn btn-p" style={{ width: "100%", height: 39, fontSize: 13.5 }} onClick={signup} disabled={loading}>
              {loading ? <><div className="spin"/>Creating account…</> : "Create account →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 15, fontSize: 13, color: "#6B7A99" }}>Have an account? <span style={{ color: "#3B7BFF", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("login"); setErr(""); }}>Sign in</span></div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── FRAPPE CRM CONNECT SCREEN ────────────────────────────────────────────────


function FrappeConnect({ go, showToast }) {
  const [frappeCRM, setFrappeCRM] = useState({
    leads: [], contacts: [], deals: [], synced_at: null, loading: false, error: null,
  });
  const [frappeSyncing, setFrappeSyncing] = useState(false);
  const [frappeTab, setFrappeTab] = useState('deals');
  const [connected, setConnected] = useState(false);

  const syncFrappeCRM = async () => {
    setFrappeSyncing(true);
    setFrappeCRM(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/frappe?action=sync');
      const data = await res.json();
      if (data.success) {
        setFrappeCRM({ leads: data.leads, contacts: data.contacts, deals: data.deals, synced_at: data.synced_at, loading: false, error: null });
        setConnected(true);
        localStorage.setItem('frappe_crm_data', JSON.stringify({ leads: data.leads, contacts: data.contacts, deals: data.deals, synced_at: data.synced_at }));
        showToast('Frappe CRM synced successfully!', 'success');
      } else {
        setFrappeCRM(prev => ({ ...prev, loading: false, error: data.error || 'Sync failed' }));
        showToast('Sync failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      setFrappeCRM(prev => ({ ...prev, loading: false, error: 'Could not connect to Frappe CRM' }));
      showToast('Could not connect to Frappe CRM', 'error');
    }
    setFrappeSyncing(false);
  };

  useState(() => {
    const cached = localStorage.getItem('frappe_crm_data');
    if (cached) {
      try { const p = JSON.parse(cached); setFrappeCRM(prev => ({ ...prev, ...p })); setConnected(true); } catch {}
    }
    syncFrappeCRM();
  }, []);

  const statusColor = (s) => ({ 'Open': '#3b82f6', 'Won': '#22c55e', 'Lost': '#ef4444', 'Interested': '#f59e0b', 'Replied': '#8b5cf6', 'Qualified': '#06b6d4' }[s] || '#6b7280');
  const fmt = (v) => !v ? '—' : typeof v === 'number' ? '₹' + v.toLocaleString('en-IN') : v;

  return (
    <div style={{ padding: '20px', maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🔷</span>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>Frappe CRM</h2>
            {connected && <span style={{ fontSize: '11px', background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: '20px', padding: '2px 10px', fontWeight: '600' }}>Connected</span>}
          </div>
          {frappeCRM.synced_at && <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>Last synced: {new Date(frappeCRM.synced_at).toLocaleString('en-IN')}</p>}
        </div>
        <button onClick={syncFrappeCRM} disabled={frappeSyncing} style={{ padding: '8px 16px', background: frappeSyncing ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: frappeSyncing ? 'not-allowed' : 'pointer' }}>
          {frappeSyncing ? '⟳ Syncing...' : '⟳ Sync Now'}
        </button>
      </div>

      {/* Error */}
      {frappeCRM.error && <div style={{ background: '#1e1a2e', border: '1px solid #7c3aed', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#c4b5fd', fontSize: '13px' }}>⚠️ {frappeCRM.error}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[{ label: 'Deals', count: frappeCRM.deals.length, icon: '💼', color: '#3b82f6' }, { label: 'Leads', count: frappeCRM.leads.length, icon: '🎯', color: '#f59e0b' }, { label: 'Contacts', count: frappeCRM.contacts.length, icon: '👥', color: '#22c55e' }].map(s => (
          <div key={s.label} style={{ background: '#1e293b', borderRadius: '10px', padding: '14px', border: `1px solid ${s.color}33`, textAlign: 'center' }}>
            <div style={{ fontSize: '22px' }}>{s.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['deals', 'leads', 'contacts'].map(tab => (
          <button key={tab} onClick={() => setFrappeTab(tab)} style={{ padding: '7px 16px', background: frappeTab === tab ? '#3b82f6' : '#1e293b', color: frappeTab === tab ? '#fff' : '#94a3b8', border: '1px solid ' + (frappeTab === tab ? '#3b82f6' : '#334155'), borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Loading */}
      {frappeCRM.loading && <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>⟳ Syncing from Frappe CRM...</div>}

      {/* DEALS */}
      {frappeTab === 'deals' && !frappeCRM.loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {frappeCRM.deals.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No deals yet. Click Sync Now.</div>
            : frappeCRM.deals.map(deal => (
              <div key={deal.name} style={{ background: '#1e293b', borderRadius: '10px', padding: '14px 16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{deal.deal_name || deal.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{deal.organization || '—'} · {deal.deal_owner || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: statusColor(deal.status) + '22', color: statusColor(deal.status), border: '1px solid ' + statusColor(deal.status) + '44' }}>{deal.status || 'Open'}</span>
                    {deal.annual_revenue && <span style={{ fontSize: '13px', fontWeight: '700', color: '#22c55e' }}>{fmt(deal.annual_revenue)}</span>}
                  </div>
                </div>
                {deal.probability !== undefined && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Probability</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{deal.probability}%</span>
                    </div>
                    <div style={{ height: '4px', background: '#0f172a', borderRadius: '2px' }}>
                      <div style={{ height: '4px', borderRadius: '2px', width: deal.probability + '%', background: deal.probability >= 70 ? '#22c55e' : deal.probability >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                )}
                {deal.expected_closing_date && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>🗓 Closing: {deal.expected_closing_date}</div>}
              </div>
            ))}
        </div>
      )}

      {/* LEADS */}
      {frappeTab === 'leads' && !frappeCRM.loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {frappeCRM.leads.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No leads yet. Click Sync Now.</div>
            : frappeCRM.leads.map(lead => (
              <div key={lead.name} style={{ background: '#1e293b', borderRadius: '10px', padding: '14px 16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{lead.lead_name || lead.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{lead.company || '—'} · {lead.email_id || '—'}</div>
                    {lead.mobile_no && <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {lead.mobile_no}</div>}
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: statusColor(lead.status) + '22', color: statusColor(lead.status), border: '1px solid ' + statusColor(lead.status) + '44' }}>{lead.status || 'Open'}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  {lead.source && <span style={{ fontSize: '11px', color: '#64748b' }}>Source: {lead.source}</span>}
                  {lead.annual_revenue && <span style={{ fontSize: '11px', color: '#22c55e' }}>{fmt(lead.annual_revenue)}</span>}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* CONTACTS */}
      {frappeTab === 'contacts' && !frappeCRM.loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {frappeCRM.contacts.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No contacts yet. Click Sync Now.</div>
            : frappeCRM.contacts.map(contact => (
              <div key={contact.name} style={{ background: '#1e293b', borderRadius: '10px', padding: '14px 16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{contact.company_name || '—'}{contact.designation ? ` · ${contact.designation}` : ''}</div>
                    {contact.email_id && <div style={{ fontSize: '12px', color: '#64748b' }}>✉ {contact.email_id}</div>}
                    {contact.mobile_no && <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {contact.mobile_no}</div>}
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#3b82f620', border: '1px solid #3b82f640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#3b82f6' }}>
                    {(contact.first_name || contact.name || '?')[0].toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}


// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ go }) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [notifs, setNotifs] = useState(["Meeting reminders", "New funding alerts"]);
  const steps = ["Goals", "Industries", "Notifications", "Done"];
  const goalOpts = [{ id: "track", icon: "🔍", t: "Track accounts", sub: "Monitor companies before meetings" }, { id: "deals", icon: "💼", t: "Manage deals", sub: "Score and advance pipeline" }, { id: "invest", icon: "💰", t: "Connect investors", sub: "Raise funding smarter" }, { id: "intel", icon: "🧠", t: "Market intelligence", sub: "Stay ahead of competition" }];
  const indOpts = ["SaaS", "FinTech", "AI/ML", "HealthTech", "DeepTech", "E-commerce", "EdTech", "B2B", "DevTools", "Consumer"];
  const notifOpts = ["Meeting reminders", "New funding alerts", "Hiring signals", "Deal probability changes", "Investor connections", "AI daily summary"];
  const finish = async () => { await db.set("dg_onboarded", true); go("app"); };

  return (
    <div className="ob-wrap">
      <div className="ob-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="sb-icon" style={{ width: 26, height: 26, fontSize: 11 }}>DG</div><span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: 13.5, color: "#E8EDF8" }}>DealGauge</span></div>
          <span style={{ fontSize: 12, color: "#6B7A99" }}>Step {step + 1} of {steps.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 26 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
              <div title={s} className={`ob-dot ${i < step ? "done" : i === step ? "active" : "todo"}`}>
                {i < step ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`ob-line${i < step ? " done" : ""}`}/>}
            </div>
          ))}
        </div>

        {step === 0 && (<>
          <div style={{ fontFamily: "Sora,sans-serif", fontSize: 19, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>What are your goals?</div>
          <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>We'll personalise DealGauge for your workflow.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {goalOpts.map(g => (
              <div key={g.id} className={`ob-option${goals.includes(g.id) ? " sel" : ""}`} onClick={() => setGoals(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])}>
                <div style={{ fontSize: 19 }}>{g.icon}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF8" }}>{g.t}</div><div style={{ fontSize: 11.5, color: "#6B7A99", marginTop: 2 }}>{g.sub}</div></div>
              </div>
            ))}
          </div>
        </>)}

        {step === 1 && (<>
          <div style={{ fontFamily: "Sora,sans-serif", fontSize: 19, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Select your industries</div>
          <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>We'll surface signals for sectors you care about.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {indOpts.map(ind => (
              <div key={ind} onClick={() => setIndustries(p => p.includes(ind) ? p.filter(x => x !== ind) : [...p, ind])} style={{ padding: "5px 12px", borderRadius: 99, border: `1.5px solid ${industries.includes(ind) ? "#3B7BFF" : "#1E2A42"}`, background: industries.includes(ind) ? "rgba(59,123,255,.1)" : "transparent", color: industries.includes(ind) ? "#3B7BFF" : "#6B7A99", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "all .12s" }}>{ind}</div>
            ))}
          </div>
        </>)}

        {step === 2 && (<>
          <div style={{ fontFamily: "Sora,sans-serif", fontSize: 19, fontWeight: 800, color: "#E8EDF8", marginBottom: 5 }}>Configure notifications</div>
          <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20 }}>Choose what signals matter to you.</div>
          {notifOpts.map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", border: `1px solid ${notifs.includes(n) ? "#3B7BFF" : "#1E2A42"}`, borderRadius: 9, cursor: "pointer", background: notifs.includes(n) ? "rgba(59,123,255,.06)" : "transparent", marginBottom: 7 }} onClick={() => setNotifs(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n])}>
              <span style={{ fontSize: 13, color: "#E8EDF8" }}>{n}</span>
              <div className="toggle" style={{ background: notifs.includes(n) ? "#3B7BFF" : "#1E2A42" }}>
                <div className="toggle-knob" style={{ left: notifs.includes(n) ? 19 : 3 }}/>
              </div>
            </div>
          ))}
        </>)}

        {step === 3 && (<>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🚀</div>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF8", marginBottom: 8 }}>You're all set!</div>
            <div style={{ fontSize: 13, color: "#6B7A99", lineHeight: 1.65, maxWidth: 320, margin: "0 auto 20px" }}>DealGauge is ready. Click any deal card to get your AI brief, probability score, and next best actions.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {["📊 Probability scores", "🧠 AI briefs", "📰 Signal feed", "🤝 Investor matching"].map(t => (
                <span key={t} className="badge si" style={{ padding: "4px 10px", fontSize: 11 }}>{t}</span>
              ))}
            </div>
          </div>
        </>)}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
          <button className="btn btn-out btn-sm" onClick={() => setStep(s => s - 1)} disabled={step === 0} style={{ opacity: step === 0 ? .4 : 1 }}>← Back</button>
          <span style={{ fontSize: 12, color: "#6B7A99" }}>{step + 1}/{steps.length}</span>
          {step < steps.length - 1
            ? <button className="btn btn-p btn-sm" onClick={() => setStep(s => s + 1)}>Continue →</button>
            : <button className="btn btn-p btn-sm" onClick={finish}>Launch DealGauge 🚀</button>}
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH MODAL ─────────────────────────────────────────────────────────────
function SearchModal({ deals, investors, onClose, goPage }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const dRes = useMemo(() => deals.filter(d => d.company.toLowerCase().includes(q.toLowerCase()) || d.contact.toLowerCase().includes(q.toLowerCase())).slice(0, 4), [q, deals]);
  const iRes = useMemo(() => investors.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || i.firm.toLowerCase().includes(q.toLowerCase())).slice(0, 3), [q, investors]);
  const navOpts = [{ label: "Dashboard", page: "dashboard" }, { label: "Pipeline", page: "deals" }, { label: "Signal Feed", page: "signals" }, { label: "AI Briefings", page: "briefing" }, { label: "Investors", page: "investors" }, { label: "Analytics", page: "analytics" }, { label: "Settings", page: "settings" }].filter(n => !q || n.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="search-modal">
        <div className="search-inp">
          {I.search}
          <input ref={ref} placeholder="Search deals, companies, investors, pages…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Escape" && onClose()}/>
          {q && <button className="btn btn-ghost btn-xs" onClick={() => setQ("")}>{I.x}</button>}
          <span style={{ fontSize: 10, color: "#6B7A99", background: "#1E2A42", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>ESC</span>
        </div>
        <div className="search-results">
          {dRes.length > 0 && (<><div className="search-sec-lbl">Deals</div>{dRes.map(d => (<div key={d.id} className="search-row" onClick={() => { goPage("deals"); onClose(); }}><div style={{ width: 26, height: 26, borderRadius: 6, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{d.initials}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF8" }}>{d.company}</div><div style={{ fontSize: 11, color: "#6B7A99" }}>{d.contact} · {d.stage}</div></div><span style={{ fontSize: 11, color: "#6B7A99", fontFamily: "DM Mono,monospace", fontWeight: 700 }}>{d.score}%</span></div>))}</>)}
          {iRes.length > 0 && (<><div className="search-sec-lbl">Investors</div>{iRes.map(i => (<div key={i.id} className="search-row" onClick={() => { goPage("investors"); onClose(); }}><div style={{ width: 26, height: 26, borderRadius: 6, background: i.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{i.initials}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF8" }}>{i.name}</div><div style={{ fontSize: 11, color: "#6B7A99" }}>{i.firm}</div></div></div>))}</>)}
          {navOpts.length > 0 && (<><div className="search-sec-lbl">Navigate</div>{navOpts.map(n => (<div key={n.page} className="search-row" onClick={() => { goPage(n.page); onClose(); }}><div style={{ width: 26, height: 26, borderRadius: 6, background: "#1A2236", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#3B7BFF" }}>{I.arr}</div><div style={{ fontSize: 13, color: "#E8EDF8" }}>Go to {n.label}</div></div>))}</>)}
          {!dRes.length && !iRes.length && !navOpts.length && q && <div style={{ textAlign: "center", padding: "26px 0", color: "#6B7A99", fontSize: 13 }}>No results for "{q}"</div>}
        </div>
      </div>
    </div>
  );
}

// ─── NOTIF DRAWER ─────────────────────────────────────────────────────────────
function NotifDrawer({ notifs, onClose, onMarkAll, onMark }) {
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div className="drawer">
      <div className="drawer-hd">
        <div><div style={{ fontFamily: "Sora,sans-serif", fontSize: 14.5, fontWeight: 800, color: "#E8EDF8" }}>Notifications</div>{unread > 0 && <div style={{ fontSize: 12, color: "#3B7BFF", marginTop: 2, fontWeight: 600 }}>{unread} unread</div>}</div>
        <div style={{ display: "flex", gap: 7 }}>
          {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={onMarkAll} style={{ fontSize: 11 }}>Mark all read</button>}
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 28, height: 28, padding: 0 }}>{I.x}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 14px" }}>
        {notifs.map(n => (
          <div key={n.id} onClick={() => onMark(n.id)} style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid #1E2A42", cursor: "pointer", opacity: n.read ? .55 : 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1A2236", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{n.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7 }}>
                <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: "#E8EDF8", lineHeight: 1.3 }}>{n.title}</div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B7BFF", flexShrink: 0, marginTop: 4 }}/>}
              </div>
              <div style={{ fontSize: 12, color: "#6B7A99", marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
              <div style={{ fontSize: 10.5, color: "#6B7A99", marginTop: 4, opacity: .7 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ deals, user, goPage, setDetailDeal }) {
  const pipe = deals.reduce((s, d) => s + d.value, 0);
  const avgScore = deals.length ? Math.round(deals.reduce((s, d) => s + d.score, 0) / deals.length) : 0;
  const hot = deals.filter(d => d.score >= 70).length;
  const atRisk = deals.filter(d => d.score < 30).length;
  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="ph-title">Good morning, {user?.name?.split(" ")[0] || "Jordan"} 👋</div>
          <div className="ph-sub">{deals.length} deals tracked · {hot} hot deals · {atRisk} at risk</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-out btn-sm" onClick={() => goPage("signals")}>View signal feed</button>
          <button className="btn btn-p btn-sm" onClick={() => goPage("deals")}>{I.plus} Add deal</button>
        </div>
      </div>

      {/* 4 KPI cards as per PRD spec */}
      <div className="g4" style={{ marginBottom: 14 }}>
        {[
          { l: "Pipeline Value", v: fmt(pipe), col: "blue", chg: "+18%", up: true },
          { l: "Avg Deal Score", v: `${avgScore}%`, col: "green", chg: "+4pts", up: true },
          { l: `Hot Deals (≥70%)`, v: String(hot), col: "amber", chg: `+${hot}`, up: true },
          { l: "At Risk (<30%)", v: String(atRisk), col: "red", chg: atRisk > 0 ? `${atRisk} need action` : "None", up: atRisk === 0 },
        ].map(s => (
          <div key={s.l} className={`stat ${s.col}`}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val">{s.v}</div>
            <span className={`chg ${s.up ? "up" : "dn"}`}>{s.up ? "↑" : "↓"} {s.chg}</span>
          </div>
        ))}
      </div>

      <div className="g3" style={{ marginBottom: 14 }}>
        <div className="card s2">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div className="card-hd">Active pipeline</div>
            <div style={{ display: "flex", gap: 8 }}><span className="ai-chip">✦ AI scored</span><button className="btn btn-out btn-xs" onClick={() => goPage("deals")}>View all →</button></div>
          </div>
          <div className="card-sub">Click any deal to open AI brief</div>
          <table className="tbl">
            <thead><tr><th>Company</th><th>Contact</th><th>Value</th><th>Stage</th><th>Score</th><th>Momentum</th></tr></thead>
            <tbody>
              {deals.slice(0, 6).map(d => (
                <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => setDetailDeal(d)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 24, height: 24, borderRadius: 5, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{d.initials}</div><span style={{ fontWeight: 600 }}>{d.company}</span></div></td>
                  <td style={{ color: "#6B7A99" }}>{d.contact}</td>
                  <td style={{ fontFamily: "DM Mono,monospace", fontWeight: 700 }}>{fmt(d.value)}</td>
                  <td><span className={`badge ${stageCls(d.stage)}`}>{d.stage}</span></td>
                  <td><MiniGauge score={d.score}/></td>
                  <td><span className={`mom-${d.momentum === "Rising" ? "r" : d.momentum === "Stable" ? "s" : "d"}`} style={{ fontWeight: 700, fontSize: 12 }}>{d.momentum === "Rising" ? "↑" : d.momentum === "Stable" ? "→" : "↓"} {d.momentum}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div className="card-hd">AI signals</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, background: "#22C55E", borderRadius: "50%", animation: "pulse 2s ease-in-out infinite" }}/>
              <span style={{ fontSize: 10.5, color: "#6B7A99" }}>Live</span>
            </div>
          </div>
          <div className="card-sub">Latest account signals</div>
          {[{ icon: "💰", color: "#3B7BFF", title: "Nexus AI closes Series B", body: "$18M led by Sequoia.", time: "2h ago", type: "Funding" }, { icon: "👥", color: "#22C55E", title: "DataStack hiring surge", body: "23 engineering roles.", time: "5h ago", type: "Hiring" }, { icon: "📰", color: "#2DD4BF", title: "CloudPrime in TechCrunch", body: "Top cloud startup 2025.", time: "Yesterday", type: "News" }, { icon: "⚠", color: "#F59E0B", title: "Competitor launch detected", body: "Review FinTech Co deal.", time: "2d ago", type: "Risk" }].map(s => (
            <div key={s.title} style={{ display: "flex", gap: 9, padding: "10px 0", borderBottom: "1px solid #1E2A42" }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: "#1A2236", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{s.icon}</div>
              <div><div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8EDF8" }}>{s.title}</div><div style={{ fontSize: 11.5, color: "#6B7A99", lineHeight: 1.4 }}>{s.body}</div><div style={{ fontSize: 10, color: "#6B7A99", marginTop: 3 }}>{s.time} · <span style={{ color: s.color, fontWeight: 600 }}>{s.type}</span></div></div>
            </div>
          ))}
          <button className="btn btn-out btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => goPage("signals")}>View full signal feed →</button>
        </div>
      </div>

      {/* Today's meetings */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="card-hd">Today's meetings</div>
          <button className="btn btn-p btn-sm" onClick={() => goPage("briefing")}>Generate AI briefs ✦</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
          {[{ t: "9:30 AM", ttl: "Discovery Call", wth: "Sarah Chen · DataStack", score: 62 }, { t: "1:00 PM", ttl: "Demo Session", wth: "Tom Bradley · FinTech Co", score: 88 }, { t: "3:30 PM", ttl: "Contract Review", wth: "Priya Patel · Nexus AI", score: 78 }].map(m => (
            <div key={m.ttl} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#1A2236", border: "1px solid #1E2A42", borderRadius: 9, cursor: "pointer" }} onClick={() => goPage("briefing")}>
              <div style={{ textAlign: "center", minWidth: 48 }}>
                <div style={{ fontFamily: "DM Mono,monospace", fontSize: 13, fontWeight: 700, color: "#E8EDF8" }}>{m.t.split(" ")[0]}</div>
                <div style={{ fontSize: 9, color: "#6B7A99" }}>{m.t.split(" ")[1]}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8EDF8" }}>{m.ttl}</div>
                <div style={{ fontSize: 11, color: "#6B7A99" }}>{m.wth}</div>
              </div>
              <div style={{ fontFamily: "DM Mono,monospace", fontSize: 13, fontWeight: 700, color: scoreColor(m.score) }}>{m.score}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PIPELINE (Deal cards grid + kanban) ──────────────────────────────────────
function Pipeline({ deals, setDeals, showToast, setDetailDeal }) {
  const [view, setView] = useState("grid");
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score");

  const filtered = useMemo(() => {
    let d = deals;
    if (filter !== "All") d = d.filter(x => x.stage === filter);
    if (search) d = d.filter(x => x.company.toLowerCase().includes(search.toLowerCase()) || x.contact.toLowerCase().includes(search.toLowerCase()));
    return [...d].sort((a, b) => sortBy === "score" ? b.score - a.score : sortBy === "value" ? b.value - a.value : a.company.localeCompare(b.company));
  }, [deals, filter, search, sortBy]);

  const saveDeal = async d => {
    const exists = deals.find(x => x.id === d.id);
    const next = exists ? deals.map(x => x.id === d.id ? d : x) : [d, ...deals];
    setDeals(next); await db.set("dg_deals", next);
    showToast(exists ? `${d.company} updated` : `${d.company} added`, "success"); setModal(null);
  };
  const deleteDeal = async id => {
    const d = deals.find(x => x.id === id);
    const next = deals.filter(x => x.id !== id);
    setDeals(next); await db.set("dg_deals", next);
    showToast(`${d?.company} deleted`, "warn"); setModal(null);
  };
  const move = async (id, dir) => {
    const d = deals.find(x => x.id === id);
    const idx = STAGES.indexOf(d.stage), ns = STAGES[Math.max(0, Math.min(STAGES.length - 1, idx + dir))];
    await saveDeal({ ...d, stage: ns, lastActivity: new Date().toISOString().slice(0, 10) });
  };
  const stageC = { Lead: "#6B7A99", Qualified: "#F59E0B", Demo: "#3B7BFF", Proposal: "#A78BFA", Negotiation: "#2DD4BF", "Closed Won": "#22C55E", "Closed Lost": "#EF4444" };

  return (
    <div className="page">
      <div className="ph">
        <div><div className="ph-title">Pipeline</div><div className="ph-sub">{deals.length} total · {fmt(deals.reduce((s, d) => s + d.value, 0))} pipeline value</div></div>
        <div className="ph-actions">
          <div style={{ display: "flex", gap: 2, background: "#1A2236", borderRadius: 8, padding: 2 }}>
            {[["grid", "⊞ Cards"], ["kanban", "⋮ Board"], ["list", "☰ List"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} className="btn btn-sm" style={{ background: view === v ? "#161C2D" : "transparent", color: view === v ? "#3B7BFF" : "#6B7A99", border: "none" }}>{l}</button>
            ))}
          </div>
          <select className="select" style={{ width: "auto", height: 28, fontSize: 12, padding: "0 9px" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Sort: Score</option><option value="value">Sort: Value</option><option value="name">Sort: Name</option>
          </select>
          <input className="input" style={{ width: 170, height: 28, fontSize: 12 }} placeholder="Search deals…" value={search} onChange={e => setSearch(e.target.value)}/>
          <button className="btn btn-p btn-sm" onClick={() => setModal("new")}>{I.plus} Add deal</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
        {["All", ...STAGES].map(s => (
          <button key={s} className="btn btn-xs" onClick={() => setFilter(s)} style={{ background: filter === s ? "#3B7BFF" : "transparent", color: filter === s ? "#fff" : "#6B7A99", border: filter === s ? "none" : "1px solid #1E2A42" }}>
            {s} {s !== "All" && <span style={{ opacity: .7 }}>({deals.filter(d => d.stage === s).length})</span>}
          </button>
        ))}
      </div>

      {view === "grid" && (
        <div className="deal-grid">
          {filtered.map(d => {
            const col = scoreColor(d.score);
            return (
              <div key={d.id} className="deal-card" style={{ "--card-color": d.color }} onClick={() => setDetailDeal(d)}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${col}, transparent)` }}/>
                {savedBriefs?.includes(d.id) && <div style={{ position: "absolute", top: 10, right: 10, fontSize: 13 }} title="Brief saved">🔖</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>{d.initials}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "DM Mono,monospace", fontSize: 22, fontWeight: 700, color: col }}>{d.score}%</div>
                    <div style={{ fontSize: 9.5, color: "#6B7A99" }}>{scoreLabel(d.score)} Likelihood</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#E8EDF8", marginBottom: 3 }}>{d.company}</div>
                <div style={{ fontSize: 12, color: "#6B7A99", marginBottom: 9 }}>{d.contact} · {d.sector}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <span className={`badge ${stageCls(d.stage)}`}>{d.stage}</span>
                  <span style={{ fontFamily: "DM Mono,monospace", fontSize: 13, fontWeight: 700, color: "#E8EDF8" }}>{fmt(d.value)}</span>
                </div>
                <div style={{ height: 4, background: "#1E2A42", borderRadius: 99, marginBottom: 9, overflow: "hidden" }}>
                  <div style={{ width: `${d.score}%`, height: "100%", background: col, borderRadius: 99 }}/>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`mom-${d.momentum === "Rising" ? "r" : d.momentum === "Stable" ? "s" : "d"}`} style={{ fontSize: 11, fontWeight: 600 }}>{d.momentum === "Rising" ? "↑" : d.momentum === "Stable" ? "→" : "↓"} {d.momentum}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-xs btn-out" style={{ fontSize: 11, padding: "0 8px" }} onClick={e => { e.stopPropagation(); move(d.id, -1); }}>←</button>
                    <button className="btn btn-xs btn-p" style={{ fontSize: 11, padding: "0 8px" }} onClick={e => { e.stopPropagation(); move(d.id, 1); }}>→</button>
                    <button className="btn btn-xs btn-out" style={{ fontSize: 11, padding: "0 8px" }} onClick={e => { e.stopPropagation(); setModal(d); }}>{I.edit}</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="deal-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed #1E2A42", cursor: "pointer", minHeight: 120 }} onClick={() => setModal("new")}>
            <div style={{ textAlign: "center", color: "#6B7A99" }}>
              <div style={{ fontSize: 28, marginBottom: 7, opacity: .5 }}>+</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Add deal</div>
            </div>
          </div>
        </div>
      )}

      {view === "kanban" && (
        <div className="kanban">
          {STAGES.map(stage => {
            const col = filtered.filter(d => d.stage === stage);
            return (
              <div key={stage} className="kb-col">
                <div className="kb-hd">
                  <div><div className="kb-hd-name" style={{ color: stageC[stage] }}>{stage}</div>{col.length > 0 && <div style={{ fontSize: 10, color: "#6B7A99", marginTop: 1 }}>{fmt(col.reduce((s, d) => s + d.value, 0))}</div>}</div>
                  <span className="kb-cnt">{col.length}</span>
                </div>
                <div className="kb-cards">
                  {col.map(d => (
                    <div key={d.id} className="kb-card" onClick={() => setDetailDeal(d)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 5, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>{d.initials}</div>
                        <span style={{ fontFamily: "DM Mono,monospace", fontSize: 12, fontWeight: 700, color: scoreColor(d.score) }}>{d.score}%</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF8" }}>{d.company}</div>
                      <div style={{ fontSize: 10.5, color: "#6B7A99", marginBottom: 6 }}>{d.contact}</div>
                      <div style={{ height: 3, background: "#1E2A42", borderRadius: 99 }}><div style={{ width: `${d.score}%`, height: "100%", background: scoreColor(d.score), borderRadius: 99 }}/></div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-xs" style={{ width: "100%", justifyContent: "center", color: "#6B7A99" }} onClick={() => setModal("new")}>{I.plus} Add</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Company</th><th>Contact</th><th>Value</th><th>Stage</th><th>Score</th><th>Momentum</th><th>Last activity</th><th></th></tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => setDetailDeal(d)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 24, height: 24, borderRadius: 5, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{d.initials}</div><span style={{ fontWeight: 700 }}>{d.company}</span></div></td>
                  <td style={{ color: "#6B7A99" }}>{d.contact}</td>
                  <td style={{ fontFamily: "DM Mono,monospace", fontWeight: 700 }}>{fmt(d.value)}</td>
                  <td><span className={`badge ${stageCls(d.stage)}`}>{d.stage}</span></td>
                  <td style={{ minWidth: 130 }}><MiniGauge score={d.score}/></td>
                  <td><span className={`mom-${d.momentum === "Rising" ? "r" : d.momentum === "Stable" ? "s" : "d"}`} style={{ fontWeight: 600, fontSize: 12 }}>{d.momentum === "Rising" ? "↑" : d.momentum === "Stable" ? "→" : "↓"} {d.momentum}</span></td>
                  <td style={{ color: "#6B7A99", fontSize: 11 }}>{d.lastActivity}</td>
                  <td onClick={e => e.stopPropagation()}><button className="btn btn-ghost btn-xs" onClick={() => setModal(d)}>{I.edit}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <DealModal deal={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={saveDeal} onDelete={deleteDeal}/>}
    </div>
  );
}

// ─── SIGNAL FEED PAGE ─────────────────────────────────────────────────────────
function SignalFeed({ deals }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const signals = [
    { icon: "💰", deal: "Nexus AI", score: 78, type: "Funding", text: "Nexus AI closes $18M Series B led by Sequoia. APAC expansion planned for Q3.", time: "2h ago" },
    { icon: "👥", deal: "DataStack", score: 62, type: "Hiring", text: "DataStack posted 23 engineering roles this week — platform team is scaling fast.", time: "5h ago" },
    { icon: "📰", deal: "CloudPrime", score: 38, type: "News", text: "CloudPrime featured in TechCrunch as a top-10 cloud infrastructure startup to watch in 2025.", time: "Yesterday" },
    { icon: "⚠", deal: "FinTech Co", score: 88, type: "Risk", text: "Competitor Stripe Atlas launched a directly competing product. Review your positioning with Tom.", time: "2d ago" },
    { icon: "📣", deal: "AutoScale", score: 22, type: "Social", text: "AutoScale CEO posted about raising a new round on LinkedIn. This could accelerate or stall your deal.", time: "2d ago" },
    { icon: "📈", deal: "DataStack", score: 62, type: "Signal", text: "DataStack saw a 40% spike in web traffic this week according to SimilarWeb data — buying intent signal.", time: "3d ago" },
    { icon: "🔗", deal: "Nexus AI", score: 78, type: "Partnership", text: "Nexus AI announced a strategic partnership with Microsoft Azure — expanding their TAM significantly.", time: "4d ago" },
    { icon: "📉", deal: "CloudPrime", score: 38, type: "Risk", text: "CloudPrime announced a 10% workforce reduction. Decision-maker may have changed — verify your contact.", time: "5d ago" },
    { icon: "🏆", deal: "FinTech Co", score: 88, type: "Award", text: "FinTech Co named in Deloitte Fast 50 India list for 2025. Strong growth trajectory.", time: "6d ago" },
    { icon: "💡", deal: "PayLayer", score: 55, type: "Product", text: "PayLayer launched a new API product at their annual dev conference — directly relevant to your pitch.", time: "1w ago" },
  ];
  const filters = ["All", "Funding", "Hiring", "News", "Risk", "Social"];
  const filtered = activeFilter === "All" ? signals : signals.filter(s => s.type === activeFilter);
  return (
    <div className="page">
      <div className="ph">
        <div><div className="ph-title">Signal Feed</div><div className="ph-sub">Chronological feed of all account signals, colour-coded by deal score</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 7, height: 7, background: "#22C55E", borderRadius: "50%", animation: "pulse 2s ease-in-out infinite" }}/><span style={{ fontSize: 12, color: "#6B7A99" }}>Live monitoring</span></div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map(f => (
          <button key={f} className="btn btn-xs" onClick={() => setActiveFilter(f)} style={{ background: activeFilter === f ? "#3B7BFF" : "transparent", color: activeFilter === f ? "#fff" : "#6B7A99", border: activeFilter === f ? "none" : "1px solid #1E2A42" }}>
            {f === "Funding" ? "💰 " : f === "Hiring" ? "👥 " : f === "News" ? "📰 " : f === "Risk" ? "⚠ " : f === "Social" ? "📣 " : ""}{f}
            <span style={{ marginLeft: 4, opacity: .65 }}>({f === "All" ? signals.length : signals.filter(s => s.type === f).length})</span>
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 680 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "#6B7A99", fontSize: 13 }}>No {activeFilter} signals yet.</div>}
        {filtered.map((s, i) => {
          const col = scoreColor(s.score);
          return (
            <div key={i} style={{ display: "flex", gap: 13, marginBottom: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "#1A2236", border: `1.5px solid ${col}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
                {i < filtered.length - 1 && <div style={{ width: 2, flex: 1, background: "#1E2A42", marginTop: 4, minHeight: 16 }}/>}
              </div>
              <div style={{ background: "#161C2D", border: "1px solid #1E2A42", borderLeft: `3px solid ${col}`, borderRadius: "0 10px 10px 0", padding: "11px 14px", flex: 1, marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#E8EDF8" }}>{s.deal}</span>
                    <span className="badge" style={{ background: `${col}15`, color: col, fontSize: 10 }}>{s.type}</span>
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <span style={{ fontFamily: "DM Mono,monospace", fontSize: 11, fontWeight: 700, color: col }}>{s.score}%</span>
                    <span style={{ fontSize: 10.5, color: "#6B7A99" }}>{s.time}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "#E8EDF8", lineHeight: 1.55 }}>{s.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI BRIEFING PAGE ─────────────────────────────────────────────────────────
function Briefing({ deals, setDetailDeal, savedBriefs }) {
  const [tab, setTab] = useState("all");
  const savedDeals = deals.filter(d => savedBriefs?.includes(d.id));
  const displayDeals = tab === "saved" ? savedDeals : deals;
  return (
    <div className="page">
      <div className="ph">
        <div><div className="ph-title">AI Meeting Briefings</div><div className="ph-sub">Click any deal to open the full AI brief with probability score, signals, and next actions</div></div>
        <span className="ai-chip">✦ Powered by Claude AI</span>
      </div>
      <div style={{ display: "flex", gap: 2, background: "#1A2236", borderRadius: 8, padding: 2, width: "fit-content", marginBottom: 18 }}>
        <button className="btn btn-sm" onClick={() => setTab("all")} style={{ background: tab === "all" ? "#161C2D" : "transparent", color: tab === "all" ? "#3B7BFF" : "#6B7A99", border: "none" }}>All deals ({deals.length})</button>
        <button className="btn btn-sm" onClick={() => setTab("saved")} style={{ background: tab === "saved" ? "#161C2D" : "transparent", color: tab === "saved" ? "#22C55E" : "#6B7A99", border: "none" }}>🔖 Saved briefs ({savedDeals.length})</button>
      </div>
      {tab === "saved" && savedDeals.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#6B7A99" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔖</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#E8EDF8" }}>No saved briefs yet</div>
          <div style={{ fontSize: 12.5 }}>Open any deal, generate an AI brief, then click Save to find it here.</div>
        </div>
      )}
      <div className="deal-grid">
        {displayDeals.map(d => {
          const col = scoreColor(d.score);
          const isSaved = savedBriefs?.includes(d.id);
          return (
            <div key={d.id} className="deal-card" onClick={() => setDetailDeal(d)} style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${col}, transparent)` }}/>
              {isSaved && <div style={{ position: "absolute", top: 10, right: 10, fontSize: 13 }}>🔖</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 11 }}>
                <div>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff", marginBottom: 8 }}>{d.initials}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#E8EDF8" }}>{d.company}</div>
                  <div style={{ fontSize: 12, color: "#6B7A99" }}>{d.contact} · {d.stage}</div>
                </div>
                <ProbGauge score={d.score} size={96}/>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                <span className="sig-chip">News &amp; Social</span>
                <span className="sig-chip">AI Explanation</span>
                <span className="sig-chip">Next Actions</span>
                <span className="sig-chip">Risk Factors</span>
              </div>
              <button className="btn btn-p btn-sm" style={{ width: "100%", justifyContent: "center" }}>✦ {isSaved ? "View Saved Brief" : "Generate AI Brief"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── INVESTORS ────────────────────────────────────────────────────────────────
function Investors({ investors, setInvestors, showToast }) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [aiIntro, setAiIntro] = useState(null);

  const connect = async id => {
    const inv = investors.find(i => i.id === id);
    if (inv.status !== "Not connected") return;
    const next = investors.map(i => i.id === id ? { ...i, status: "Request sent" } : i);
    setInvestors(next); await db.set("dg_investors", next);
    showToast(`Request sent to ${inv?.name}`, "success");
  };
  const getIntro = async inv => {
    setLoadingId(inv.id); setAiIntro(null);
    const txt = await ai(`Write a 2-sentence warm intro pitch for DealGauge (AI sales intelligence B2B SaaS, Frappe CRM native, ₹1.7Cr ARR, 60% MoM growth) to ${inv.name} at ${inv.firm} who focuses on ${inv.focus.join(", ")} at ${inv.stage}. Be specific and under 55 words.`);
    setAiIntro({ inv: inv.name, txt: txt || `${inv.name}, DealGauge is the only AI sales intelligence platform built natively for Frappe CRM — generating ₹1.7Cr ARR with 60% month-on-month growth. We're raising to expand our signal intelligence layer and would love to explore a ${inv.checks} investment.` });
    setLoadingId(null);
  };

  const filtered = investors.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.firm.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="page">
      <div className="ph">
        <div><div className="ph-title">Investor Matchmaking</div><div className="ph-sub">AI-scored compatibility based on your startup profile</div></div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <input className="input" style={{ width: 190, height: 29, fontSize: 12 }} placeholder="Search investors…" value={search} onChange={e => setSearch(e.target.value)}/>
          <span className="ai-chip">✦ {investors.length} matched</span>
        </div>
      </div>
      {aiIntro && (
        <div style={{ background: "rgba(59,123,255,.08)", border: "1px solid rgba(59,123,255,.2)", borderRadius: 11, padding: "13px 17px", marginBottom: 14, display: "flex", gap: 11, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>✦</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 700, color: "#3B7BFF", marginBottom: 4 }}>AI Warm Intro — {aiIntro.inv}</div><div style={{ fontSize: 13, color: "#E8EDF8", lineHeight: 1.65 }}>{aiIntro.txt}</div></div>
          <button onClick={() => setAiIntro(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7A99", fontSize: 17 }}>×</button>
        </div>
      )}
      <div className="g3">
        {filtered.map(inv => (
          <div key={inv.id} className="card" style={{ transition: "all .18s", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,123,255,.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E2A42"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: inv.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 9 }}>{inv.initials}</div>
              <div style={{ textAlign: "right" }}><div style={{ fontFamily: "DM Mono,monospace", fontSize: 22, fontWeight: 700, color: inv.color }}>{inv.match}%</div><div style={{ fontSize: 9.5, color: "#6B7A99" }}>AI match</div></div>
            </div>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: 14, fontWeight: 700, color: "#E8EDF8" }}>{inv.name}</div>
            <div style={{ fontSize: 12, color: "#6B7A99", marginBottom: 6 }}>{inv.firm} · {inv.stage}</div>
            <div style={{ fontSize: 12, color: "#6B7A99", marginBottom: 9, lineHeight: 1.5 }}>{inv.bio}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 9 }}>{inv.focus.map(f => <span key={f} className="badge ss" style={{ fontSize: 10 }}>{f}</span>)}</div>
            <div className="pbar" style={{ marginBottom: 9 }}><div className="pfill" style={{ width: `${inv.match}%`, background: inv.color }}/></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#6B7A99", marginBottom: 12 }}><span>📍 {inv.location}</span><span>Check: {inv.checks}</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center", background: inv.status === "Connected" ? "rgba(34,197,94,.12)" : inv.status === "Request sent" ? "rgba(167,139,250,.12)" : "#3B7BFF", color: inv.status === "Not connected" ? "#fff" : inv.status === "Connected" ? "#22C55E" : "#A78BFA", fontSize: 12 }} onClick={() => connect(inv.id)}>
                {inv.status === "Connected" ? "✓ Connected" : inv.status === "Request sent" ? "Pending…" : "Connect"}
              </button>
              <button className="btn btn-out btn-sm" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={() => getIntro(inv)} disabled={loadingId === inv.id}>
                {loadingId === inv.id ? <><div className="spin"/>…</> : "✦ AI Intro"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({ deals }) {
  const hot = deals.filter(d => d.score >= 70).length;
  const atRisk = deals.filter(d => d.score < 30).length;
  const avgScore = deals.length ? Math.round(deals.reduce((s, d) => s + d.score, 0) / deals.length) : 0;
  const byStage = STAGES.map(s => ({ stage: s, count: deals.filter(d => d.stage === s).length, value: deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0) }));
  return (
    <div className="page">
      <div className="ph">
        <div><div className="ph-title">Analytics</div><div className="ph-sub">Pipeline performance and forecast accuracy</div></div>
        <div className="ph-actions"><button className="btn btn-out btn-sm">Export PDF</button></div>
      </div>
      <div className="g4" style={{ marginBottom: 14 }}>
        {[["Pipeline Value", fmt(deals.reduce((s, d) => s + d.value, 0)), "blue"], [`Avg Score`, `${avgScore}%`, "green"], [`Hot (≥70%)`, String(hot), "amber"], [`At Risk (<30%)`, String(atRisk), "red"]].map(([l, v, c]) => (
          <div key={l} className={`stat ${c}`}><div className="stat-lbl">{l}</div><div className="stat-val">{v}</div></div>
        ))}
      </div>
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-hd" style={{ marginBottom: 4 }}>Revenue trend</div>
          <div className="card-sub">Monthly (₹K)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 110 }}>
            {[42, 55, 48, 68, 72, 80, 95, 88, 110, 104, 132, 148].map((v, i) => {
              const m = ["J","F","M","A","M","J","J","A","S","O","N","D"][i];
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", height: `${(v/148)*100}px`, background: i >= 10 ? "#3B7BFF" : "#1E2A42", borderRadius: "3px 3px 0 0", position: "relative" }}>
                    {i === 11 && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, color: "#3B7BFF", whiteSpace: "nowrap" }}>₹{v}K</div>}
                  </div>
                  <span style={{ fontSize: 8, color: "#6B7A99" }}>{m}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-hd" style={{ marginBottom: 4 }}>Deal funnel</div>
          <div className="card-sub">Conversion by stage</div>
          {byStage.map(({ stage, count }, i) => {
            const pct = deals.length > 0 ? Math.round(count / deals.length * 100) : 0;
            return (
              <div key={stage} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6B7A99" }}>{stage}</span>
                  <span style={{ fontFamily: "DM Mono,monospace", fontWeight: 700, color: "#E8EDF8" }}>{count} <span style={{ color: "#6B7A99", fontFamily: "DM Sans,sans-serif", fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div className="pbar" style={{ height: 6 }}><div style={{ width: `${pct}%`, height: "100%", background: `rgba(59,123,255,${.2 + (i / STAGES.length) * .8})`, borderRadius: 99, transition: "width .8s" }}/></div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="card-hd" style={{ marginBottom: 4 }}>All deals</div>
        <div className="card-sub">Full breakdown with AI scores</div>
        <table className="tbl">
          <thead><tr><th>Company</th><th>Contact</th><th>Value</th><th>Stage</th><th>Score</th><th>Momentum</th><th>Source</th></tr></thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 22, height: 22, borderRadius: 5, background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{d.initials}</div><span style={{ fontWeight: 600 }}>{d.company}</span></div></td>
                <td style={{ color: "#6B7A99" }}>{d.contact}</td>
                <td style={{ fontFamily: "DM Mono,monospace", fontWeight: 700 }}>{fmt(d.value)}</td>
                <td><span className={`badge ${stageCls(d.stage)}`}>{d.stage}</span></td>
                <td style={{ minWidth: 110 }}><MiniGauge score={d.score}/></td>
                <td><span className={`mom-${d.momentum === "Rising" ? "r" : d.momentum === "Stable" ? "s" : "d"}`} style={{ fontWeight: 600, fontSize: 12 }}>{d.momentum === "Rising" ? "↑" : d.momentum === "Stable" ? "→" : "↓"} {d.momentum}</span></td>
                <td style={{ color: "#6B7A99", fontSize: 11 }}>{d.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ user, setUser, showToast, go }) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({ name: user?.name || "Jordan Taylor", email: user?.email || "jordan@company.com", title: "Founder & CEO", company: "Acme Corp", role: user?.role || "Founder" });
  const [integrations, setIntegrations] = useState({ hubspot: false, salesforce: false, frappe: true, slack: false, gcal: true, linkedin: false });
  const [notifPrefs, setNotifPrefs] = useState({ meetings: true, funding: true, hiring: true, deals: true, investors: false, summaries: true });
  const saveProfile = async () => { const u = { ...user, name: profile.name, email: profile.email, role: profile.role }; setUser(u); await db.set("dg_user", u); showToast("Profile saved", "success"); };
  const Toggle = ({ k }) => <div className="toggle" style={{ background: notifPrefs[k] ? "#3B7BFF" : "#1E2A42" }} onClick={() => setNotifPrefs(p => ({ ...p, [k]: !p[k] }))}><div className="toggle-knob" style={{ left: notifPrefs[k] ? 19 : 3 }}/></div>;
  const tabs = [["profile", "Profile"], ["integrations", "Integrations"], ["notifications", "Notifications"], ["billing", "Billing"]];
  return (
    <div className="page">
      <div className="ph"><div><div className="ph-title">Settings</div><div className="ph-sub">Account, integrations, and billing</div></div></div>
      <div style={{ display: "flex", gap: 2, background: "#1A2236", borderRadius: 8, padding: 2, marginBottom: 18, width: "fit-content" }}>
        {tabs.map(([id, lbl]) => <button key={id} onClick={() => setTab(id)} className="btn btn-sm" style={{ background: tab === id ? "#161C2D" : "transparent", color: tab === id ? "#3B7BFF" : "#6B7A99", border: "none" }}>{lbl}</button>)}
      </div>
      {tab === "profile" && (
        <div className="g2">
          <div className="card">
            <div className="card-hd" style={{ marginBottom: 16 }}>Profile</div>
            {[["Full name", "name", "Jordan Taylor"], ["Work email", "email", "you@company.com"], ["Job title", "title", "Founder & CEO"], ["Company", "company", "Acme Corp"]].map(([l, k, ph]) => (
              <div key={k} className="fgrp"><label className="lbl">{l}</label><input className="input" placeholder={ph} value={profile[k]} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))}/></div>
            ))}
            <div className="fgrp"><label className="lbl">Role</label><select className="select" value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}>{["Founder", "Investor", "Sales Rep", "Sales Manager"].map(r => <option key={r}>{r}</option>)}</select></div>
            <button className="btn btn-p btn-sm" onClick={saveProfile}>{I.check} Save changes</button>
          </div>
          <div className="card">
            <div className="card-hd" style={{ marginBottom: 14 }}>Danger zone</div>
            <div style={{ fontSize: 12.5, color: "#6B7A99", marginBottom: 12 }}>These actions are permanent and cannot be undone.</div>
            <div style={{ display: "flex", gap: 7 }}>
              <button className="btn btn-danger btn-sm">Deactivate account</button>
              <button className="btn btn-danger btn-sm">Delete all data</button>
            </div>
          </div>
        </div>
      )}
      {tab === "integrations" && (
        <div className="g3">
          {[{id:"hubspot",icon:"🟠",name:"HubSpot",desc:"Sync contacts and deals automatically."},{id:"salesforce",icon:"☁️",name:"Salesforce",desc:"Enterprise CRM two-way sync."},{id:"frappe",icon:"🔷",name:"Frappe CRM",desc:"Native integration — 1-click import.",badge:"Native"},{id:"slack",icon:"💬",name:"Slack",desc:"Deal alerts and signal notifications."},{id:"gcal",icon:"📅",name:"Google Calendar",desc:"Auto-detect meetings for briefs."},{id:"linkedin",icon:"🔗",name:"LinkedIn",desc:"Social signals and hiring trends."}].map(int => (
           <div key={int.id} className="cand" onClick={int.id === "frappe" ? () => go("frappe") : undefined} style={{cursor: int.id === "frappe" ? "pointer" : "default"}}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                <div style={{ fontSize: 22 }}>{int.icon}</div>
                <span className={`badge ${integrations[int.id] ? "sg" : "ss"}`}>{integrations[int.id] ? "Connected" : "Not connected"}</span>
              </div>
              <div style={{ fontWeight: 700, color: "#E8EDF8", marginBottom: 2 }}>{int.name}</div>
              {int.badge && <div style={{ fontSize: 10, color: "#3B7BFF", fontWeight: 600, marginBottom: 6 }}>{int.badge}</div>}
              <div style={{ fontSize: 12.5, color: "#6B7A99", marginBottom: 13, lineHeight: 1.5 }}>{int.desc}</div>
              <button className={`btn btn-sm ${integrations[int.id] ? "btn-danger" : "btn-p"}`} onClick={() => { setIntegrations(p => ({ ...p, [int.id]: !p[int.id] })); showToast(!integrations[int.id] ? `${int.name} connected` : `${int.name} disconnected`, !integrations[int.id] ? "success" : "warn"); }}>
                {integrations[int.id] ? "Disconnect" : "Connect"}
              </button>
             {int.id === "frappe" && <button className="btn btn-p btn-sm" style={{marginLeft:6}} onClick={() => go("frappe")}>Open →</button>}
            </div>
          ))}
        </div>
      )}
      {tab === "notifications" && (
        <div className="card" style={{ maxWidth: 540 }}>
          <div className="card-hd" style={{ marginBottom: 15 }}>Notification preferences</div>
          {[["meetings","Meeting reminders","30 min before scheduled calls"],["funding","Funding alerts","When tracked companies raise rounds"],["hiring","Hiring signals","When accounts post new roles"],["deals","Deal score changes","AI-detected risk or opportunity"],["investors","Investor connections","New matches and requests"],["summaries","AI daily summary","Morning digest of signals"]].map(([k, title, desc]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #1E2A42" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500, color: "#E8EDF8" }}>{title}</div><div style={{ fontSize: 11.5, color: "#6B7A99", marginTop: 2 }}>{desc}</div></div>
              <Toggle k={k}/>
            </div>
          ))}
          <button className="btn btn-p btn-sm" style={{ marginTop: 14 }} onClick={() => showToast("Preferences saved", "success")}>{I.check} Save</button>
        </div>
      )}
      {tab === "billing" && (
        <div className="g2">
          <div className="card">
            <div className="card-hd" style={{ marginBottom: 14 }}>Current plan</div>
            <div style={{ background: "rgba(59,123,255,.08)", border: "1px solid rgba(59,123,255,.2)", borderRadius: 11, padding: "15px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#3B7BFF", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Growth Plan</div>
              <div style={{ fontFamily: "DM Mono,monospace", fontSize: 26, fontWeight: 700, color: "#E8EDF8" }}>₹1,250<span style={{ fontSize: 13, color: "#6B7A99", fontFamily: "DM Sans,sans-serif" }}>/month</span></div>
              <div style={{ fontSize: 12, color: "#6B7A99", marginTop: 7 }}>Renews 1 Aug 2025 · GST inclusive</div>
            </div>
            {["50 tracked companies", "100 AI briefings/month", "Full probability meter", "CRM sync (HubSpot, Frappe)", "AI agent", "Priority support"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#E8EDF8", marginBottom: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#3B7BFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>{f}
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-hd" style={{ marginBottom: 14 }}>Usage</div>
            {[["AI briefings", 34, 100], ["Companies tracked", 18, 50], ["API calls", 2340, 10000]].map(([l, u, limit]) => (
              <div key={l} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span style={{ color: "#E8EDF8" }}>{l}</span><span style={{ fontFamily: "DM Mono,monospace", fontWeight: 700, color: "#E8EDF8" }}>{u.toLocaleString()} <span style={{ color: "#6B7A99", fontFamily: "DM Sans,sans-serif", fontWeight: 400 }}>/ {limit.toLocaleString()}</span></span></div>
                <div className="pbar" style={{ height: 6 }}><div className="pfill" style={{ width: `${u/limit*100}%`, background: "#3B7BFF" }}/></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function AIAssistant({ deals, open, setOpen }) {
  const [msgs, setMsgs] = useState([{ role: "bot", txt: "Hi! I'm DealGauge AI. Ask me about your pipeline, request a company brief, or get outreach suggestions." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const suggestions = ["Which deal needs attention?", "Draft outreach for Nexus AI", "Summarise pipeline", "Top deals by score"];
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = async msg => {
    const m = msg || input.trim(); if (!m || loading) return; setInput("");
    setMsgs(x => [...x, { role: "usr", txt: m }]); setLoading(true);
    const ctx = deals.map(d => `${d.company}(${d.stage},${fmt(d.value)},score:${d.score}%,${d.momentum},contact:${d.contact})`).join(";");
    const txt = await ai(`You are DealGauge AI. Pipeline: ${ctx}. Question: "${m}". Reply in 2-3 sentences, be specific and actionable.`, 800);
    setMsgs(x => [...x, { role: "bot", txt: txt || "Try again in a moment." }]); setLoading(false);
  };
  return (
    <div className="ai-float">
      {open && (
        <div className="ai-win">
          <div className="ai-win-hd">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(59,123,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✦</div>
              <div><div style={{ fontSize: 12.5, fontWeight: 700, color: "#E8EDF8" }}>DealGauge AI</div><div style={{ fontSize: 10.5, color: "#6B7A99" }}>Sales intelligence copilot</div></div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#6B7A99", cursor: "pointer", fontSize: 17, marginLeft: "auto" }}>×</button>
            </div>
          </div>
          <div className="ai-msgs">
            {msgs.map((m, i) => <div key={i} className={`ai-msg ${m.role}`}>{m.txt}</div>)}
            {loading && <div className="ai-msg bot"><div style={{ display: "flex", gap: 5, color: "#3B7BFF", fontSize: 12 }}><div className="spin"/>Thinking…</div></div>}
            <div ref={endRef}/>
          </div>
          {msgs.length <= 1 && <div style={{ padding: "0 10px 7px" }}><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{suggestions.map(s => <button key={s} className="btn btn-out btn-xs" style={{ fontSize: 10.5 }} onClick={() => send(s)}>{s}</button>)}</div></div>}
          <div className="ai-inp-row">
            <input className="ai-in" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything about your pipeline…"/>
            <button className="ai-send" onClick={() => send()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
          </div>
        </div>
      )}
      <button className="ai-fab" onClick={() => setOpen(o => !o)} title="Open AI Assistant">{open ? "×" : "✦"}</button>
    </div>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({ go }) {
  return (
    <div className="hero">
      <nav className="h-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="sb-icon">DG</div><span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: 14, color: "#F1F5F9" }}>DealGauge</span></div>
        <div className="h-links">{["Features","Pricing","Investors","Blog"].map(l => <span key={l} className="h-link">{l}</span>)}</div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="hbs" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => go("auth")}>Sign in</button>
          <button className="hbp" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => go("auth")}>Get started →</button>
        </div>
      </nav>
      <div className="h-body">
        <div className="h-badge">✦ AI-Powered · Frappe CRM Native · 14-Day Free Trial</div>
        <h1 className="h-title">Know which deal will close<br/><span>before you pick up the phone</span></h1>
        <p className="h-sub">DealGauge transforms scattered company signals into a live probability score, AI meeting brief, and next best action — in under 5 minutes.</p>
        <div style={{ display: "flex", gap: 9, marginBottom: 40 }}>
          <button className="hbp" onClick={() => go("auth")}>Start Free Trial →</button>
          <button className="hbs">Watch Demo ▶</button>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {[["45 min → 5 min","Meeting prep time"],["0–100%","Deal probability"],["94%","AI accuracy"],["Frappe native","CRM integration"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}><div style={{ fontFamily: "DM Mono,monospace", fontSize: 20, fontWeight: 700, color: "#fff" }}>{v}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: "rgba(59,123,255,.06)", borderTop: "1px solid rgba(59,123,255,.15)", padding: "52px 40px" }}>
        <h2 style={{ fontFamily: "Sora,sans-serif", fontSize: 26, fontWeight: 800, textAlign: "center", color: "#fff", marginBottom: 28 }}>Simple pricing</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 800, margin: "0 auto" }}>
          {[{ n: "Starter", p: "₹499", s: "/month", b: "Small pilot teams", hot: false, feats: ["Basic account briefs", "Simple score display", "Email alerts", "3 team members"] },
            { n: "Growth", p: "₹1,250", s: "/month", b: "Sales teams", hot: true, feats: ["Full probability meter", "AI explanations & actions", "CRM sync", "Unlimited members", "AI agent"] },
            { n: "Enterprise", p: "Custom", s: " pricing", b: "Large companies", hot: false, feats: ["Advanced AI agent", "Admin controls", "Custom integrations", "Dedicated support", "SLA"] }].map(pl => (
            <div key={pl.n} style={{ background: pl.hot ? "rgba(59,123,255,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${pl.hot ? "rgba(59,123,255,.4)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: 22, position: "relative", overflow: "hidden" }}>
              {pl.hot && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#3B7BFF,#A78BFA)" }}/>}
              {pl.hot && <div style={{ background: "#3B7BFF", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, display: "inline-block", marginBottom: 10, textTransform: "uppercase" }}>Most Popular</div>}
              {!pl.hot && <div style={{ height: 20, marginBottom: 10 }}/>}
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 7 }}>{pl.n}</div>
              <div style={{ fontFamily: "DM Mono,monospace", fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{pl.p}<span style={{ fontSize: 12, color: "rgba(255,255,255,.38)", fontFamily: "DM Sans,sans-serif" }}>{pl.s}</span></div>
              {pl.feats.map((f, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.68)", marginBottom: 6 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: pl.hot ? "#3B7BFF" : "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>{f}</div>)}
              <button onClick={() => go("auth")} style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: pl.hot ? "#3B7BFF" : "rgba(255,255,255,.07)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>
                {pl.n === "Enterprise" ? "Contact Sales →" : "Start Free Trial →"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 22, flexWrap: "wrap" }}>
          {[["🔒","No card required"],["↩","Cancel anytime"],["🇮🇳","GST invoices"],["🔷","Frappe native"]].map(([ic, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.38)" }}><span>{ic}</span>{l}</div>
          ))}
        </div>
      </div>
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "18px 56px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="sb-icon" style={{ width: 26, height: 26, fontSize: 11 }}>DG</div><span style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: 13, color: "#E8EDF8" }}>DealGauge</span></div>
        <div style={{ display: "flex", gap: 16 }}>{["Privacy","Terms","Security","Docs"].map(l => <span key={l} style={{ fontSize: 12, color: "rgba(255,255,255,.28)", cursor: "pointer" }}>{l}</span>)}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.18)" }}>© 2025 DealGauge Inc.</div>
      </footer>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState(SEED_DEALS);
  const [investors, setInvestors] = useState(SEED_INVESTORS);
  const [notifs, setNotifs] = useState(SEED_NOTIFS);
  const [detailDeal, setDetailDeal] = useState(null);
  const [sbOpen, setSbOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [editModal, setEditModal] = useState(null);
  const [savedBriefs, setSavedBriefs] = useState([]);

  useEffect(() => {
    (async () => {
      const [u, d, inv, onboarded, sb] = await Promise.all([db.get("dg_user"), db.get("dg_deals"), db.get("dg_investors"), db.get("dg_onboarded"), db.get("dg_saved_briefs")]);
      if (u) { setUser(u); setScreen(onboarded ? "app" : "onboarding"); }
      if (d && d.length) setDeals(d);
      if (inv && inv.length) setInvestors(inv);
      if (sb) setSavedBriefs(sb);
    })();
  }, []);

  const toggleSaveBrief = useCallback(async (dealId) => {
    setSavedBriefs(prev => {
      const next = prev.includes(dealId) ? prev.filter(x => x !== dealId) : [...prev, dealId];
      db.set("dg_saved_briefs", next);
      return next;
    });
  }, []);

  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(s => !s); }
      if (e.key === "Escape") { setSearchOpen(false); setNotifOpen(false); setDetailDeal(null); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const showToast = useCallback((msg, type = "success") => {
    const id = Date.now(); setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const saveDeal = async d => {
    const exists = deals.find(x => x.id === d.id);
    const next = exists ? deals.map(x => x.id === d.id ? d : x) : [d, ...deals];
    setDeals(next); await db.set("dg_deals", next);
    showToast(exists ? `${d.company} updated` : `${d.company} added`, "success"); setEditModal(null); setDetailDeal(null);
  };
  const deleteDeal = async id => {
    const d = deals.find(x => x.id === id);
    const next = deals.filter(x => x.id !== id); setDeals(next); await db.set("dg_deals", next);
    showToast(`${d?.company} deleted`, "warn"); setEditModal(null); setDetailDeal(null);
  };

  const unread = notifs.filter(n => !n.read).length;
  const NAV = [
    { sec: "Core", items: [{ id: "dashboard", label: "Dashboard", icon: "dash" }, { id: "deals", label: "Pipeline", icon: "deals", chip: deals.filter(d => d.score >= 70).length, chipCls: "ch-g" }, { id: "briefing", label: "AI Briefings", icon: "ai", chip: savedBriefs.length > 0 ? savedBriefs.length : "AI", chipCls: "ch-b" }, { id: "signals", label: "Signal Feed", icon: "comm" }] },
    { sec: "Network", items: [{ id: "investors", label: "Investors", icon: "inv" }, { id: "analytics", label: "Analytics", icon: "chart" }] },
    { sec: "Account", items: [{ id: "settings", label: "Settings", icon: "set" }] },
  ];
  const pageTitle = { dashboard: "Dashboard", deals: "Pipeline", briefing: "AI Briefings", signals: "Signal Feed", investors: "Investors", analytics: "Analytics", settings: "Settings" };

  if (screen === "landing") return (<><style>{CSS}</style><Landing go={setScreen}/></>);
  if (screen === "auth") return (<><style>{CSS}</style><Auth go={s => setScreen(s)} setUser={setUser}/></>);
  if (screen === "frappe") return (<><style>{CSS}</style><FrappeConnect go={s => setScreen(s)} showToast={showToast}/></>);
  if (screen === "onboarding") return (<><style>{CSS}</style><Onboarding go={() => setScreen("app")}/></>);

 const shared = { go: setScreen, deals, setDeals, investors, showToast, user, setUser, goPage: setPage, setDetailDeal, toasts, toggleSaveBrief };
    switch (page) {
      case "dashboard": return <Dashboard {...shared}/>;
      case "deals": return <Pipeline {...shared}/>;
      case "briefing": return <Briefing {...shared} savedBriefs={[]}/>;
      case "signals": return <SignalFeed {...shared}/>;
      case "investors": return <Investors {...shared}/>;
      case "analytics": return <Analytics {...shared}/>;
      case "settings": return <Settings {...shared}/>;
      default: return <Dashboard {...shared}/>;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        {sbOpen && <div className="mob-overlay" onClick={() => setSbOpen(false)}/>}
        <aside className={`sidebar${sbOpen ? " mob-open" : ""}`}>
          <div className="sb-logo" onClick={() => setScreen("landing")}>
            <div className="sb-logo-row"><div className="sb-icon">DG</div><span className="sb-name">DealGauge</span></div>
          </div>
          <nav className="sb-nav">
            {NAV.map(sec => (
              <div key={sec.sec} className="sb-sec">
                <div className="sb-lbl">{sec.sec}</div>
                {sec.items.map(it => (
                  <div key={it.id} className={`sb-item${page === it.id ? " active" : ""}`} onClick={() => { setPage(it.id); setSbOpen(false); }}>
                    {I[it.icon]}{it.label}
                    {it.chip !== undefined && <span className={`sb-chip ${it.chipCls}`}>{it.chip}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="sb-footer">
            <div className="sb-user" onClick={() => { setPage("settings"); setSbOpen(false); }}>
              <div className="ava" style={{ width: 29, height: 29, fontSize: 11, background: "linear-gradient(135deg,#3B7BFF,#A78BFA)" }}>{user?.avatar || "JT"}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div className="sb-uname">{user?.name || "Jordan Taylor"}</div><div className="sb-plan">Growth plan</div></div>
              {I.dots}
            </div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <button className="icon-btn" onClick={() => setSbOpen(s => !s)}>{I.menu}</button>
            <div className="tb-brand">DealGauge {I.arr} <strong>{pageTitle[page] || page}</strong></div>
            <div className="search-trigger" onClick={() => setSearchOpen(true)}>
              {I.search}<span className="search-trigger-txt">Search deals, companies…</span><span className="search-kbd">⌘K</span>
            </div>
            <div className="tb-right">
              <div className="ai-pill"><div className="ai-dot"/><span className="ai-pill-txt">AI Active</span></div>
              <div className="icon-btn" onClick={() => setNotifOpen(o => !o)} title="Notifications">{I.bell}{unread > 0 && <div className="ndot"/>}</div>
              <div className="ava" style={{ width: 30, height: 30, fontSize: 11, background: "linear-gradient(135deg,#3B7BFF,#A78BFA)", cursor: "pointer" }} onClick={() => setPage("settings")} title="Settings">{user?.avatar || "JT"}</div>
            </div>
          </header>
          <div style={{ flex: 1, overflow: "auto" }}>{renderPage()}</div>
        </main>

        {/* Overlays */}
        {notifOpen && (<>
          <div style={{ position: "fixed", inset: 0, zIndex: 149 }} onClick={() => setNotifOpen(false)}/>
          <NotifDrawer notifs={notifs} onClose={() => setNotifOpen(false)} onMarkAll={() => setNotifs(n => n.map(x => ({ ...x, read: true })))} onMark={id => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))}/>
        </>)}

        {searchOpen && <div className="overlay"><SearchModal deals={deals} investors={investors} onClose={() => setSearchOpen(false)} goPage={p => { setPage(p); setSearchOpen(false); }}/></div>}

        {detailDeal && <DealDetailModal deal={detailDeal} onClose={() => setDetailDeal(null)} showToast={showToast} onEdit={d => { setEditModal(d); setDetailDeal(null); }} savedBriefs={savedBriefs} toggleSaveBrief={toggleSaveBrief}/>}

        {editModal && <DealModal deal={editModal} onClose={() => setEditModal(null)} onSave={saveDeal} onDelete={deleteDeal}/>}

        <AIAssistant deals={deals} open={aiOpen} setOpen={setAiOpen}/>

        <div className="toast-wrap">
          {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === "success" ? "✓" : t.type === "info" ? "✦" : t.type === "warn" ? "⚠" : "✕"} {t.msg}</div>)}
        </div>
      </div>
    </>
  );
}
