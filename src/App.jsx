import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const PROXY_URL = "/api/sheet";

async function fetchSheet(sheet) {
  const res = await fetch(`${PROXY_URL}?sheet=${sheet}`);
  if (!res.ok) throw new Error(`Erro ao buscar ${sheet}: ${res.status}`);
  return res.json();
}


const C = {
  bg:"#F5F5F0", surface:"#FFFFFF", card:"#FFFFFF", border:"#E2E2DC",
  orange:"#FFA500", tart:"#FC4645", crayola:"#FE842B",
  green:"#16A34A", text:"#1A1A1A", dim:"#555", muted:"#999",
  headerBg:"#1A1A1A", headerText:"#FFFFFF",
};
const TIER_C = {"0":"#FFA500","1":"#FE842B","2":"#FC4645","3":"#A855F7","4":"#888","":"#CCC"};
const SEG_C  = ["#FFA500","#FE842B","#FC4645","#FFD166","#A855F7","#16A34A","#38BDF8","#FB7185"];
const T_ORD  = ["0","1","2","3","4",""];
const FONT   = "'Roboto', sans-serif";

const tl = t => (t!=null&&t!=="")?("T"+t):"—";
const fBRL = v => { const n=Math.round(Number(v)||0); if(n>=1000000) return "R$\u00a0"+(n/1000000).toFixed(1).replace(".",",")+"M"; if(n>=1000) return "R$\u00a0"+(n/1000).toFixed(0)+"K"; return "R$\u00a0"+n.toLocaleString("pt-BR"); };
const fPct = v => (Number(v)||0).toFixed(1)+"%";
const fNum = v => (Number(v)||0).toLocaleString("pt-BR");
const fAmt = v => { if(!v)return 0; return parseFloat(String(v).replace(/[R$\s]/g,"").replace(/\./g,"").replace(",","."))||0; };

function parseReal(v) {
  if (!v) return null;
  const s = String(v).trim();
  // Format M/D/YYYY (from CSV)
  const p = s.split("/");
  if (p.length===3) return new Date(+p[2], +p[0]-1, +p[1]);
  // Format "Fri Aug 29 2025 ..." (from Apps Script date serialization)
  const d = new Date(s);
  if (!isNaN(d)) return d;
  return null;
}
function fDate(v) {
  const d = parseReal(v);
  return d ? d.toLocaleDateString("pt-BR") : (v||"");
}
function norm(val,mn,mx) { return mx===mn?100:((val-mn)/(mx-mn))*100; }
function tSort(a,b){
  const ia=T_ORD.indexOf(a.tier_growth||""),ib=T_ORD.indexOf(b.tier_growth||"");
  return (ia<0?99:ia)-(ib<0?99:ib);
}

const Trunc = ({s,n=26}) => { const t=s||"—"; return <span title={t}>{t.length>n?t.slice(0,n)+"…":t}</span>; };

// ─── DEMO DATA ──────────────────────────────────────────────────────────────
const DEMO_EMPRESAS = [
  {company_id:"1",name:"Nike Brasil",tier_growth:"0",setor_picklist:"Moda",status_da_empresa__cliente:"true",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT;2025-10 EVENTO CERIMONIA KAITAI"},
  {company_id:"2",name:"Arezzo & Co",tier_growth:"0",setor_picklist:"Moda",status_da_empresa__cliente:"true",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT;2025-03 EVENTO CRM MEET KOBE"},
  {company_id:"3",name:"Natura &Co",tier_growth:"1",setor_picklist:"Beleza",status_da_empresa__cliente:"true",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT"},
  {company_id:"4",name:"Magalu",tier_growth:"1",setor_picklist:"Varejo",status_da_empresa__cliente:"true",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT;2025-10 EVENTO CERIMONIA KAITAI"},
  {company_id:"5",name:"Via Varejo",tier_growth:"1",setor_picklist:"Varejo",status_da_empresa__cliente:"false",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT"},
  {company_id:"6",name:"Renner",tier_growth:"2",setor_picklist:"Moda",status_da_empresa__cliente:"false",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT"},
  {company_id:"7",name:"Riachuelo",tier_growth:"2",setor_picklist:"Moda",status_da_empresa__cliente:"false",eventos__picklist_de_presenca:"2025-10 EVENTO CERIMONIA KAITAI"},
  {company_id:"8",name:"Centauro",tier_growth:"2",setor_picklist:"Esportes",status_da_empresa__cliente:"true",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT"},
  {company_id:"9",name:"Netshoes",tier_growth:"3",setor_picklist:"Esportes",status_da_empresa__cliente:"false",eventos__picklist_de_presenca:"2025-10 EVENTO CERIMONIA KAITAI"},
  {company_id:"10",name:"Hering",tier_growth:"3",setor_picklist:"Moda",status_da_empresa__cliente:"false",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT"},
  {company_id:"11",name:"Grupo Soma",tier_growth:"1",setor_picklist:"Moda",status_da_empresa__cliente:"true",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT;2025-03 EVENTO CRM MEET KOBE"},
  {company_id:"12",name:"Dafiti",tier_growth:"2",setor_picklist:"Moda",status_da_empresa__cliente:"false",eventos__picklist_de_presenca:"2025-08 EVENTO VAREJO SUMMIT"},
];

const DEMO_DEALS = [
  {deal_id:"d1",company_id:"1",dealname:"Nike | Giftback | New Logo",amount:"45000",pipeline:"pip1",dealstage:"st1",data_real:"9/15/2025",lista_origem_picklist:"2025-08 EVENTO VAREJO SUMMIT",createdate:"7/1/2025"},
  {deal_id:"d2",company_id:"2",dealname:"Arezzo | CRMBonus | Expansão",amount:"32000",pipeline:"pip1",dealstage:"st2",data_real:"10/3/2025",lista_origem_picklist:"2025-08 EVENTO VAREJO SUMMIT",createdate:"8/5/2025"},
  {deal_id:"d3",company_id:"3",dealname:"Natura | Vale Bonus | New L...",amount:"28000",pipeline:"pip2",dealstage:"st1",data_real:"9/22/2025",lista_origem_picklist:"2025-08 EVENTO VAREJO SUMMIT",createdate:"8/12/2025"},
  {deal_id:"d4",company_id:"4",dealname:"Magalu | Giftback | Renovação",amount:"67000",pipeline:"pip1",dealstage:"st3",data_real:"10/10/2025",lista_origem_picklist:"2025-08 EVENTO VAREJO SUMMIT",createdate:"7/20/2025"},
  {deal_id:"d5",company_id:"5",dealname:"Via Varejo | CRMBonus | Up",amount:"18000",pipeline:"pip2",dealstage:"st2",data_real:"11/5/2025",lista_origem_picklist:"",createdate:"8/1/2025"},
  {deal_id:"d6",company_id:"6",dealname:"Renner | Loyalty | Piloto",amount:"12000",pipeline:"pip1",dealstage:"st1",data_real:"10/18/2025",lista_origem_picklist:"",createdate:"9/1/2025"},
  {deal_id:"d7",company_id:"11",dealname:"Grupo Soma | Giftback | Escala",amount:"55000",pipeline:"pip1",dealstage:"st2",data_real:"9/8/2025",lista_origem_picklist:"2025-08 EVENTO VAREJO SUMMIT",createdate:"7/15/2025"},
  {deal_id:"d8",company_id:"7",dealname:"Riachuelo | CRM | New Logo",amount:"22000",pipeline:"pip2",dealstage:"st1",data_real:"11/20/2025",lista_origem_picklist:"2025-10 EVENTO CERIMONIA KAITAI",createdate:"9/5/2025"},
  {deal_id:"d9",company_id:"9",dealname:"Netshoes | Giftback | Teste",amount:"8500",pipeline:"pip1",dealstage:"st3",data_real:"12/1/2025",lista_origem_picklist:"2025-10 EVENTO CERIMONIA KAITAI",createdate:"10/1/2025"},
];

const DEMO_CONTATOS = [
  {contact_id:"c1",company_id:"1",firstname:"João",lastname:"Silva",email:"joao@nike.com.br",jobtitle:"Diretor Comercial",eventos__convidado:"2025-08 EVENTO VAREJO SUMMIT",eventos__participou:"2025-08 EVENTO VAREJO SUMMIT"},
  {contact_id:"c2",company_id:"1",firstname:"Ana",lastname:"Costa",email:"ana@nike.com.br",jobtitle:"Gerente de Marketing",eventos__convidado:"2025-08 EVENTO VAREJO SUMMIT",eventos__participou:"2025-08 EVENTO VAREJO SUMMIT"},
  {contact_id:"c3",company_id:"2",firstname:"Pedro",lastname:"Mendes",email:"pedro@arezzo.com.br",jobtitle:"VP Comercial",eventos__convidado:"2025-08 EVENTO VAREJO SUMMIT",eventos__participou:"2025-08 EVENTO VAREJO SUMMIT"},
  {contact_id:"c4",company_id:"3",firstname:"Carla",lastname:"Andrade",email:"carla@natura.net",jobtitle:"Head de CRM",eventos__convidado:"2025-08 EVENTO VAREJO SUMMIT",eventos__participou:""},
  {contact_id:"c5",company_id:"4",firstname:"Roberto",lastname:"Lima",email:"roberto@magalu.com",jobtitle:"Diretor de Fidelidade",eventos__convidado:"2025-08 EVENTO VAREJO SUMMIT",eventos__participou:"2025-08 EVENTO VAREJO SUMMIT"},
  {contact_id:"c6",company_id:"7",firstname:"Marina",lastname:"Rocha",email:"marina@riachuelo.com.br",jobtitle:"Gerente Comercial",eventos__convidado:"2025-10 EVENTO CERIMONIA KAITAI",eventos__participou:"2025-10 EVENTO CERIMONIA KAITAI"},
  {contact_id:"c7",company_id:"11",firstname:"Lucas",lastname:"Ferreira",email:"lucas@gruposoma.com",jobtitle:"CEO",eventos__convidado:"2025-08 EVENTO VAREJO SUMMIT",eventos__participou:"2025-08 EVENTO VAREJO SUMMIT"},
];

const DEMO_CUSTOS = [
  {evento:"2025-08 EVENTO VAREJO SUMMIT", custo:"85000"},
  {evento:"2025-10 EVENTO CERIMONIA KAITAI", custo:"42000"},
  {evento:"2025-03 EVENTO CRM MEET KOBE", custo:"15000"},
];

const DEMO_DEPARA = [
  {pipeline_id:"pip1",pipeline_name:"Giftback"},
  {pipeline_id:"pip2",pipeline_name:"CRMBonus"},
  {pipeline_stage:"st1",stage_name:"SQL"},
  {pipeline_stage:"st2",stage_name:"SAL"},
  {pipeline_stage:"st3",stage_name:"Proposta Enviada"},
];


export default function App() {
  const [rawEmpresas, setRawEmpresas] = useState([]);
  const [rawDeals, setRawDeals] = useState([]);
  const [rawContatos, setRawContatos] = useState([]);
  const [rawCustos, setRawCustos] = useState([]);
  const [rawTarget, setRawTarget] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);

  const [rawTargetContatos, setRawTargetContatos] = useState([]);
  const [expandedCli, setExpandedCli] = useState(null);
  const [expandedPro, setExpandedPro] = useState(null);
  const [dpMap, setDpMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Carregando...");
  const [loadErr, setLoadErr] = useState("");
  const [selEvs, setSelEvs] = useState([]);
  const [authed, setAuthed]             = useState(()=>!!sessionStorage.getItem("eh_user"));
  const [loginEmail, setLoginEmail]     = useState("");
  const [loginPass, setLoginPass]       = useState("");
  const [loginErr, setLoginErr]         = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [demoMode, setDemoMode] = useState(false);





  const ref = useRef(null);

  useEffect(()=>{
    (async()=>{
      try {
        setLoadMsg("Carregando empresas...");
        const emp = await fetchSheet("empresas");
        setRawEmpresas(emp);
        setLoadMsg("Carregando deals...");
        const deals = await fetchSheet("deals");
        setRawDeals(deals);
        setLoadMsg("Carregando de-para...");
        const dp = await fetchSheet("de_para");
        setLoadMsg("Carregando contatos...");
        try {
          const contatos = await fetchSheet("contatos");
          setRawContatos(Array.isArray(contatos) ? contatos : []);
        } catch(e) {
          setRawContatos([]);
        }
        try {
          const custos = await fetchSheet("custos");
          setRawCustos(Array.isArray(custos) ? custos : []);
        } catch(e) {
          setRawCustos([]);
        }
        try {
          const target = await fetchSheet("target");
          setRawTarget(Array.isArray(target) ? target : []);
        } catch(e) {
          setRawTarget([]);
        }
        try {
          const clientes = await fetchSheet("clientes");
          setRawClientes(Array.isArray(clientes) ? clientes : []);
        } catch(e) { setRawClientes([]); }

        try {
          const tc = await fetchSheet("target_contatos");
          setRawTargetContatos(Array.isArray(tc) ? tc : []);
        } catch(e) { setRawTargetContatos([]); }
        const m={};
        dp.forEach(r=>{
          if(r.pipeline_stage&&r.stage_name) m[r.pipeline_stage]=r.stage_name;
          if(r.pipeline_id&&r.pipeline_name) m[r.pipeline_id]=r.pipeline_name;
        });
        setDpMap(m);
        setLoading(false);
      } catch(e) {
        setLoadErr(e.message);
        setLoading(false);
      }
    })();
  },[]);

  useEffect(()=>{
    const h=e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const loadDemo = () => {
    setRawEmpresas(DEMO_EMPRESAS);
    setRawDeals(DEMO_DEALS);
    setRawContatos(DEMO_CONTATOS);
    setRawCustos(DEMO_CUSTOS);
    const m={};
    DEMO_DEPARA.forEach(r=>{
      if(r.pipeline_stage&&r.stage_name) m[r.pipeline_stage]=r.stage_name;
      if(r.pipeline_id&&r.pipeline_name) m[r.pipeline_id]=r.pipeline_name;
    });
    setDpMap(m);
    setDemoMode(true);
    setLoading(false);
  };



  const dp = useCallback(v=>(!v?"":dpMap[v]||v), [dpMap]);

  const allEvs = useMemo(()=>{
    const s=new Set();
    rawEmpresas.forEach(r=>(r.eventos__picklist_de_presenca||"").split(";").forEach(e=>{const t=e.trim();if(t)s.add(t);}));
    return [...s].sort();
  },[rawEmpresas]);

  const win = useMemo(()=>{
    const ws=selEvs.map(ev=>{
      const m=ev.match(/^(\d{4})-(\d{2})/); if(!m)return null;
      const y=+m[1],mo=+m[2];
      const s=new Date(y,mo-1,1), e=new Date(y,mo,0); e.setDate(e.getDate()+90);
      return {s,e};
    }).filter(Boolean);
    if(!ws.length)return null;
    return {s:new Date(Math.min(...ws.map(w=>w.s))), e:new Date(Math.max(...ws.map(w=>w.e)))};
  },[selEvs]);

  const emps = useMemo(()=>{
    if(!selEvs.length)return [];
    const seen=new Map();
    rawEmpresas.forEach(r=>{
      const evs=(r.eventos__picklist_de_presenca||"").split(";").map(e=>e.trim());
      if(!selEvs.some(se=>evs.includes(se)))return;
      const id=r.company_id; if(!id||seen.has(id))return;
      seen.set(id,r);
    });
    return [...seen.values()];
  },[selEvs]);

  const empIds = useMemo(()=>new Set(emps.map(r=>r.company_id)),[emps]);

  // Map company_id -> tier_growth for deal tier lookup
  const empTierMap = useMemo(()=>{
    const m={};
    rawEmpresas.forEach(r=>{ if(r.company_id) m[r.company_id]=r.tier_growth||""; });
    return m;
  },[rawEmpresas]);

  // Map company_id -> contatos que foram ao(s) evento(s) selecionado(s)
  const contatosPorEmpresa = useMemo(()=>{
    if(!selEvs.length) return {};
    const m={};
    rawContatos.forEach(r=>{
      const evConf = (r.eventos__participou||"").split(";").map(e=>e.trim());
      const evConv = (r.eventos__convidado||"").split(";").map(e=>e.trim());
      const relevant = selEvs.some(se => evConf.includes(se) || evConv.includes(se));
      if(!relevant) return;
      if(!r.company_id) return;
      if(!m[r.company_id]) m[r.company_id]=[];
      m[r.company_id].push(r);
    });
    return m;
  },[rawContatos, selEvs]);

  // Map company_id -> todos os eventos que a empresa participou
  const historicoEmpresa = useMemo(()=>{
    const m={};
    rawEmpresas.forEach(r=>{
      if(!r.company_id) return;
      const evs=(r.eventos__picklist_de_presenca||"").split(";").map(e=>e.trim()).filter(Boolean);
      m[r.company_id]=evs;
    });
    return m;
  },[rawEmpresas]);

  // Map evento -> custo
  const custoMap = useMemo(()=>{
    const m={};
    rawCustos.forEach(r=>{ if(r.evento) m[r.evento.trim()]=fAmt(r.custo); });
    return m;
  },[rawCustos]);

  // Projeção de receita: MRR × meses restantes até dez + MRR × 12 × 50% (ano 2)
  function calcProjecao(deal) {
    const mrr = fAmt(deal.amount);
    if(!mrr) return 0;
    const created = parseReal(deal.createdate);
    if(!created) return 0;
    const fechamento = new Date(created.getTime() + 120*24*60*60*1000);
    const hoje = new Date();
    const refDate = fechamento > hoje ? fechamento : hoje;
    const dezembro = new Date(refDate.getFullYear(), 11, 31);
    const mesesRestantes = Math.max(0, Math.round((dezembro - refDate) / (30.44*24*60*60*1000)));
    const ano1 = mrr * mesesRestantes;
    const ano2 = mrr * 12 * 0.5;
    return ano1 + ano2;
  }

  const dealsInf = useMemo(()=>{
    if(!selEvs.length||!win)return [];
    const seen=new Map();
    rawDeals.forEach(r=>{
      // Must be from a participating company
      if(!empIds.has(r.company_id))return;
      // Must be within the event window
      const d=parseReal(r.data_real); if(!d||d<win.s||d>win.e)return;
      // Must NOT be origem direta of any selected event
      const ori=(r.lista_origem_picklist||"").split(";").map(e=>e.trim());
      if(selEvs.some(se=>ori.includes(se)))return;
      if(!r.deal_id||seen.has(r.deal_id))return;
      seen.set(r.deal_id,r);
    });
    return [...seen.values()];
  },[selEvs, empIds, win]);

  const dealsDir = useMemo(()=>{
    if(!selEvs.length)return [];
    const seen=new Map();
    rawDeals.forEach(r=>{
      const ori=(r.lista_origem_picklist||"").split(";").map(e=>e.trim());
      if(!selEvs.some(se=>ori.includes(se)))return;
      if(!r.deal_id||seen.has(r.deal_id))return;
      seen.set(r.deal_id,r);
    });
    return [...seen.values()];
  },[selEvs]);

  const kpE = useMemo(()=>{
    const tot=emps.length;
    const cli=emps.filter(r=>r.status_da_empresa__cliente?.toLowerCase()==="true").length;
    const t01=emps.filter(r=>r.tier_growth==="0"||r.tier_growth==="1").length;
    const byT={},byS={};
    emps.forEach(r=>{
      const t=r.tier_growth||"?"; byT[t]=(byT[t]||0)+1;
      const s=r.setor_picklist||"Outros"; byS[s]=(byS[s]||0)+1;
    });
    return {tot,cli,pros:tot-cli,t01,pT:tot?(t01/tot)*100:0,byT,byS};
  },[emps]);

  const kpD = useMemo(()=>{
    const ri=dealsInf.reduce((s,r)=>s+fAmt(r.amount),0);
    const rd=dealsDir.reduce((s,r)=>s+fAmt(r.amount),0);
    const custoTotal=selEvs.reduce((s,ev)=>s+(custoMap[ev]||0),0);
    const roi=custoTotal>0?rd/custoTotal:null;
    const cac=dealsDir.length>0&&custoTotal>0?custoTotal/dealsDir.length:null;
    const projecao=dealsDir.reduce((s,r)=>s+calcProjecao(r),0);
    return {ni:dealsInf.length,ri,ti:dealsInf.length?ri/dealsInf.length:0,
            nd:dealsDir.length,rd,td:dealsDir.length?rd/dealsDir.length:0,
            custoTotal,roi,cac,projecao};
  },[dealsInf,dealsDir,selEvs,custoMap]);

  const calcEv = useCallback(ev=>{
    const m=ev.match(/^(\d{4})-(\d{2})/);
    let win=null;
    if(m){const y=+m[1],mo=+m[2];const s=new Date(y,mo-1,1),e=new Date(y,mo,0);e.setDate(e.getDate()+90);win={s,e};}
    const seen=new Map();
    rawEmpresas.forEach(r=>{
      const evs=(r.eventos__picklist_de_presenca||"").split(";").map(e=>e.trim());
      if(!evs.includes(ev))return;
      if(!r.company_id||seen.has(r.company_id))return;
      seen.set(r.company_id,r);
    });
    const ep=[...seen.values()];
    const cs=new Set(ep.map(r=>r.company_id));
    const inf=win?rawDeals.filter(r=>{
      if(!cs.has(r.company_id))return false;
      const d=parseReal(r.data_real); if(!d||d<win.s||d>win.e)return false;
      // Exclude deals that are origem direta of this event
      const ori=(r.lista_origem_picklist||"").split(";").map(e=>e.trim());
      if(ori.includes(ev))return false;
      return true;
    }).filter((r,i,a)=>a.findIndex(x=>x.deal_id===r.deal_id)===i):[];
    const dir=rawDeals.filter(r=>{
      const o=(r.lista_origem_picklist||"").split(";").map(e=>e.trim());
      return o.includes(ev);
    }).filter((r,i,a)=>a.findIndex(x=>x.deal_id===r.deal_id)===i);
    const t01=ep.filter(r=>r.tier_growth==="0"||r.tier_growth==="1").length;
    const rd=dir.reduce((s,r)=>s+fAmt(r.amount),0);
    const ri=inf.reduce((s,r)=>s+fAmt(r.amount),0);
    return {nEmp:ep.length,nInf:inf.length,ri,nDir:dir.length,rd,
            tInf:inf.length?ri/inf.length:0,tDir:dir.length?rd/dir.length:0,
            pT:ep.length?(t01/ep.length)*100:0};
  },[rawEmpresas,rawDeals]);

  const perEv = useMemo(()=>{
    if(selEvs.length<2)return {};
    const r={};selEvs.forEach(ev=>{r[ev]=calcEv(ev);});
    const ks=Object.keys(r);
    const getRng=fn=>{const vs=ks.map(k=>fn(r[k]));return[Math.min(...vs),Math.max(...vs)];};
    const [mnRd,mxRd]=getRng(d=>d.rd),[mnPt,mxPt]=getRng(d=>d.pT);
    const [mnRi,mxRi]=getRng(d=>d.ri),[mnNi,mxNi]=getRng(d=>d.nInf);
    ks.forEach(k=>{
      const rdN=norm(r[k].rd,mnRd,mxRd),ptN=norm(r[k].pT,mnPt,mxPt);
      const riN=norm(r[k].ri,mnRi,mxRi),niN=norm(r[k].nInf,mnNi,mxNi);
      r[k].score=Math.round(0.4*rdN+0.4*ptN+0.1*riN+0.1*niN);
      r[k].sc={rd:Math.round(rdN),pt:Math.round(ptN),ri:Math.round(riN),ni:Math.round(niN)};
    });
    return r;
  },[selEvs,calcEv]);

  const single = useMemo(()=>{
    if(selEvs.length!==1)return null;
    const ev=calcEv(selEvs[0]);
    const all=allEvs.map(calcEv);
    const getRng=fn=>{const vs=all.map(fn);return[Math.min(...vs),Math.max(...vs)];};
    const [mnRd,mxRd]=getRng(d=>d.rd),[mnPt,mxPt]=getRng(d=>d.pT);
    const [mnRi,mxRi]=getRng(d=>d.ri),[mnNi,mxNi]=getRng(d=>d.nInf);
    const rdN=norm(ev.rd,mnRd,mxRd),ptN=norm(ev.pT,mnPt,mxPt);
    const riN=norm(ev.ri,mnRi,mxRi),niN=norm(ev.nInf,mnNi,mxNi);
    return {score:Math.round(0.4*rdN+0.4*ptN+0.1*riN+0.1*niN),
            rd:Math.round(rdN),pt:Math.round(ptN),ri:Math.round(riN),ni:Math.round(niN)};
  },[selEvs,calcEv,allEvs]);

  const filtEvs = useMemo(()=>allEvs.filter(e=>!q||e.toLowerCase().includes(q.toLowerCase())),[allEvs,q]);
  const tog = ev=>setSelEvs(p=>p.includes(ev)?p.filter(x=>x!==ev):[...p,ev]);
  const t10i = useMemo(()=>[...dealsInf].sort((a,b)=>fAmt(b.amount)-fAmt(a.amount)).slice(0,10),[dealsInf]);
  const t10d = useMemo(()=>[...dealsDir].sort((a,b)=>fAmt(b.amount)-fAmt(a.amount)).slice(0,10),[dealsDir]);
  const profT = useMemo(()=>[...emps].sort(tSort),[emps]);

  const tt = {background:"#1C1C1C",border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,color:C.text};
  const tierD = Object.entries(kpE.byT).map(([n,v])=>({n,v})).sort((a,b)=>(T_ORD.indexOf(a.n)<0?99:T_ORD.indexOf(a.n))-(T_ORD.indexOf(b.n)<0?99:T_ORD.indexOf(b.n)));
  const segD  = Object.entries(kpE.byS).map(([n,v])=>({n,v})).sort((a,b)=>b.v-a.v).slice(0,8);
  const donD  = [{name:"Prospects",value:kpE.pros,color:C.orange},{name:"Clientes",value:kpE.cli,color:C.green}].filter(d=>d.value>0);

  // ─── SHARED STYLES ──────────────────────────────────────────────────────────
  const hdr  = {background:C.headerBg,borderBottom:`3px solid ${C.orange}`,position:"sticky",top:0,zIndex:100};
  const card = {background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"};
  const th   = {padding:"8px 12px",fontSize:10,letterSpacing:0.8,color:"#888",borderBottom:`1px solid ${C.border}`,background:"#FAFAF8",textTransform:"uppercase",whiteSpace:"nowrap"};
  const td   = {padding:"8px 12px",fontSize:12,borderBottom:`1px solid ${C.border}`,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
  const kLbl = {fontSize:10,color:"#999",letterSpacing:0.8,textTransform:"uppercase",marginBottom:4};
  const sTit = {fontSize:10,color:"#999",letterSpacing:0.8,textTransform:"uppercase",marginBottom:8};

  const TB = ({row,rank,showProj}) => {
    const t=empTierMap[row.company_id]||row.tier_growth||"";
    const tb={background:`${TIER_C[t]||"#EEE"}30`,color:TIER_C[t]||"#999",borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${TIER_C[t]||"#DDD"}`,display:"inline-block"};
    const proj=showProj?calcProjecao(row):null;
    return (
      <tr style={{background:rank%2===0?"rgba(0,0,0,0.02)":"transparent"}}>
        <td style={{...td,width:24,color:"#CCC",fontSize:11,textAlign:"right",flexShrink:0}}>{rank}</td>
        <td style={{...td,color:C.text,minWidth:0,maxWidth:"none"}} title={row.dealname}>{row.dealname||"—"}</td>
        <td style={{...td,width:40,flexShrink:0}}><span style={tb}>{tl(t)}</span></td>
        <td style={{...td,color:C.green,fontWeight:600,width:96,flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{fBRL(fAmt(row.amount))}</td>
        {showProj&&<td style={{...td,color:C.orange,fontWeight:600,width:110,flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{fBRL(proj)}</td>}
        <td style={{...td,width:96,flexShrink:0}}><Trunc s={dp(row.pipeline)} n={13}/></td>
        <td style={{...td,width:96,flexShrink:0}}><Trunc s={dp(row.dealstage)} n={13}/></td>
        <td style={{...td,width:82,color:"#AAA",fontSize:11,flexShrink:0}}>{fDate(row.data_real)}</td>
      </tr>
    );
  };

  const handleLogin = async () => {
    setLoginLoading(true); setLoginErr("");
    try {
      const res = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email:loginEmail, password:loginPass}) });
      const data = await res.json();
      if (data.ok) { sessionStorage.setItem("eh_user", loginEmail); setAuthed(true); }
      else setLoginErr(data.error||"Credenciais inválidas");
    } catch(e) { setLoginErr("Erro de conexão"); }
    setLoginLoading(false);
  };

  const handleLogout = () => { sessionStorage.removeItem("eh_user"); setAuthed(false); };

  const Tab1 = ()=>(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:16}}>
        {[
          {l:"TOTAL EMPRESAS",v:fNum(kpE.tot),c:C.orange},
          {l:"PROSPECTS",     v:fNum(kpE.pros),c:C.crayola},
          {l:"CLIENTES",      v:fNum(kpE.cli), c:C.green},
          {l:"% T0 + T1",     v:fPct(kpE.pT),  c:C.tart, sub:`${kpE.t01} empresas`},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderLeft:`3px solid ${k.c}`,padding:"12px 14px"}}>
            <div style={kLbl}>{k.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.c,lineHeight:1.2,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
            {k.sub&&<div style={{fontSize:10,color:"#444",marginTop:2}}>{k.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 200px",gap:8,marginBottom:16}}>
        <div style={card}>
          <div style={sTit}>EMPRESAS POR TIER</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={tierD} margin={{left:-22,right:4}}>
              <XAxis dataKey="n" tickFormatter={v=>"T"+v} tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#333",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={tt} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
              <Bar dataKey="v" radius={[3,3,0,0]}>{tierD.map((e,i)=><Cell key={i} fill={TIER_C[e.n]||"#444"}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={sTit}>EMPRESAS POR SEGMENTO</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={segD} margin={{left:-10,right:4}}>
              <XAxis dataKey="n" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#CCC",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={tt} cursor={{fill:"rgba(0,0,0,0.04)"}}/>
              <Bar dataKey="v" radius={[3,3,0,0]}>{segD.map((_,i)=><Cell key={i} fill={SEG_C[i%SEG_C.length]}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={sTit}>PROSPECT vs CLIENTE</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={donD} cx="50%" cy="44%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={3}>
                {donD.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={tt}/>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:C.dim}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={sTit}>PERFIL DAS EMPRESAS <span style={{color:"#333",fontWeight:400,letterSpacing:0}}>— clique para ver contatos e histórico</span></div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={{...th,textAlign:"left",width:24}}></th>
            <th style={{...th,textAlign:"left"}}>EMPRESA</th>
            <th style={{...th,textAlign:"left",width:52}}>TIER</th>
            <th style={{...th,textAlign:"left"}}>SEGMENTO</th>
            <th style={{...th,textAlign:"left",width:80}}>STATUS</th>
          </tr></thead>
          <tbody>
            {profT.map((r,i)=>{
              const t=r.tier_growth||"";
              const tb={background:`${TIER_C[t]||"#333"}18`,color:TIER_C[t]||"#555",borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${TIER_C[t]||"#333"}30`,display:"inline-block"};
              const isExp = expandedEmp===r.company_id;
              const contatos = contatosPorEmpresa[r.company_id]||[];
              const historico = historicoEmpresa[r.company_id]||[];
              return (
                <>
                  <tr key={i}
                    onClick={()=>setExpandedEmp(isExp?null:r.company_id)}
                    style={{background:isExp?"rgba(255,165,0,0.05)":i%2===0?"rgba(255,255,255,0.015)":"transparent",cursor:"pointer",transition:"background 0.15s"}}>
                    <td style={{...td,width:24,color:"#444",fontSize:10,textAlign:"center"}}>{isExp?"▼":"▶"}</td>
                    <td style={{...td,color:C.text,fontWeight:isExp?500:400}}><Trunc s={r.name} n={30}/></td>
                    <td style={td}><span style={tb}>{tl(t)}</span></td>
                    <td style={td}><Trunc s={r.setor_picklist||"—"} n={20}/></td>
                    <td style={{...td,color:r.status_da_empresa__cliente?.toLowerCase()==="true"?C.green:C.dim}}>{r.status_da_empresa__cliente?.toLowerCase()==="true"?"Cliente":"Prospect"}</td>
                  </tr>
                  {isExp&&(
                    <tr key={`exp-${i}`}>
                      <td colSpan={5} style={{padding:0,background:"#FAFAF8",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

                          {/* CONTATOS */}
                          <div>
                            <div style={{fontSize:9,color:C.orange,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:600}}>
                              👤 Contatos no evento {contatos.length>0?`(${contatos.length})`:""}
                            </div>
                            {contatos.length===0?(
                              <div style={{fontSize:11,color:"#333",fontStyle:"italic"}}>Nenhum contato registrado para este(s) evento(s)</div>
                            ):(
                              <table style={{width:"100%",borderCollapse:"collapse"}}>
                                <thead><tr>
                                  <th style={{...th,fontSize:8,padding:"4px 8px",background:"transparent"}}>NOME</th>
                                  <th style={{...th,fontSize:8,padding:"4px 8px",background:"transparent"}}>CARGO</th>
                                  <th style={{...th,fontSize:8,padding:"4px 8px",background:"transparent",width:60}}>STATUS</th>
                                </tr></thead>
                                <tbody>
                                  {contatos.map((c,ci)=>{
                                    const nome = [c.firstname,c.lastname].filter(Boolean).join(" ")||"—";
                                    const participou = c.eventos__participou?.split(";").map(e=>e.trim()).some(e=>selEvs.includes(e));
                                    return (
                                      <tr key={ci}>
                                        <td style={{...td,fontSize:11,padding:"4px 8px",color:C.text,borderBottom:`1px solid #1A1A1A`}}>{nome}</td>
                                        <td style={{...td,fontSize:10,padding:"4px 8px",borderBottom:`1px solid #1A1A1A`}}><Trunc s={c.jobtitle||"—"} n={22}/></td>
                                        <td style={{...td,fontSize:9,padding:"4px 8px",borderBottom:`1px solid #1A1A1A`,width:60}}>
                                          <span style={{background:participou?"rgba(34,197,94,0.1)":"rgba(255,165,0,0.1)",color:participou?C.green:C.orange,borderRadius:3,padding:"1px 5px",fontSize:8,fontWeight:600}}>
                                            {participou?"✓ Foi":"Convidado"}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>

                          {/* HISTÓRICO */}
                          <div>
                            <div style={{fontSize:9,color:C.crayola,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:600}}>
                              📅 Histórico de eventos ({historico.length})
                            </div>
                            {historico.length===0?(
                              <div style={{fontSize:11,color:"#333",fontStyle:"italic"}}>Sem histórico</div>
                            ):(
                              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                {historico.sort().reverse().map((ev,ei)=>{
                                  const isSelected = selEvs.includes(ev);
                                  return (
                                    <div key={ei} style={{fontSize:11,color:isSelected?C.orange:C.dim,display:"flex",alignItems:"center",gap:6}}>
                                      <span style={{width:6,height:6,borderRadius:"50%",background:isSelected?C.orange:"#333",flexShrink:0,display:"inline-block"}}/>
                                      {ev}
                                      {isSelected&&<span style={{fontSize:8,color:C.orange,fontWeight:700}}>← ATUAL</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {!profT.length&&<div style={{padding:"20px",textAlign:"center",color:"#333",fontSize:12}}>Nenhuma empresa</div>}
      </div>
    </div>
  );

  const Tab2 = ()=>(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:10,marginBottom:14,alignItems:"stretch"}}>
        {/* Score Ball */}
        <div style={{...card,padding:"16px 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:110,borderTop:`3px solid ${C.orange}`}}>
          <div style={{fontSize:9,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>SCORE</div>
          <div style={{width:72,height:72,borderRadius:"50%",border:`3px solid ${C.orange}`,display:"flex",alignItems:"center",justifyContent:"center",background:`rgba(255,165,0,0.05)`}}>
            <span style={{fontSize:26,fontWeight:700,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{single?single.score:"—"}</span>
          </div>
          <div style={{fontSize:9,color:C.muted,marginTop:6}}>/100</div>
        </div>
        {/* Big KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[
            {l:"RECEITA DIRETA",    v:fBRL(kpD.rd), c:C.orange},
            {l:"NEGÓCIOS DIRETOS",  v:fNum(kpD.nd), c:C.orange},
            {l:"RECEITA INFLUENC.", v:fBRL(kpD.ri), c:C.crayola},
            {l:"NEGÓCIOS INFLUENC.",v:fNum(kpD.ni), c:C.crayola},
          ].map((k,i)=>(
            <div key={i} style={{...card,borderLeft:`3px solid ${k.c}`,padding:"8px 12px",display:"flex",flexDirection:"column",justifyContent:"center",minHeight:0}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:k.c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"CUSTO DO EVENTO",   v:kpD.custoTotal?fBRL(kpD.custoTotal):"Sem custo", c:"#6366F1"},
          {l:"ROI",               v:kpD.roi!=null?kpD.roi.toFixed(2)+"x":"—",        c:kpD.roi>=1?C.green:C.tart, sub:"Receita Dir. / Custo"},
          {l:"CAC",               v:kpD.cac!=null?fBRL(kpD.cac):"—",                c:C.orange,  sub:"Custo / Qtd Negócios Dir."},
          {l:"PROJEÇÃO RECEITA",  v:fBRL(kpD.projecao),                              c:"#8B5CF6", sub:"MRR × meses restantes + ano 2"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderLeft:`3px solid ${k.c}`,padding:"12px 14px"}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.c,fontVariantNumeric:"tabular-nums",lineHeight:1.1}}>{k.v}</div>
            {k.sub&&<div style={{fontSize:9,color:C.muted,marginTop:4}}>{k.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[
          {c:C.orange, title:"ORIGEM DIRETA",  tot:kpD.nd,rec:kpD.rd,tkt:kpD.td},
          {c:C.crayola,title:"INFLUENCIADOS",  tot:kpD.ni,rec:kpD.ri,tkt:kpD.ti},
        ].map((b,i)=>(
          <div key={i} style={{...card,borderTop:`2px solid ${b.c}`}}>
            <div style={{fontSize:10,color:b.c,letterSpacing:0.8,marginBottom:12,textTransform:"uppercase",fontWeight:600}}>{b.title}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,color:C.dim}}>Total Negócios</span>
              <span style={{fontSize:16,fontWeight:700,color:b.c,fontVariantNumeric:"tabular-nums"}}>{fNum(b.tot)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,color:C.dim}}>Receita Total</span>
              <span style={{fontSize:14,fontWeight:700,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fBRL(b.rec)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:C.dim}}>Ticket Médio</span>
              <span style={{fontSize:13,fontWeight:500,color:C.text,fontVariantNumeric:"tabular-nums"}}>{fBRL(b.tkt)}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[{title:"TOP 10 — ORIGEM DIRETA",data:t10d,showProj:true},{title:"TOP 10 — INFLUENCIADOS",data:t10i,showProj:false}].map(({title,data,showProj},ti)=>(
          <div key={ti}>
            <div style={sTit}>{title}</div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={{...th,textAlign:"right",width:24}}>#</th>
                  <th style={{...th,textAlign:"left"}}>DEAL</th>
                  <th style={{...th,textAlign:"left",width:36}}>T</th>
                  <th style={{...th,textAlign:"left",width:80}}>MRR</th>
                  {showProj&&<th style={{...th,textAlign:"left",width:90}}>PROJEÇÃO</th>}
                  <th style={{...th,textAlign:"left",width:72}}>FASE</th>
                  <th style={{...th,textAlign:"left",width:74}}>DATA</th>
                </tr></thead>
                <tbody>{data.map((row,i)=><TB key={i} row={row} rank={i+1} showProj={showProj}/>)}</tbody>
              </table>
              {!data.length&&<div style={{padding:"18px",textAlign:"center",color:C.muted,fontSize:12}}>Nenhum negócio encontrado</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const EVENTOS_2026 = useMemo(()=>
    allEvs.filter(e=>e.startsWith("2026-")).sort()
  ,[allEvs]);

  const META_PCT = 0.6;
  const META_EVENTOS = 3;

  const TierBadge = ({t}) => {
    const tc = TIER_C[t]||"#CCC";
    return <span style={{background:`${tc}25`,color:tc,borderRadius:3,padding:"1px 7px",fontSize:9,fontWeight:700,border:`1px solid ${tc}`,display:"inline-block"}}>{tl(t)}</span>;
  };

  const statusCliente = ev2026 => {
    const n = ev2026.length;
    if(n>=META_EVENTOS) return {label:"✅ Meta atingida", color:C.green, bg:"rgba(22,163,74,0.08)"};
    if(n>0) return {label:`🟡 ${n}/${META_EVENTOS} eventos`, color:"#EAB308", bg:"rgba(234,179,8,0.08)"};
    return {label:"⚪ Nenhum evento", color:C.muted, bg:"rgba(0,0,0,0.03)"};
  };

  // ─── TAB CLIENTES ─────────────────────────────────────────────────────────
  const TabClientes = () => {
    const totalCli = rawClientes.length;
    const clientesComEvs = rawClientes.map(r=>{
      const empresa = rawEmpresas.find(e=>e.company_id===r.company_id)||{};
      const evs = (empresa.eventos__picklist_de_presenca||"").split(";").map(e=>e.trim()).filter(Boolean);
      const evs2026 = evs.filter(e=>e.startsWith("2026-"));
      const contatos = rawTargetContatos.filter(c=>c.company_id===r.company_id);
      const dealsEmp = rawDeals.filter(d=>d.company_id===r.company_id);
      const receita = dealsEmp.reduce((s,d)=>s+fAmt(d.amount),0);
      return {...r, evs2026, contatos, receita};
    }).sort((a,b)=>{
      const ta=parseInt(a.tier_growth)||9, tb=parseInt(b.tier_growth)||9;
      if(ta!==tb) return ta-tb;
      return b.receita-a.receita;
    });

    const atingiram = clientesComEvs.filter(c=>c.evs2026.length>=META_EVENTOS).length;
    const metaQtd = Math.ceil(totalCli*META_PCT);
    const progresso = totalCli>0?atingiram/totalCli:0;
    const faltamContas = Math.max(0, metaQtd-atingiram);

    const rankEvs = EVENTOS_2026
      .map(ev=>({ev, qtd:clientesComEvs.filter(c=>c.evs2026.includes(ev)).length}))
      .sort((a,b)=>b.qtd-a.qtd);
    const rankColors = [C.orange, C.crayola, "#EAB308", C.muted, C.muted];

    return (
      <div>
        {/* META HEADER */}
        <div style={{...card,padding:"18px 22px",marginBottom:16,borderTop:`3px solid ${C.orange}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>Meta de Presença 2026</div>
              <div style={{fontSize:11,color:C.muted}}>60% das contas alvo devem ir a pelo menos 3 eventos em 2026</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:28,fontWeight:700,color:progresso>=META_PCT?C.green:C.orange,fontVariantNumeric:"tabular-nums"}}>{Math.round(progresso*100)}%</div>
              <div style={{fontSize:11,color:C.muted}}>{atingiram} de {metaQtd} contas necessárias</div>
            </div>
          </div>
          <div style={{background:C.border,borderRadius:100,height:10,overflow:"hidden",marginBottom:8}}>
            <div style={{width:`${Math.min(progresso/META_PCT*100,100)}%`,height:"100%",background:progresso>=META_PCT?C.green:C.orange,borderRadius:100,transition:"width 0.4s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:14}}>
            <span>{atingiram} contas com 3+ eventos ✓</span>
            {faltamContas>0&&<span style={{color:C.tart}}>Faltam {faltamContas} contas para bater a meta</span>}
            {faltamContas===0&&<span style={{color:C.green,fontWeight:600}}>🎉 Meta atingida!</span>}
            <span>Meta: {metaQtd} contas ({Math.round(META_PCT*100)}%)</span>
          </div>
          {/* Ranking eventos */}
          <div style={{fontSize:9,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8}}>Ranking de presença por evento</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {rankEvs.map(({ev,qtd},i)=>(
              <div key={i} style={{flex:1,minWidth:140,background:"#FAFAF8",border:`1px solid ${C.border}`,borderTop:`3px solid ${rankColors[i]||C.muted}`,borderRadius:6,padding:"10px 12px"}}>
                <div style={{fontSize:9,color:C.muted,marginBottom:4,fontWeight:700}}>#{i+1}</div>
                <div style={{fontSize:11,color:C.text,fontWeight:600,marginBottom:6,lineHeight:1.3}}>{ev.replace(/^\d{4}-\d{2} /,"")}</div>
                <div style={{fontSize:20,fontWeight:700,color:rankColors[i]||C.muted,fontVariantNumeric:"tabular-nums"}}>{qtd}</div>
                <div style={{fontSize:9,color:C.muted}}>contas presentes</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={{...th,width:28}}></th>
              <th style={th}>CONTA</th>
              <th style={{...th,width:44}}>TIER</th>
              <th style={{...th,width:100}}>SEGMENTO</th>
              <th style={{...th,width:100}}>RECEITA</th>
              <th style={{...th,width:160}}>PROGRESSO 2026</th>
              <th style={{...th,width:160}}>STATUS</th>
            </tr></thead>
            <tbody>
              {clientesComEvs.map((c,i)=>{
                const st = statusCliente(c.evs2026);
                const isExp = expandedCli===c.company_id;
                return (
                  <React.Fragment key={i}>
                    <tr onClick={()=>setExpandedCli(isExp?null:c.company_id)}
                      style={{cursor:"pointer",background:isExp?"rgba(255,165,0,0.03)":i%2===0?"rgba(0,0,0,0.015)":"transparent"}}>
                      <td style={{...td,textAlign:"center",color:"#CCC",fontSize:10}}>{isExp?"▼":"▶"}</td>
                      <td style={{...td,color:C.text,fontWeight:500}}>{c.name||"—"}</td>
                      <td style={td}><TierBadge t={c.tier_growth||""}/></td>
                      <td style={{...td,fontSize:11}}>{c.setor_picklist||"—"}</td>
                      <td style={{...td,color:C.green,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fBRL(c.receita)}</td>
                      <td style={td}>
                        <div style={{display:"flex",gap:3,alignItems:"center"}}>
                          {[0,1,2].map(idx=>(
                            <div key={idx} style={{width:28,height:6,borderRadius:100,background:c.evs2026.length>idx?C.orange:C.border}}/>
                          ))}
                          <span style={{fontSize:10,color:C.muted,marginLeft:4}}>{c.evs2026.length}/3</span>
                        </div>
                      </td>
                      <td style={td}><span style={{background:st.bg,color:st.color,borderRadius:4,padding:"3px 8px",fontSize:10,fontWeight:600}}>{st.label}</span></td>
                    </tr>
                    {isExp&&(
                      <tr>
                        <td colSpan={7} style={{padding:0,background:"#FAFAF8",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                            <div>
                              <div style={{fontSize:9,color:C.orange,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>👤 Contatos Mapeados ({c.contatos.length})</div>
                              {c.contatos.length===0?<div style={{fontSize:11,color:C.muted}}>Nenhum contato cadastrado</div>:(
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  {c.contatos.map((ct,ci)=>{
                                    const foiEvs = (ct.eventos__participou||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-"));
                                    return (
                                      <div key={ci} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px"}}>
                                        <div style={{fontSize:12,fontWeight:600,color:C.text}}>{[ct.firstname,ct.lastname].filter(Boolean).join(" ")||"—"}</div>
                                        <div style={{fontSize:10,color:C.muted}}>{ct.jobtitle||""} {ct.email?"· "+ct.email:""}</div>
                                        {foiEvs.length>0&&(
                                          <div style={{marginTop:5,display:"flex",gap:4,flexWrap:"wrap"}}>
                                            {foiEvs.map((ev,ei)=>(
                                              <span key={ei} style={{background:"rgba(255,165,0,0.1)",color:C.orange,fontSize:9,padding:"1px 6px",borderRadius:3,border:"1px solid rgba(255,165,0,0.3)"}}>
                                                ✓ {ev.replace(/^\d{4}-\d{2} /,"")}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{fontSize:9,color:C.crayola,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>📅 Eventos 2026</div>
                              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                {EVENTOS_2026.map((ev,ei)=>{
                                  const foi = c.evs2026.includes(ev);
                                  return (
                                    <div key={ei} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:5,background:foi?"rgba(22,163,74,0.06)":"rgba(0,0,0,0.02)",border:`1px solid ${foi?"rgba(22,163,74,0.2)":C.border}`}}>
                                      <span style={{fontSize:14}}>{foi?"✅":"⬜"}</span>
                                      <span style={{fontSize:11,color:foi?C.green:C.muted}}>{ev}</span>
                                    </div>
                                  );
                                })}
                                {EVENTOS_2026.length===0&&<div style={{fontSize:11,color:C.muted}}>Nenhum evento de 2026 encontrado</div>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {!rawClientes.length&&<div style={{padding:"24px",textAlign:"center",color:C.muted,fontSize:12}}>Nenhum cliente na aba "clientes"</div>}
        </div>
      </div>
    );
  };

  // ─── TAB PROSPECTS ────────────────────────────────────────────────────────
  const TabProspects = () => {
    const prospectsComEvs = rawTarget.map(r=>{
      const convites2026 = rawTargetContatos
        .filter(c=>c.company_id===r.company_id)
        .flatMap(c=>(c.eventos__convidado||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-")));
      const participou2026 = rawTargetContatos
        .filter(c=>c.company_id===r.company_id)
        .flatMap(c=>(c.eventos__participou||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-")));
      const contatos = rawTargetContatos.filter(c=>c.company_id===r.company_id);
      const convUniq = [...new Set(convites2026)];
      const partUniq = [...new Set(participou2026)];
      return {...r, convites2026:convUniq, participou2026:partUniq, contatos};
    }).sort((a,b)=>{
      const ta=parseInt(a.tier_growth)||9, tb=parseInt(b.tier_growth)||9;
      return ta-tb;
    });

    const jaFoi = prospectsComEvs.filter(p=>p.participou2026.length>0).length;
    const convidado = prospectsComEvs.filter(p=>p.convites2026.length>0&&p.participou2026.length===0).length;
    const semContato = prospectsComEvs.filter(p=>p.convites2026.length===0).length;

    return (
      <div>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {[
            {l:"PROSPECTS MAPEADOS", v:prospectsComEvs.length, c:"#6366F1", sub:"contas alvo"},
            {l:"JÁ PARTICIPARAM",    v:jaFoi,    c:C.green,  sub:"de algum evento 2026"},
            {l:"CONVIDADOS",         v:convidado, c:C.orange, sub:"aguardando participação"},
            {l:"NÃO CONTATADOS",    v:semContato,c:C.muted,  sub:"sem convite ainda"},
          ].map((k,i)=>(
            <div key={i} style={{...card,borderLeft:`3px solid ${k.c}`,padding:"12px 16px"}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>{k.l}</div>
              <div style={{fontSize:24,fontWeight:700,color:k.c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{k.v}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* TABELA */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={{...th,width:28}}></th>
              <th style={{...th,width:28,textAlign:"right"}}>#</th>
              <th style={th}>EMPRESA</th>
              <th style={{...th,width:44}}>TIER</th>
              <th style={{...th,width:110}}>SEGMENTO</th>
              <th style={{...th,width:80}}>LOJAS</th>
              <th style={{...th,width:110}}>PLATAFORMA</th>
              <th style={{...th,width:150}}>STATUS</th>
            </tr></thead>
            <tbody>
              {prospectsComEvs.map((p,i)=>{
                const isExp = expandedPro===p.company_id;
                const status = p.participou2026.length>0
                  ? {label:"✅ Já participou", color:C.green, bg:"rgba(22,163,74,0.08)"}
                  : p.convites2026.length>0
                  ? {label:"📨 Convidado", color:C.orange, bg:"rgba(255,165,0,0.08)"}
                  : {label:"⚪ Não contatado", color:C.muted, bg:"rgba(0,0,0,0.03)"};
                return (
                  <React.Fragment key={i}>
                    <tr onClick={()=>setExpandedPro(isExp?null:p.company_id)}
                      style={{cursor:"pointer",background:isExp?"rgba(99,102,241,0.03)":i%2===0?"rgba(0,0,0,0.015)":"transparent"}}>
                      <td style={{...td,textAlign:"center",color:"#CCC",fontSize:10}}>{isExp?"▼":"▶"}</td>
                      <td style={{...td,textAlign:"right",color:"#CCC",fontSize:11}}>{i+1}</td>
                      <td style={{...td,color:C.text,fontWeight:500}}>{p.name||"—"}</td>
                      <td style={td}><TierBadge t={p.tier_growth||""}/></td>
                      <td style={{...td,fontSize:11}}>{p.setor_picklist||"—"}</td>
                      <td style={{...td,fontSize:11}}>{p.total_lojas==="0"||!p.total_lojas?"Online":p.total_lojas}</td>
                      <td style={{...td,fontSize:11}}>{p.plataforma_ecommerce||"—"}</td>
                      <td style={td}><span style={{background:status.bg,color:status.color,borderRadius:4,padding:"3px 8px",fontSize:10,fontWeight:600}}>{status.label}</span></td>
                    </tr>
                    {isExp&&(
                      <tr>
                        <td colSpan={8} style={{padding:0,background:"#FAFAF8",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                            <div>
                              <div style={{fontSize:9,color:"#6366F1",letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>👤 Contatos Mapeados ({p.contatos.length})</div>
                              {p.contatos.length===0?<div style={{fontSize:11,color:C.muted}}>Nenhum contato cadastrado</div>:(
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  {p.contatos.map((ct,ci)=>{
                                    const foiEvs = (ct.eventos__participou||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-"));
                                    return (
                                      <div key={ci} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                        <div>
                                          <div style={{fontSize:12,fontWeight:600,color:C.text}}>{[ct.firstname,ct.lastname].filter(Boolean).join(" ")||"—"}</div>
                                          <div style={{fontSize:10,color:C.muted}}>{ct.jobtitle||""} {ct.email?"· "+ct.email:""}</div>
                                        </div>
                                        <span style={{background:foiEvs.length>0?"rgba(22,163,74,0.1)":"rgba(0,0,0,0.04)",color:foiEvs.length>0?C.green:C.muted,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:600,border:`1px solid ${foiEvs.length>0?"rgba(22,163,74,0.2)":C.border}`,flexShrink:0}}>
                                          {foiEvs.length>0?"✓ Foi a evento":"Não foi"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{fontSize:9,color:C.orange,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>📅 Histórico de Convites 2026</div>
                              {p.convites2026.length===0&&p.participou2026.length===0
                                ? <div style={{fontSize:11,color:C.muted,padding:"8px 0"}}>Nenhum convite feito ainda em 2026</div>
                                : EVENTOS_2026.map((ev,ei)=>{
                                    const conv = p.convites2026.includes(ev);
                                    const foi = p.participou2026.includes(ev);
                                    if(!conv&&!foi) return null;
                                    return (
                                      <div key={ei} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:5,marginBottom:4,background:foi?"rgba(22,163,74,0.06)":"rgba(255,165,0,0.04)",border:`1px solid ${foi?"rgba(22,163,74,0.2)":"rgba(255,165,0,0.2)"}`}}>
                                        <span style={{fontSize:12}}>{foi?"✅":"📨"}</span>
                                        <div style={{flex:1}}>
                                          <div style={{fontSize:11,color:foi?C.green:C.orange}}>{ev}</div>
                                          <div style={{fontSize:9,color:C.muted}}>{foi?"Participou":"Convidado — não foi"}</div>
                                        </div>
                                      </div>
                                    );
                                  })
                              }
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {!rawTarget.length&&<div style={{padding:"24px",textAlign:"center",color:C.muted,fontSize:12}}>Nenhum prospect na aba "target"</div>}
        </div>
      </div>
    );
  };


  // ─── TAB INSIGHTS ─────────────────────────────────────────────────────────
  const ALERTAS_INS = {
    acionar:   { emoji:"🔥", label:"Acionar Agora",   color:"#EF4444", bg:"rgba(239,68,68,0.06)",  border:"rgba(239,68,68,0.18)"  },
    quente:    { emoji:"🌱", label:"Prospect Quente", color:"#16A34A", bg:"rgba(22,163,74,0.06)",  border:"rgba(22,163,74,0.18)"  },
    churn:     { emoji:"⚠️", label:"Risco de Churn",  color:"#EAB308", bg:"rgba(234,179,8,0.06)",  border:"rgba(234,179,8,0.18)"  },
    morno:     { emoji:"💛", label:"Morno",           color:"#F97316", bg:"rgba(249,115,22,0.06)", border:"rgba(249,115,22,0.18)" },
    monitorar: { emoji:"👀", label:"Monitorar",       color:"#6366F1", bg:"rgba(99,102,241,0.06)", border:"rgba(99,102,241,0.18)" },
    inativo:   { emoji:"💤", label:"Inativo",         color:"#999",    bg:"rgba(0,0,0,0.03)",      border:"rgba(0,0,0,0.09)"      },
  };
  const ORDEM_INS = ["acionar","quente","churn","morno","monitorar","inativo"];

  const [insSelec, setInsSelec]       = useState(null);
  const [insExpanded, setInsExpanded] = useState(null);
  const [insFiltTiers, setInsFiltTiers] = useState([]);
  const [insFiltTipo, setInsFiltTipo]   = useState("todos");
  const [insFiltSegs, setInsFiltSegs]   = useState([]);
  const [insFiltAlerta, setInsFiltAlerta] = useState("todos");
  const [insSegOpen, setInsSegOpen]     = useState(false);
  const insSegRef = useRef(null);
  const insRowRefs = useRef({});

  const insClassificar = (e) => {
    const recusados = (e.convites2026||[]).filter(c=>!(e.participou2026||[]).includes(c)).length;
    const foia2026  = (e.participou2026||[]).length > 0;
    const tier01    = e.tier === "0" || e.tier === "1";
    if (tier01 && e.dealsAbertos > 0 && foia2026)
      return { tipo:"acionar",   texto:`${e.dealsAbertos} deal${e.dealsAbertos>1?"s":""} aberto${e.dealsAbertos>1?"s":""} e foi a ${e.participou2026.length} evento${e.participou2026.length>1?"s":""} em 2026 — momento ideal para avançar na negociação.` };
    if (tier01 && e.tipo==="prospect" && recusados >= 2 && !foia2026)
      return { tipo:"quente",    texto:`Prospect ${tl(e.tier)} convidado ${e.convites2026.length}x mas nunca participou. Alta prioridade — vale abordagem direta antes do próximo evento.` };
    if (e.tipo==="cliente" && recusados >= 3)
      return { tipo:"churn",     texto:`Recusou ${recusados} convite${recusados>1?"s":""} consecutivos sem participação em 2026. Sinal de distanciamento — acionar para entender o momento.` };
    if (e.tipo==="cliente" && foia2026 && e.dealsAbertos === 0)
      return { tipo:"morno",     texto:`Engajado com eventos (${e.participou2026.length} em 2026) mas sem deals em andamento. Oportunidade de expandir a conta.` };
    if (foia2026 && e.dealsAbertos === 0 && e.tipo==="prospect")
      return { tipo:"monitorar", texto:`Foi a ${e.participou2026.length} evento${e.participou2026.length>1?"s":""} em 2026 mas ainda sem negociação aberta. Nutrir e acompanhar.` };
    if ((e.convites2026||[]).length === 0 && (e.participou2026||[]).length === 0)
      return { tipo:"inativo",   texto:`Nenhum convite ou participação em 2026. Avaliar se ainda faz parte da estratégia de eventos do ano.` };
    return { tipo:"monitorar", texto:`Em acompanhamento. Continuar monitorando engajamento nos próximos eventos.` };
  };

  const insCalcPot = (e) => Math.min((4-(parseInt(e.tier_growth)||4))*20 + (e.dealsAbertos>0?15:0) + Math.min(e.receita/10000,5), 100);
  const insCalcEng = (e) => Math.min((e.participou2026||[]).length*25 + (e.convites2026||[]).length*8, 100);

  const TabInsights = () => {
    const insAllSegs = useMemo(()=>[...new Set([...rawClientes,...rawTarget].map(e=>e.setor_picklist).filter(Boolean))].sort(),[]);

    useEffect(()=>{
      const handler = e => { if(insSegRef.current&&!insSegRef.current.contains(e.target)) setInsSegOpen(false); };
      document.addEventListener('mousedown', handler);
      return ()=>document.removeEventListener('mousedown', handler);
    },[]);

    const todasEmpresas = useMemo(()=>{
      const cli = rawClientes.map(r=>{
        const empresa = rawEmpresas.find(e=>e.company_id===r.company_id)||{};
        const evs2026 = (empresa.eventos__picklist_de_presenca||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-"));
        const contatos = rawTargetContatos.filter(c=>c.company_id===r.company_id);
        const contatosConvites = rawTargetContatos.filter(c=>c.company_id===r.company_id);
        const convites2026 = [...new Set(contatosConvites.flatMap(c=>(c.eventos__convidado||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-"))))];
        const dealsEmp = rawDeals.filter(d=>d.company_id===r.company_id);
        const dealsAbertos = dealsEmp.filter(d=>d.dealstage&&!["closedwon","closedlost"].includes(d.dealstage)).length;
        const receita = dealsEmp.reduce((s,d)=>s+fAmt(d.amount),0);
        const contatosMap = contatos.map(ct=>({
          nome:[ct.firstname,ct.lastname].filter(Boolean).join(" ")||"—",
          cargo:ct.jobtitle||"",
          email:ct.email||"",
          foiEvs:(ct.eventos__participou||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-")),
        }));
        return { company_id:r.company_id, name:r.name, tier:r.tier_growth||"", setor:r.setor_picklist||"", tipo:"cliente", dealsAbertos, receita, convites2026, participou2026:evs2026, contatos:contatosMap };
      });
      const pro = rawTarget.map(r=>{
        const contatosConvites = rawTargetContatos.filter(c=>c.company_id===r.company_id);
        const convites2026 = [...new Set(contatosConvites.flatMap(c=>(c.eventos__convidado||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-"))))];
        const participou2026 = [...new Set(contatosConvites.flatMap(c=>(c.eventos__participou||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-"))))];
        const dealsEmp = rawDeals.filter(d=>d.company_id===r.company_id);
        const dealsAbertos = dealsEmp.filter(d=>d.dealstage&&!["closedwon","closedlost"].includes(d.dealstage)).length;
        const receita = dealsEmp.reduce((s,d)=>s+fAmt(d.amount),0);
        const contatosMap = contatosConvites.map(ct=>({
          nome:[ct.firstname,ct.lastname].filter(Boolean).join(" ")||"—",
          cargo:ct.jobtitle||"",
          email:ct.email||"",
          foiEvs:(ct.eventos__participou||"").split(";").map(e=>e.trim()).filter(e=>e.startsWith("2026-")),
        }));
        return { company_id:r.company_id, name:r.name, tier:r.tier_growth||"", setor:r.setor_picklist||"", tipo:"prospect", dealsAbertos, receita, convites2026, participou2026, contatos:contatosMap };
      });
      return [...cli,...pro].map(e=>({...e, alerta:insClassificar(e), potencial:insCalcPot(e), engajamento:insCalcEng(e)}));
    },[]);

    const togIT = t => setInsFiltTiers(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
    const togIS = s => setInsFiltSegs(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);

    const filtered = useMemo(()=>
      todasEmpresas
        .filter(e=>insFiltTiers.length===0||insFiltTiers.includes(e.tier))
        .filter(e=>insFiltTipo==="todos"||e.tipo===insFiltTipo)
        .filter(e=>insFiltSegs.length===0||insFiltSegs.includes(e.setor))
        .filter(e=>insFiltAlerta==="todos"||e.alerta.tipo===insFiltAlerta)
        .sort((a,b)=>ORDEM_INS.indexOf(a.alerta.tipo)-ORDEM_INS.indexOf(b.alerta.tipo))
    ,[todasEmpresas,insFiltTiers,insFiltTipo,insFiltSegs,insFiltAlerta]);

    const contadores = useMemo(()=>{
      const base = todasEmpresas.filter(e=>(insFiltTiers.length===0||insFiltTiers.includes(e.tier))&&(insFiltTipo==="todos"||e.tipo===insFiltTipo)&&(insFiltSegs.length===0||insFiltSegs.includes(e.setor)));
      const c={todos:base.length};
      ORDEM_INS.forEach(k=>{c[k]=base.filter(e=>e.alerta.tipo===k).length;});
      return c;
    },[todasEmpresas,insFiltTiers,insFiltTipo,insFiltSegs]);

    const filteredIds = new Set(filtered.map(e=>e.company_id));
    const QW=860,QH=440;

    const selectEmp = (id)=>{
      setInsSelec(p=>p===id?null:id);
      setInsExpanded(p=>p===id?null:id);
      setTimeout(()=>insRowRefs.current[id]?.scrollIntoView({behavior:"smooth",block:"center"}),80);
    };

    const TierBadgeIns = ({t})=>{ const tc=TIER_C[t]||"#CCC"; return <span style={{background:`${tc}22`,color:tc,borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${tc}`,display:"inline-block",flexShrink:0}}>{tl(t)}</span>; };

    return (
      <div>
        {/* FILTROS */}
        <div style={{...card,padding:"12px 18px",marginBottom:14,display:"flex",gap:18,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",flexShrink:0}}>Tier</span>
            <div style={{display:"flex",gap:4}}>
              {["0","1","2","3","4"].map(t=>{ const tc=TIER_C[t]; const ativo=insFiltTiers.includes(t); return <button key={t} onClick={()=>togIT(t)} style={{padding:"3px 9px",fontSize:11,borderRadius:4,border:`1px solid ${ativo?tc:C.border}`,background:ativo?`${tc}18`:"transparent",color:ativo?tc:C.dim,cursor:"pointer",fontFamily:FONT,fontWeight:ativo?700:400}}>T{t}</button>; })}
            </div>
          </div>
          <div style={{width:1,height:22,background:C.border}}/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",flexShrink:0}}>Tipo</span>
            <div style={{display:"flex",gap:4}}>
              {["todos","cliente","prospect"].map(t=>{ const ativo=insFiltTipo===t; return <button key={t} onClick={()=>setInsFiltTipo(t)} style={{padding:"3px 10px",fontSize:11,borderRadius:4,border:`1px solid ${ativo?C.orange:C.border}`,background:ativo?"rgba(255,165,0,0.08)":"transparent",color:ativo?C.orange:C.dim,cursor:"pointer",fontFamily:FONT,textTransform:"capitalize"}}>{t==="todos"?"Todos":t==="cliente"?"Clientes":"Prospects"}</button>; })}
            </div>
          </div>
          <div style={{width:1,height:22,background:C.border}}/>
          <div style={{display:"flex",alignItems:"center",gap:6}} ref={insSegRef}>
            <span style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",flexShrink:0}}>Segmento</span>
            <div style={{position:"relative"}}>
              <button onClick={()=>setInsSegOpen(o=>!o)} style={{padding:"4px 12px",fontSize:11,borderRadius:5,border:`1px solid ${insFiltSegs.length>0?C.orange:C.border}`,background:insFiltSegs.length>0?"rgba(255,165,0,0.08)":"transparent",color:insFiltSegs.length>0?C.orange:C.dim,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:6,minWidth:160}}>
                <span style={{flex:1,textAlign:"left"}}>{insFiltSegs.length===0?"Todos os segmentos":`${insFiltSegs.length} selecionado${insFiltSegs.length>1?"s":""}`}</span>
                <span style={{fontSize:9,color:C.muted}}>{insSegOpen?"▲":"▼"}</span>
              </button>
              {insSegOpen&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,width:220,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,zIndex:200,boxShadow:"0 8px 24px rgba(0,0,0,0.1)",overflow:"hidden"}}>
                  <div style={{padding:"6px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:9,color:C.muted,letterSpacing:0.8,textTransform:"uppercase"}}>Segmentos</span>
                    {insFiltSegs.length>0&&<button onClick={()=>setInsFiltSegs([])} style={{fontSize:9,color:C.muted,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>Limpar</button>}
                  </div>
                  <div style={{maxHeight:220,overflowY:"auto"}}>
                    {insAllSegs.map(s=>{ const ativo=insFiltSegs.includes(s); return <div key={s} onClick={()=>togIS(s)} style={{padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:ativo?"rgba(255,165,0,0.05)":"transparent",fontSize:12,color:ativo?C.orange:C.dim}}><span style={{width:13,height:13,borderRadius:3,border:`1.5px solid ${ativo?C.orange:C.border}`,background:ativo?C.orange:"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#000",fontSize:8,fontWeight:700}}>{ativo?"✓":""}</span>{s}</div>; })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {(insFiltTiers.length>0||insFiltTipo!=="todos"||insFiltSegs.length>0||insFiltAlerta!=="todos")&&(
            <button onClick={()=>{setInsFiltTiers([]);setInsFiltTipo("todos");setInsFiltSegs([]);setInsFiltAlerta("todos");}} style={{padding:"3px 10px",fontSize:10,borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>✕ Limpar</button>
          )}
        </div>

        {/* QUADRANTE */}
        <div style={{...card,padding:"20px 24px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase"}}>Mapa Estratégico de Contas</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {ORDEM_INS.map(k=>{ const a=ALERTAS_INS[k]; const ativo=insFiltAlerta===k; return <button key={k} onClick={()=>setInsFiltAlerta(ativo?"todos":k)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",fontSize:10,borderRadius:4,border:`1px solid ${ativo?a.color:C.border}`,background:ativo?a.bg:"transparent",color:ativo?a.color:C.dim,cursor:"pointer",fontFamily:FONT}}><span>{a.emoji}</span><span>{a.label}</span><b style={{color:ativo?a.color:C.muted}}>({contadores[k]||0})</b></button>; })}
            </div>
          </div>
          <div style={{position:"relative",width:QW,height:QH,margin:"0 auto"}}>
            <div style={{position:"absolute",left:0,top:0,width:"50%",height:"50%",background:"rgba(22,163,74,0.05)",borderRadius:"6px 0 0 0",border:"1px solid rgba(22,163,74,0.12)",padding:"8px 10px"}}><span style={{fontSize:9,color:"#16A34A",fontWeight:700}}>🌱 PROSPECT QUENTE</span></div>
            <div style={{position:"absolute",left:"50%",top:0,width:"50%",height:"50%",background:"rgba(239,68,68,0.05)",borderRadius:"0 6px 0 0",border:"1px solid rgba(239,68,68,0.12)",padding:"8px 10px",display:"flex",justifyContent:"flex-end"}}><span style={{fontSize:9,color:"#EF4444",fontWeight:700}}>🔥 ACIONAR AGORA</span></div>
            <div style={{position:"absolute",left:0,top:"50%",width:"50%",height:"50%",background:"rgba(0,0,0,0.02)",borderRadius:"0 0 0 6px",border:"1px solid rgba(0,0,0,0.06)",padding:"8px 10px",display:"flex",alignItems:"flex-end"}}><span style={{fontSize:9,color:"#999",fontWeight:700}}>💤 INATIVO / RISCO</span></div>
            <div style={{position:"absolute",left:"50%",top:"50%",width:"50%",height:"50%",background:"rgba(249,115,22,0.05)",borderRadius:"0 0 6px 0",border:"1px solid rgba(249,115,22,0.12)",padding:"8px 10px",display:"flex",alignItems:"flex-end",justifyContent:"flex-end"}}><span style={{fontSize:9,color:"#F97316",fontWeight:700}}>💛 MORNO</span></div>
            <div style={{position:"absolute",left:"50%",top:0,width:1,height:"100%",background:"rgba(0,0,0,0.1)",zIndex:1,pointerEvents:"none"}}/>
            <div style={{position:"absolute",left:0,top:"50%",width:"100%",height:1,background:"rgba(0,0,0,0.1)",zIndex:1,pointerEvents:"none"}}/>
            {todasEmpresas.map((e,i)=>{
              const x=(e.engajamento/100)*QW, y=QH-(e.potencial/100)*QH;
              const a=ALERTAS_INS[e.alerta.tipo]; const isSel=insSelec===e.company_id; const isDim=!filteredIds.has(e.company_id);
              return (
                <div key={i} onClick={()=>selectEmp(e.company_id)} style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-50%)",zIndex:isSel?12:isDim?1:3,cursor:"pointer",transition:"all 0.15s",opacity:isDim?0.15:1}}>
                  <div style={{width:isSel?24:18,height:isSel?24:18,borderRadius:"50%",background:a.color,border:"2px solid #FFF",boxShadow:isSel?`0 0 0 3px ${a.color},0 3px 10px rgba(0,0,0,0.2)`:"0 1px 4px rgba(0,0,0,0.18)",transition:"all 0.15s"}}/>
                  {isSel&&<div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:C.text,color:"#FFF",fontSize:10,padding:"4px 10px",borderRadius:5,whiteSpace:"nowrap",fontWeight:600,zIndex:20,boxShadow:"0 2px 10px rgba(0,0,0,0.25)"}}>{e.name}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:`5px solid ${C.text}`}}/></div>}
                </div>
              );
            })}
            <div style={{position:"absolute",bottom:-20,left:0,width:"100%",display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,pointerEvents:"none"}}>
              <span>← Baixo engajamento</span><span style={{fontWeight:600,color:C.dim}}>ENGAJAMENTO (eventos 2026)</span><span>Alto engajamento →</span>
            </div>
          </div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:28,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
            {ORDEM_INS.map(k=>{ const a=ALERTAS_INS[k]; return <div key={k} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:9,height:9,borderRadius:"50%",background:a.color,flexShrink:0}}/><span style={{fontSize:9,color:C.dim}}>{a.label} <b style={{color:a.color}}>({contadores[k]||0})</b></span></div>; })}
            <span style={{fontSize:9,color:C.muted,marginLeft:"auto"}}>Clique em um ponto para expandir</span>
          </div>
        </div>

        {/* LISTA */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{padding:"9px 16px",borderBottom:`1px solid ${C.border}`,background:"#FAFAF8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase"}}>{filtered.length} empresa{filtered.length!==1?"s":""}</span>
            <span style={{fontSize:10,color:C.muted}}>Clique para expandir insights e contatos</span>
          </div>
          {filtered.map((e,i)=>{
            const a=ALERTAS_INS[e.alerta.tipo]; const isExp=insExpanded===e.company_id; const isSel=insSelec===e.company_id;
            const recusados=e.convites2026.filter(c=>!e.participou2026.includes(c)).length;
            const contatosEng=e.contatos.filter(c=>c.foiEvs.length>0);
            const contatosAtiv=e.contatos.filter(c=>c.foiEvs.length===0);
            return (
              <div key={i} ref={el=>insRowRefs.current[e.company_id]=el}>
                <div onClick={()=>{setInsExpanded(isExp?null:e.company_id);setInsSelec(isExp?null:e.company_id);}}
                  style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",display:"grid",gridTemplateColumns:"28px 1fr 60px 100px 160px 120px 120px",alignItems:"center",gap:12,background:isExp?a.bg:"transparent",borderLeft:isExp?`3px solid ${a.color}`:"3px solid transparent",transition:"all 0.12s"}}>
                  <span style={{fontSize:11,color:"#CCC",textAlign:"center"}}>{isExp?"▼":"▶"}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,flexShrink:0}}>{a.emoji}</span><div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:10,color:C.muted}}>{e.setor}</div></div></div>
                  <TierBadgeIns t={e.tier}/>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,border:`1px solid ${e.tipo==="cliente"?"rgba(22,163,74,0.3)":"rgba(99,102,241,0.3)"}`,color:e.tipo==="cliente"?C.green:C.purple,background:e.tipo==="cliente"?"rgba(22,163,74,0.08)":"rgba(99,102,241,0.08)",textTransform:"uppercase",textAlign:"center"}}>{e.tipo}</span>
                  <span style={{fontSize:10,color:a.color,fontWeight:700,letterSpacing:0.4,textTransform:"uppercase"}}>{a.label}</span>
                  <div style={{display:"flex",gap:8,fontSize:9}}>{e.participou2026.length>0&&<span style={{color:C.green}}>✓ {e.participou2026.length} evento{e.participou2026.length>1?"s":""}</span>}{recusados>0&&<span style={{color:C.tart}}>✗ {recusados} recus.</span>}</div>
                  <div style={{fontSize:9,color:C.muted,textAlign:"right"}}>{e.dealsAbertos>0?<span style={{color:C.orange}}>💼 {e.dealsAbertos} deal{e.dealsAbertos>1?"s":""}</span>:e.convites2026.length===0?<span>Sem convites</span>:null}</div>
                </div>
                {isExp&&(
                  <div style={{padding:"16px 20px 20px 48px",borderBottom:`1px solid ${C.border}`,background:"#FAFAF8",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
                    <div>
                      <div style={{fontSize:9,color:a.color,letterSpacing:0.8,textTransform:"uppercase",fontWeight:700,marginBottom:8}}>💡 Insight</div>
                      <div style={{background:C.card,border:`1px solid ${a.border}`,borderLeft:`3px solid ${a.color}`,borderRadius:6,padding:"10px 14px"}}>
                        <div style={{fontSize:12,color:C.text,lineHeight:1.7,marginBottom:8}}>{e.alerta.texto}</div>
                        {e.participou2026.length>0&&<div style={{fontSize:10,color:C.green,marginBottom:3}}>✅ Participou: {e.participou2026.join(", ")}</div>}
                        {recusados>0&&<div style={{fontSize:10,color:C.tart,marginBottom:3}}>❌ Recusou: {e.convites2026.filter(c=>!e.participou2026.includes(c)).join(", ")}</div>}
                        {e.dealsAbertos>0&&<div style={{fontSize:10,color:C.orange}}>💼 {e.dealsAbertos} deal{e.dealsAbertos>1?"s":""} aberto{e.dealsAbertos>1?"s":""}</div>}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:9,color:C.green,letterSpacing:0.8,textTransform:"uppercase",fontWeight:700,marginBottom:8}}>👤 Contatos Engajados ({contatosEng.length})</div>
                      {contatosEng.length===0?<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>Nenhum contato foi a evento ainda</div>:contatosEng.map((ct,ci)=>(
                        <div key={ci} style={{background:C.card,border:"1px solid rgba(22,163,74,0.2)",borderRadius:6,padding:"8px 12px",marginBottom:6}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>{ct.nome}</div>
                          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{ct.cargo}{ct.email?" · "+ct.email:""}</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{ct.foiEvs.map((ev,ei)=><span key={ei} style={{background:"rgba(22,163,74,0.1)",color:C.green,fontSize:9,padding:"1px 6px",borderRadius:3,border:"1px solid rgba(22,163,74,0.25)"}}>✓ {ev}</span>)}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{fontSize:9,color:C.orange,letterSpacing:0.8,textTransform:"uppercase",fontWeight:700,marginBottom:8}}>🎯 Contatos a Ativar ({contatosAtiv.length})</div>
                      {contatosAtiv.length===0?<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>Todos os contatos já participaram</div>:contatosAtiv.map((ct,ci)=>(
                        <div key={ci} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",marginBottom:6}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>{ct.nome}</div>
                          <div style={{fontSize:10,color:C.muted}}>{ct.cargo}{ct.email?" · "+ct.email:""}</div>
                          <div style={{fontSize:9,color:C.orange,marginTop:4}}>→ Nunca foi a um evento — convidar no próximo</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length===0&&<div style={{padding:"48px 24px",textAlign:"center"}}><div style={{fontSize:28,marginBottom:8}}>🔍</div><div style={{fontSize:12,color:C.muted}}>Nenhuma empresa com os filtros selecionados</div></div>}
        </div>
      </div>
    );
  };


  if (loading) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{width:36,height:36,border:`2px solid ${C.border}`,borderTopColor:C.orange,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontSize:11,color:C.muted,letterSpacing:1.5}}>{loadMsg.toUpperCase()}</span>
      {loadErr&&<span style={{fontSize:12,color:C.tart,maxWidth:400,textAlign:"center"}}>{loadErr}</span>}
    </div>
  );

  if (!authed) return (
    <div style={{minHeight:"100vh",background:"#F5F5F0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans', sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={{background:"#FFF",borderRadius:12,padding:"40px 36px",width:360,boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:"1px solid #E2E2DC"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:28,justifyContent:"center"}}>
          <div style={{background:"#FFA500",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#000"}}>⚡</div>
          <span style={{fontWeight:700,fontSize:20,color:"#1A1A1A"}}>Event<span style={{color:"#FFA500"}}>Hub</span></span>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#999",letterSpacing:0.8,textTransform:"uppercase",display:"block",marginBottom:5}}>Email</label>
          <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} type="email" placeholder="seu@email.com"
            style={{width:"100%",padding:"9px 12px",border:"1px solid #E2E2DC",borderRadius:6,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:"#999",letterSpacing:0.8,textTransform:"uppercase",display:"block",marginBottom:5}}>Senha</label>
          <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            style={{width:"100%",padding:"9px 12px",border:"1px solid #E2E2DC",borderRadius:6,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        {loginErr&&<div style={{fontSize:12,color:"#FC4645",marginBottom:12,textAlign:"center"}}>{loginErr}</div>}
        <button onClick={handleLogin} disabled={loginLoading||!loginEmail||!loginPass}
          style={{width:"100%",background:(!loginEmail||!loginPass)?"#E2E2DC":"#FFA500",border:"none",borderRadius:6,padding:"10px",color:(!loginEmail||!loginPass)?"#999":"#000",fontSize:13,fontWeight:700,cursor:(!loginEmail||!loginPass||loginLoading)?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {loginLoading?"Entrando...":"Entrar"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,color:C.text,fontSize:13}}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={hdr}>
        <div style={{maxWidth:1440,margin:"0 auto",padding:"10px 22px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,fontWeight:700,fontSize:16,color:"#FFF"}}>
              <div style={{background:C.orange,borderRadius:5,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#000"}}>⚡</div>
              Event<span style={{color:C.orange}}>Hub</span>

            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:9,color:"#AAA",letterSpacing:2}}>ANÁLISE ESTRATÉGICA DE EVENTOS</span>
          <button onClick={handleLogout} style={{background:"transparent",border:"1px solid #444",borderRadius:5,padding:"4px 12px",color:"#AAA",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Sair</button>
        </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <div style={{position:"relative"}} ref={ref}>
              <div onClick={()=>setOpen(o=>!o)} style={{background:"#2A2A2A",border:"1px solid #444",borderRadius:6,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,minWidth:240,fontSize:12,color:"#EEE"}}>
                <span style={{flex:1,color:selEvs.length?"#EEE":"#777"}}>{selEvs.length?`${selEvs.length} evento${selEvs.length>1?"s":""} selecionado${selEvs.length>1?"s":""}`:  "Selecionar eventos..."}</span>
                <span style={{color:"#555",fontSize:9}}>{open?"▲":"▼"}</span>
              </div>
              {open&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,width:300,background:"#222",border:"1px solid #444",borderRadius:6,zIndex:300,maxHeight:240,overflowY:"auto",boxShadow:"0 12px 32px rgba(0,0,0,0.7)"}}>
                  <input style={{width:"100%",background:"#1A1A1A",border:"none",borderBottom:"1px solid #333",padding:"7px 12px",color:"#EEE",fontSize:12,outline:"none",boxSizing:"border-box"}} placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
                  {filtEvs.length===0&&<div style={{padding:"12px",textAlign:"center",color:"#555",fontSize:12}}>{allEvs.length===0?"Nenhum evento":"Nenhum resultado"}</div>}
                  {filtEvs.map(ev=>(
                    <div key={ev} onClick={()=>tog(ev)} style={{padding:"7px 12px",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:7,background:selEvs.includes(ev)?"rgba(255,165,0,0.07)":"transparent",color:selEvs.includes(ev)?C.orange:"#AAA"}}>
                      <span style={{width:12,height:12,borderRadius:2,border:`1.5px solid ${selEvs.includes(ev)?C.orange:"#444"}`,background:selEvs.includes(ev)?C.orange:"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#000",fontSize:8,fontWeight:700}}>
                        {selEvs.includes(ev)?"✓":""}
                      </span>
                      {ev}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selEvs.length>0&&<span style={{background:C.orange,color:"#000",borderRadius:20,padding:"1px 9px",fontSize:11,fontWeight:700}}>{selEvs.length}</span>}
            {selEvs.length>0&&<button onClick={()=>setSelEvs([])} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:5,padding:"5px 10px",color:"#CCC",cursor:"pointer",fontSize:11}}>Limpar</button>}

            {win&&<div style={{background:"rgba(255,165,0,0.06)",border:`1px solid rgba(255,165,0,0.15)`,borderRadius:5,padding:"5px 10px",fontSize:11,color:"#EEE",display:"flex",gap:5,alignItems:"center"}}><span>📅</span><span style={{color:"#AAA"}}><b style={{color:C.orange}}>Janela:</b> {win.s.toLocaleDateString("pt-BR")} → {win.e.toLocaleDateString("pt-BR")}</span></div>}
          </div>
        </div>
        <div style={{maxWidth:1440,margin:"0 auto",padding:"0 22px",display:"flex"}}>
          {["Event Dashboard","Performance Dashboard","👥 Clientes","🎯 Prospects","📊 Insights"].map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)}
              style={{padding:"10px 20px",cursor:"pointer",fontSize:12,fontWeight:tab===i?600:400,color:tab===i?C.orange:"#FFFFFF",borderBottom:tab===i?`2px solid ${C.orange}`:"2px solid transparent",background:"transparent",border:"none",fontFamily:FONT,transition:"color 0.15s",letterSpacing:0.3}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1440,margin:"0 auto",padding:"18px 22px 48px"}}>
        {tab!==2&&tab!==3&&tab!==4&&!selEvs.length?(
          <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>🎯</div>
            <div style={{fontSize:14,color:C.orange,fontWeight:600,marginBottom:6}}>Selecione um ou mais eventos para começar</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Use o seletor acima para escolher os eventos que deseja analisar</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>{allEvs.length} eventos · {rawEmpresas.length} empresas ativas · {rawTarget.length} empresas target · {rawDeals.length} deals</div>

          </div>
        ):(
          <>
            {tab===0&&<Tab1/>}
            {tab===1&&<Tab2/>}
            {tab===2&&<TabClientes/>}
            {tab===3&&<TabProspects/>}
            {tab===4&&<TabInsights/>}
          </>
        )}
      </div>
    </div>
  );
}
