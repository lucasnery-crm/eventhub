import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  const [dpMap, setDpMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Carregando...");
  const [loadErr, setLoadErr] = useState("");
  const [selEvs, setSelEvs] = useState([]);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [authed, setAuthed] = useState(()=>!!sessionStorage.getItem("eh_user"));
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [gNome, setGNome] = useState("");
  const [gObjetivo, setGObjetivo] = useState("");
  const [gSegmentos, setGSegmentos] = useState([]);
  const [gTiers, setGTiers] = useState([]);
  const [gStatus, setGStatus] = useState("ambos");
  const [gVagas, setGVagas] = useState("50");
  const [gTexto, setGTexto] = useState("");
  const [gLoading, setGLoading] = useState(false);
  const [gResultado, setGResultado] = useState(null);
  const [gErro, setGErro] = useState("");
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

  const handleLogin = async(e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErr("");
    try {
      const res = await fetch("/api/auth", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({email:loginEmail.trim(), password:loginPass})
      });
      const data = await res.json();
      if(data.ok) {
        sessionStorage.setItem("eh_user", data.email);
        setAuthed(true);
      } else {
        setLoginErr(data.error || "Erro ao autenticar");
      }
    } catch(err) {
      setLoginErr("Erro de conexão");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("eh_user");
    setAuthed(false);
    setLoginEmail("");
    setLoginPass("");
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

  const Tab3 = ()=>{
    if(selEvs.length<2) return (
      <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:10}}>📊</div>
        <div style={{fontSize:13,color:C.muted}}>Selecione 2 ou mais eventos para comparar.</div>
      </div>
    );
    const ranked=Object.entries(perEv).sort((a,b)=>b[1].score-a[1].score);
    const byRd=Object.entries(perEv).sort((a,b)=>b[1].rd-a[1].rd);
    const sc=s=>s>=70?C.green:s>=40?C.orange:C.tart;
    return (
      <div>
        <div style={sTit}>RANKING POR SCORE ESTRATÉGICO</div>
        <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
          <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
            <colgroup><col style={{width:24}}/><col/><col style={{width:104}}/><col style={{width:118}}/><col style={{width:64}}/><col style={{width:118}}/><col style={{width:82}}/></colgroup>
            <thead><tr>
              <th style={{...th,textAlign:"right"}}>#</th>
              <th style={{...th,textAlign:"left"}}>EVENTO</th>
              <th style={{...th,textAlign:"left"}}>SCORE</th>
              <th style={{...th,textAlign:"left"}}>RECEITA DIR.</th>
              <th style={{...th,textAlign:"left"}}>% T0+T1</th>
              <th style={{...th,textAlign:"left"}}>RECEITA INF.</th>
              <th style={{...th,textAlign:"left"}}>INF.</th>
            </tr></thead>
            <tbody>
              {ranked.map(([ev,d],i)=>(
                <tr key={ev} style={{background:i%2===0?"rgba(255,255,255,0.015)":"transparent"}}>
                  <td style={{...td,width:24,textAlign:"right",color:"#333",fontSize:11}}>{i+1}</td>
                  <td style={{...td,color:C.text}}><Trunc s={ev} n={32}/></td>
                  <td style={td}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{background:C.muted,borderRadius:100,height:3,width:48,overflow:"hidden",flexShrink:0}}>
                        <div style={{width:`${d.score}%`,height:"100%",background:sc(d.score),borderRadius:100}}/>
                      </div>
                      <span style={{fontWeight:700,color:sc(d.score),fontSize:13,fontVariantNumeric:"tabular-nums"}}>{d.score}</span>
                    </div>
                  </td>
                  <td style={{...td,color:C.green,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fBRL(d.rd)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fPct(d.pT)}</td>
                  <td style={{...td,color:C.crayola,fontVariantNumeric:"tabular-nums"}}>{fBRL(d.ri)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fNum(d.nInf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={sTit}>COMPARATIVO COMPLETO</div>
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
            <colgroup><col/><col style={{width:64}}/><col style={{width:80}}/><col style={{width:110}}/><col style={{width:52}}/><col style={{width:110}}/><col style={{width:96}}/><col style={{width:96}}/><col style={{width:58}}/></colgroup>
            <thead><tr>
              <th style={{...th,textAlign:"left"}}>EVENTO</th>
              <th style={{...th,textAlign:"left"}}>EMPS</th>
              <th style={{...th,textAlign:"left"}}>INFLUENC.</th>
              <th style={{...th,textAlign:"left"}}>REC. INF.</th>
              <th style={{...th,textAlign:"left"}}>DIR.</th>
              <th style={{...th,textAlign:"left"}}>REC. DIR.</th>
              <th style={{...th,textAlign:"left"}}>TKT INF.</th>
              <th style={{...th,textAlign:"left"}}>TKT DIR.</th>
              <th style={{...th,textAlign:"left"}}>%T0+T1</th>
            </tr></thead>
            <tbody>
              {byRd.map(([ev,d],i)=>(
                <tr key={ev} style={{background:i%2===0?"rgba(255,255,255,0.015)":"transparent"}}>
                  <td style={{...td,color:C.text}}><Trunc s={ev} n={28}/></td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fNum(d.nEmp)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fNum(d.nInf)}</td>
                  <td style={{...td,color:C.crayola,fontVariantNumeric:"tabular-nums"}}>{fBRL(d.ri)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fNum(d.nDir)}</td>
                  <td style={{...td,color:C.green,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fBRL(d.rd)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fBRL(d.tInf)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fBRL(d.tDir)}</td>
                  <td style={{...td,fontVariantNumeric:"tabular-nums"}}>{fPct(d.pT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const Tab4 = ()=>{
    const lq = searchQ.toLowerCase();
    const empResults = useMemo(()=>{
      if(!lq) return rawEmpresas.slice(0,50);
      return rawEmpresas.filter(r=>
        (r.name||"").toLowerCase().includes(lq) ||
        (r.setor_picklist||"").toLowerCase().includes(lq)
      ).slice(0,50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[searchQ, rawEmpresas]);

    const contResults = useMemo(()=>{
      if(!lq) return rawContatos.slice(0,50);
      return rawContatos.filter(r=>{
        const nome = ((r.firstname||"")+" "+(r.lastname||"")).toLowerCase();
        return nome.includes(lq) || (r.email||"").toLowerCase().includes(lq) || (r.jobtitle||"").toLowerCase().includes(lq);
      }).slice(0,50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[searchQ, rawContatos]);

    return (
      <div>
        <div style={{marginBottom:16}}>
          <input
            value={searchQ}
            onChange={e=>setSearchQ(e.target.value)}
            placeholder="Buscar empresa ou contato..."
            style={{width:"100%",padding:"10px 14px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,outline:"none",background:C.surface,color:C.text,boxSizing:"border-box",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}
          />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* EMPRESAS */}
          <div>
            <div style={sTit}>EMPRESAS ({empResults.length}{rawEmpresas.length>50&&!lq?"+":""})</div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={{...th,textAlign:"left"}}></th>
                  <th style={{...th,textAlign:"left"}}>EMPRESA</th>
                  <th style={{...th,textAlign:"left",width:48}}>TIER</th>
                  <th style={{...th,textAlign:"left",width:72}}>STATUS</th>
                </tr></thead>
                <tbody>
                  {empResults.map((r,i)=>{
                    const t=r.tier_growth||"";
                    const tb={background:`${TIER_C[t]||"#EEE"}30`,color:TIER_C[t]||"#999",borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${TIER_C[t]||"#DDD"}`,display:"inline-block"};
                    const isExp=expandedEmp===("s_"+r.company_id);
                    const hist=historicoEmpresa[r.company_id]||[];
                    const cts=(rawContatos.filter(c=>c.company_id===r.company_id));
                    return (
                      <>
                        <tr key={i} onClick={()=>setExpandedEmp(isExp?null:("s_"+r.company_id))} style={{cursor:"pointer",background:isExp?"rgba(255,165,0,0.04)":i%2===0?"rgba(0,0,0,0.02)":"transparent"}}>
                          <td style={{...td,width:24,color:"#CCC",fontSize:10,textAlign:"center"}}>{isExp?"▼":"▶"}</td>
                          <td style={{...td,color:C.text,fontWeight:isExp?500:400}}>{r.name||"—"}</td>
                          <td style={td}><span style={tb}>{tl(t)}</span></td>
                          <td style={{...td,color:r.status_da_empresa__cliente?.toLowerCase()==="true"?C.green:C.dim,width:72}}>{r.status_da_empresa__cliente?.toLowerCase()==="true"?"Cliente":"Prospect"}</td>
                        </tr>
                        {isExp&&(
                          <tr key={"exp_"+i}>
                            <td colSpan={4} style={{padding:0,background:"#FAFAF8",borderBottom:`1px solid ${C.border}`}}>
                              <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                                <div>
                                  <div style={{fontSize:9,color:C.orange,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:600}}>📅 Histórico de Eventos ({hist.length})</div>
                                  {hist.length===0?<div style={{fontSize:11,color:C.muted}}>Sem histórico</div>:(
                                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                      {[...hist].sort().reverse().map((ev,ei)=>(
                                        <div key={ei} style={{fontSize:11,color:C.dim,display:"flex",alignItems:"center",gap:6}}>
                                          <span style={{width:5,height:5,borderRadius:"50%",background:C.orange,flexShrink:0,display:"inline-block"}}/>
                                          {ev}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div style={{fontSize:9,color:C.crayola,letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontWeight:600}}>👤 Contatos ({cts.length})</div>
                                  {cts.length===0?<div style={{fontSize:11,color:C.muted}}>Nenhum contato</div>:(
                                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                      {cts.map((c,ci)=>(
                                        <div key={ci} style={{fontSize:11,color:C.dim}}>
                                          {[c.firstname,c.lastname].filter(Boolean).join(" ")||"—"}
                                          {c.jobtitle&&<span style={{color:C.muted,fontSize:10}}> · {c.jobtitle}</span>}
                                        </div>
                                      ))}
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
              {!empResults.length&&<div style={{padding:"18px",textAlign:"center",color:C.muted,fontSize:12}}>Nenhuma empresa encontrada</div>}
            </div>
          </div>

          {/* CONTATOS */}
          <div>
            <div style={sTit}>CONTATOS ({contResults.length}{rawContatos.length>50&&!lq?"+":""})</div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={{...th,textAlign:"left"}}>NOME</th>
                  <th style={{...th,textAlign:"left"}}>CARGO</th>
                  <th style={{...th,textAlign:"left",width:110}}>EMPRESA</th>
                </tr></thead>
                <tbody>
                  {contResults.map((r,i)=>{
                    const nome=[r.firstname,r.lastname].filter(Boolean).join(" ")||"—";
                    const emp=rawEmpresas.find(e=>e.company_id===r.company_id);
                    return (
                      <tr key={i} style={{background:i%2===0?"rgba(0,0,0,0.02)":"transparent"}}>
                        <td style={{...td,color:C.text}}>{nome}</td>
                        <td style={td}><Trunc s={r.jobtitle||"—"} n={22}/></td>
                        <td style={{...td,width:110,fontSize:11,color:C.dim}}><Trunc s={emp?.name||"—"} n={16}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!contResults.length&&<div style={{padding:"18px",textAlign:"center",color:C.muted,fontSize:12}}>Nenhum contato encontrado</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };


  // ─── TAB 5 — GERADOR DE LISTA ──────────────────────────────────────────────
  const allSegmentos = useMemo(()=>{
    const s=new Set();
    rawEmpresas.forEach(r=>{ if(r.setor_picklist) s.add(r.setor_picklist); });
    rawTarget.forEach(r=>{ if(r.setor_picklist) s.add(r.setor_picklist); });
    return [...s].sort();
  },[rawEmpresas, rawTarget]);

  const handleGerarLista = async()=>{
    setGLoading(true);
    setGErro("");
    setGResultado(null);

    // Build company summaries — base ativa (já foi a evento)
    const idsAtivos = new Set(rawEmpresas.map(r=>r.company_id));
    const empresasSummary = rawEmpresas.map(r=>{
      const eventos = (r.eventos__picklist_de_presenca||"").split(";").map(e=>e.trim()).filter(Boolean);
      const dealsEmp = rawDeals.filter(d=>d.company_id===r.company_id);
      const dealsAbertos = dealsEmp.filter(d=>d.dealstage&&!["closedwon","closedlost"].includes(d.dealstage));
      const receitaTotal = dealsEmp.reduce((s,d)=>s+fAmt(d.amount),0);
      return {
        id: r.company_id,
        nome: r.name,
        tier: r.tier_growth||"",
        segmento: r.setor_picklist||"",
        cliente: r.status_da_empresa__cliente?.toLowerCase()==="true",
        base: "ativa",
        qtdEventos: eventos.length,
        dealsAbertos: dealsAbertos.length,
        receitaTotal,
      };
    });

    // Add target companies (not already in base ativa)
    const targetSummary = rawTarget
      .filter(r=>!idsAtivos.has(r.company_id))
      .map(r=>({
        id: r.company_id,
        nome: r.name,
        tier: r.tier_growth||"",
        segmento: r.setor_picklist||"",
        cliente: r.status_da_empresa__cliente?.toLowerCase()==="true",
        base: "target",
        qtdEventos: 0,
        dealsAbertos: 0,
        receitaTotal: 0,
        plataforma: r.plataforma_ecommerce||"",
        totalLojas: r.total_lojas||"",
        volumeEcommerce: r.volume_ecommerce||"",
      }));

    const todasEmpresas = [...empresasSummary, ...targetSummary];

    // Apply structural filters first
    let filtradas = todasEmpresas;
    if(gSegmentos.length>0) filtradas = filtradas.filter(e=>gSegmentos.includes(e.segmento));
    if(gTiers.length>0) filtradas = filtradas.filter(e=>gTiers.includes(e.tier));
    if(gStatus==="cliente") filtradas = filtradas.filter(e=>e.cliente);
    if(gStatus==="prospect") filtradas = filtradas.filter(e=>!e.cliente);

    // Limit to 200 companies to avoid token overflow
    const amostra = filtradas.slice(0,200);

    try {
      const res = await fetch("/api/generate", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nomeEvento: gNome,
          objetivo: gObjetivo,
          vagas: gVagas,
          texto: gTexto,
          empresas: amostra,
        })
      });
      if(!res.ok) {
        const err = await res.json();
        setGErro(err.error || "Erro ao gerar lista.");
        setGLoading(false);
        return;
      }
      const parsed = await res.json();
      setGResultado(parsed);
    } catch(err) {
      setGErro("Erro de conexão. Tente novamente.");
    }
    setGLoading(false);
  };

  const exportCSV = ()=>{
    if(!gResultado) return;
    const rows = [["company_name","tier","segmento","status","base","prioridade","justificativa"]];
    gResultado.lista.forEach(r=>{
      rows.push([r.empresa, "T"+r.tier, r.segmento, r.status, r.base||"", r.prioridade, r.justificativa]);
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`lista_${(gNome||"evento").replace(/\s+/g,"_")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const Tab5 = ()=>{
    const togSeg = s => setGSegmentos(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
    const togTier = t => setGTiers(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
    const sc = p => p<=10?C.green:p<=25?C.orange:C.crayola;

    return (
      <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:16,alignItems:"start"}}>

        {/* LEFT — BRIEFING */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{...card,borderTop:`3px solid ${C.orange}`}}>
            <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:0.8,marginBottom:14,textTransform:"uppercase"}}>📋 Briefing do Evento</div>

            <div style={{marginBottom:10}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Nome do evento</label>
              <input value={gNome} onChange={e=>setGNome(e.target.value)} placeholder="Ex: 2026-05 EVENTO VAREJO SUMMIT" style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:C.text,outline:"none",boxSizing:"border-box"}}/>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Objetivo</label>
              <select value={gObjetivo} onChange={e=>setGObjetivo(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:gObjetivo?C.text:C.muted,outline:"none",boxSizing:"border-box"}}>
                <option value="">Selecione...</option>
                <option>Gerar novos negócios (prospects)</option>
                <option>Acelerar deals em andamento</option>
                <option>Fidelizar clientes atuais</option>
                <option>Misto (clientes e prospects)</option>
              </select>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Vagas</label>
              <input type="number" value={gVagas} onChange={e=>setGVagas(e.target.value)} min="1" max="500" style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:C.text,outline:"none",boxSizing:"border-box"}}/>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Status</label>
              <div style={{display:"flex",gap:6}}>
                {["ambos","cliente","prospect"].map(s=>(
                  <button key={s} onClick={()=>setGStatus(s)} style={{flex:1,padding:"6px",fontSize:11,borderRadius:5,border:`1px solid ${gStatus===s?C.orange:C.border}`,background:gStatus===s?`rgba(255,165,0,0.08)`:"transparent",color:gStatus===s?C.orange:C.dim,cursor:"pointer",textTransform:"capitalize",fontFamily:FONT}}>
                    {s==="ambos"?"Ambos":s==="cliente"?"Clientes":"Prospects"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Tiers ({gTiers.length===0?"todos":gTiers.map(t=>"T"+t).join(", ")})</label>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {["0","1","2","3","4"].map(t=>(
                  <button key={t} onClick={()=>togTier(t)} style={{padding:"3px 10px",fontSize:11,borderRadius:4,border:`1px solid ${gTiers.includes(t)?TIER_C[t]:C.border}`,background:gTiers.includes(t)?`${TIER_C[t]}18`:"transparent",color:gTiers.includes(t)?TIER_C[t]:C.dim,cursor:"pointer",fontFamily:FONT,fontWeight:gTiers.includes(t)?700:400}}>
                    T{t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Segmentos ({gSegmentos.length===0?"todos":gSegmentos.length+" selecionados"})</label>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",maxHeight:80,overflowY:"auto"}}>
                {allSegmentos.map(s=>(
                  <button key={s} onClick={()=>togSeg(s)} style={{padding:"3px 8px",fontSize:10,borderRadius:4,border:`1px solid ${gSegmentos.includes(s)?C.orange:C.border}`,background:gSegmentos.includes(s)?`rgba(255,165,0,0.08)`:"transparent",color:gSegmentos.includes(s)?C.orange:C.dim,cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{...kLbl,display:"block",marginBottom:4}}>Instruções adicionais (opcional)</label>
              <textarea value={gTexto} onChange={e=>setGTexto(e.target.value)} placeholder="Ex: Priorize empresas com deal aberto, evite quem foi nos últimos 2 eventos..." rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:C.text,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:FONT}}/>
            </div>

            <button onClick={handleGerarLista} disabled={gLoading||!gNome||!gObjetivo} style={{width:"100%",background:(!gNome||!gObjetivo)?C.border:C.orange,border:"none",borderRadius:6,padding:"10px",color:(!gNome||!gObjetivo)?"#999":"#000",fontSize:13,fontWeight:700,cursor:(!gNome||!gObjetivo||gLoading)?"not-allowed":"pointer",fontFamily:FONT,opacity:gLoading?0.7:1}}>
              {gLoading?"⏳ Gerando lista...":"✨ Gerar Lista com IA"}
            </button>
            {gErro&&<div style={{marginTop:8,fontSize:11,color:C.tart}}>{gErro}</div>}
          </div>
        </div>

        {/* RIGHT — RESULTADO */}
        <div>
          {!gResultado&&!gLoading&&(
            <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:10}}>✨</div>
              <div style={{fontSize:13,color:C.orange,fontWeight:600,marginBottom:6}}>Gerador de Lista com IA</div>
              <div style={{fontSize:12,color:C.muted}}>Preencha o briefing ao lado e clique em Gerar Lista</div>
            </div>
          )}
          {gLoading&&(
            <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
              <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
              <div style={{width:36,height:36,border:`2px solid ${C.border}`,borderTopColor:C.orange,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
              <div style={{fontSize:12,color:C.muted}}>Analisando {rawEmpresas.length + rawTarget.length} empresas ({rawEmpresas.length} ativas + {rawTarget.length} target)...</div>
            </div>
          )}
          {gResultado&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={sTit}>{gResultado.lista?.length} EMPRESAS SELECIONADAS de {gResultado.total_analisado} analisadas</div>
                </div>
                <button onClick={exportCSV} style={{background:C.orange,border:"none",borderRadius:6,padding:"7px 14px",color:"#000",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  ⬇ Exportar CSV
                </button>
              </div>
              {gResultado.resumo&&(
                <div style={{...card,marginBottom:12,borderLeft:`3px solid ${C.orange}`,padding:"12px 14px"}}>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:4}}>Estratégia da lista</div>
                  <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{gResultado.resumo}</div>
                </div>
              )}
              <div style={{...card,padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={{...th,width:32,textAlign:"right"}}>#</th>
                    <th style={{...th,textAlign:"left"}}>EMPRESA</th>
                    <th style={{...th,width:44,textAlign:"left"}}>TIER</th>
                    <th style={{...th,width:100,textAlign:"left"}}>SEGMENTO</th>
                    <th style={{...th,width:80,textAlign:"left"}}>STATUS</th>
                    <th style={{...th,width:70,textAlign:"left"}}>BASE</th>
                    <th style={{...th,textAlign:"left"}}>JUSTIFICATIVA</th>
                  </tr></thead>
                  <tbody>
                    {gResultado.lista?.map((r,i)=>{
                      const t=r.tier||"";
                      const tb={background:`${TIER_C[t]||"#EEE"}30`,color:TIER_C[t]||"#999",borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${TIER_C[t]||"#DDD"}`,display:"inline-block"};
                      return (
                        <tr key={i} style={{background:i%2===0?"rgba(0,0,0,0.02)":"transparent"}}>
                          <td style={{...td,width:32,textAlign:"right",color:"#CCC",fontSize:11}}>{r.prioridade}</td>
                          <td style={{...td,color:C.text,fontWeight:500}}>{r.empresa}</td>
                          <td style={{...td,width:44}}><span style={tb}>{tl(t)}</span></td>
                          <td style={{...td,width:100,fontSize:11}}>{r.segmento||"—"}</td>
                          <td style={{...td,width:80,color:r.status==="Cliente"?C.green:C.orange,fontSize:11,fontWeight:500}}>{r.status}</td>
                          <td style={{...td,width:70}}>
                            <span style={{background:r.base==="target"?"rgba(99,102,241,0.1)":"rgba(22,163,74,0.1)",color:r.base==="target"?"#6366F1":C.green,borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${r.base==="target"?"#6366F1":C.green}`,display:"inline-block"}}>
                              {r.base==="target"?"TARGET":"ATIVA"}
                            </span>
                          </td>
                          <td style={{...td,fontSize:11,color:C.dim}}>{r.justificativa}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  if (!authed) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={{background:C.headerBg,borderBottom:`3px solid ${C.orange}`,padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,fontWeight:700,fontSize:16,color:"#FFF"}}>
          <div style={{background:C.orange,borderRadius:5,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#000"}}>⚡</div>
          Event<span style={{color:C.orange}}>Hub</span>
        </div>
        <span style={{fontSize:9,color:"#AAA",letterSpacing:2}}>ANÁLISE ESTRATÉGICA DE EVENTOS</span>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"36px 32px",width:360,boxShadow:"0 4px 24px rgba(0,0,0,0.08)",borderTop:`3px solid ${C.orange}`}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:4}}>Bem-vindo ao EventHub</div>
            <div style={{fontSize:11,color:C.muted,letterSpacing:0.8}}>Use seu e-mail @crmbonus.com para entrar</div>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",display:"block",marginBottom:5}}>E-mail</label>
              <input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="seu.nome@crmbonus.com" required
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",display:"block",marginBottom:5}}>Senha</label>
              <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••" required
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {loginErr&&<div style={{background:"rgba(252,70,69,0.06)",border:`1px solid rgba(252,70,69,0.3)`,borderRadius:6,padding:"8px 12px",fontSize:12,color:C.tart,marginBottom:14}}>{loginErr}</div>}
            <button type="submit" disabled={loginLoading}
              style={{width:"100%",background:C.orange,border:"none",borderRadius:6,padding:"10px",color:"#000",fontSize:13,fontWeight:700,cursor:loginLoading?"not-allowed":"pointer",fontFamily:FONT,opacity:loginLoading?0.7:1}}>
              {loginLoading?"Entrando...":"Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{width:36,height:36,border:`2px solid ${C.border}`,borderTopColor:C.orange,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontSize:11,color:C.muted,letterSpacing:1.5}}>{loadMsg.toUpperCase()}</span>
      {loadErr&&<span style={{fontSize:12,color:C.tart,maxWidth:400,textAlign:"center"}}>{loadErr}</span>}
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
              {demoMode&&<span style={{background:"rgba(255,165,0,0.15)",color:C.orange,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,border:`1px solid ${C.orange}`,letterSpacing:1}}>DEMO</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:9,color:"#AAA",letterSpacing:2}}>ANÁLISE ESTRATÉGICA DE EVENTOS</span>
              <button onClick={handleLogout} style={{background:"transparent",border:"1px solid #444",borderRadius:4,padding:"3px 10px",color:"#888",fontSize:10,cursor:"pointer",fontFamily:FONT}}>Sair</button>
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
            {demoMode&&<button onClick={()=>{setDemoMode(false);setRawEmpresas([]);setRawDeals([]);setRawContatos([]);setRawCustos([]);setRawTarget([]);setSelEvs([]);setLoading(false);}} style={{background:"rgba(255,165,0,0.1)",border:`1px solid ${C.orange}`,borderRadius:5,padding:"5px 10px",color:C.orange,cursor:"pointer",fontSize:11}}>Sair do demo</button>}
            {win&&<div style={{background:"rgba(255,165,0,0.06)",border:`1px solid rgba(255,165,0,0.15)`,borderRadius:5,padding:"5px 10px",fontSize:11,color:"#EEE",display:"flex",gap:5,alignItems:"center"}}><span>📅</span><span style={{color:"#AAA"}}><b style={{color:C.orange}}>Janela:</b> {win.s.toLocaleDateString("pt-BR")} → {win.e.toLocaleDateString("pt-BR")}</span></div>}
          </div>
        </div>
        <div style={{maxWidth:1440,margin:"0 auto",padding:"0 22px",display:"flex"}}>
          {["Event Dashboard","Performance Dashboard","Comparativo de Eventos","🔍 Search","✨ Gerador"].map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)}
              style={{padding:"10px 20px",cursor:"pointer",fontSize:12,fontWeight:tab===i?600:400,color:tab===i?C.orange:"#FFFFFF",borderBottom:tab===i?`2px solid ${C.orange}`:"2px solid transparent",background:"transparent",border:"none",fontFamily:FONT,transition:"color 0.15s",letterSpacing:0.3}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1440,margin:"0 auto",padding:"18px 22px 48px"}}>
        {tab!==4&&!selEvs.length?(
          <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>🎯</div>
            <div style={{fontSize:14,color:C.orange,fontWeight:600,marginBottom:6}}>Selecione um ou mais eventos para começar</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Use o seletor acima para escolher os eventos que deseja analisar</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>{allEvs.length} eventos · {rawEmpresas.length} empresas ativas · {rawTarget.length} empresas target · {rawDeals.length} deals</div>
            {!demoMode&&(
              <button onClick={loadDemo} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 18px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
                🧪 Carregar dados demo
              </button>
            )}
          </div>
        ):(
          <>
            {tab===0&&<Tab1/>}
            {tab===1&&<Tab2/>}
            {tab===2&&<Tab3/>}
            {tab===3&&<Tab4/>}
            {tab===4&&<Tab5/>}
          </>
        )}
      </div>
    </div>
  );
}
