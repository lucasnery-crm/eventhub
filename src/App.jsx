import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const PROXY_URL = "https://script.google.com/macros/s/AKfycbzOBVmkFPh90pfSnrNzamHmlVtoVBsJW0lI9Z31sPewtv8eeIZCKBGLE2--TLDvje3Urg/exec";

function fetchSheet(sheet) {
  // JSONP — bypasses CORS/redirect issue with Apps Script
  return new Promise((resolve, reject) => {
    const cbName = "_cb_" + sheet + "_" + Date.now();
    const script = document.createElement("script");
    script.src = `${PROXY_URL}?sheet=${sheet}&callback=${cbName}`;
    script.onerror = () => reject(new Error(`Erro ao carregar ${sheet}`));
    window[cbName] = (data) => {
      delete window[cbName];
      document.body.removeChild(script);
      resolve(data);
    };
    document.body.appendChild(script);
  });
}


const C = {
  bg:"#0F0F0F", surface:"#171717", card:"#1C1C1C", border:"#282828",
  orange:"#FFA500", tart:"#FC4645", crayola:"#FE842B",
  green:"#22C55E", text:"#DEDEDE", dim:"#888", muted:"#444",
};
const TIER_C = {"0":"#FFA500","1":"#FE842B","2":"#FC4645","3":"#A855F7","4":"#555","":"#333"};
const SEG_C  = ["#FFA500","#FE842B","#FC4645","#FFD166","#A855F7","#22C55E","#38BDF8","#FB7185"];
const T_ORD  = ["0","1","2","3","4",""];
const FONT   = "'Roboto', sans-serif";

const tl = t => (t!=null&&t!=="")?("T"+t):"—";
const fBRL = v => { const n=Math.round(Number(v)||0); if(n>=1000000) return "R$\u00a0"+(n/1000000).toFixed(1).replace(".",",")+"M"; if(n>=1000) return "R$\u00a0"+(n/1000).toFixed(0)+"K"; return "R$\u00a0"+n.toLocaleString("pt-BR"); };
const fPct = v => (Number(v)||0).toFixed(1)+"%";
const fNum = v => (Number(v)||0).toLocaleString("pt-BR");
const fAmt = v => { if(!v)return 0; return parseFloat(String(v).replace(/[R$\s]/g,"").replace(/\./g,"").replace(",","."))||0; };

function parseReal(v) {
  if (!v) return null;
  const p = String(v).split("/");
  if (p.length===3) return new Date(+p[2], +p[0]-1, +p[1]);
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

export default function App() {
  const [rawEmpresas, setRawEmpresas] = useState([]);
  const [rawDeals, setRawDeals] = useState([]);
  const [dpMap, setDpMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Carregando...");
  const [loadErr, setLoadErr] = useState("");
  const [selEvs, setSelEvs] = useState([]);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
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

  const dp = useCallback(v=>(!v?"":dpMap[v]||v), [dpMap]);

  const allEvs = useMemo(()=>{
    const s=new Set();
    rawEmpresas.forEach(r=>(r.eventos__picklist_de_presenca||"").split(";").forEach(e=>{const t=e.trim();if(t)s.add(t);}));
    return [...s].sort();
  },[]);

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
  },[]);

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
    const cli=emps.filter(r=>r.status_da_empresa__cliente==="TRUE").length;
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
    return {ni:dealsInf.length,ri,ti:dealsInf.length?ri/dealsInf.length:0,
            nd:dealsDir.length,rd,td:dealsDir.length?rd/dealsDir.length:0};
  },[dealsInf,dealsDir]);

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
  },[]);

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
  const hdr  = {background:"#111",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100};
  const card = {background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px"};
  const th   = {padding:"7px 10px",fontSize:10,letterSpacing:0.8,color:"#555",borderBottom:`1px solid ${C.border}`,background:"#161616",textTransform:"uppercase",whiteSpace:"nowrap"};
  const td   = {padding:"7px 10px",fontSize:12,borderBottom:`1px solid #1E1E1E`,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:0};
  const kLbl = {fontSize:10,color:"#555",letterSpacing:0.8,textTransform:"uppercase",marginBottom:4};
  const sTit = {fontSize:10,color:"#444",letterSpacing:0.8,textTransform:"uppercase",marginBottom:8};

  const TB = ({row,rank}) => {
    const t=empTierMap[row.company_id]||row.tier_growth||"";
    const tb={background:`${TIER_C[t]||"#333"}18`,color:TIER_C[t]||"#555",borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${TIER_C[t]||"#333"}30`,display:"inline-block"};
    return (
      <tr style={{background:rank%2===0?"rgba(255,255,255,0.015)":"transparent"}}>
        <td style={{...td,width:24,color:"#333",fontSize:11,textAlign:"right"}}>{rank}</td>
        <td style={{...td,color:C.text}}><Trunc s={row.dealname} n={26}/></td>
        <td style={{...td,width:40}}><span style={tb}>{tl(t)}</span></td>
        <td style={{...td,color:C.green,fontWeight:600,width:110,fontVariantNumeric:"tabular-nums"}}>{fBRL(fAmt(row.amount))}</td>
        <td style={{...td,width:96}}><Trunc s={dp(row.pipeline)} n={13}/></td>
        <td style={{...td,width:96}}><Trunc s={dp(row.dealstage)} n={13}/></td>
        <td style={{...td,width:82,color:"#444",fontSize:11}}>{fDate(row.data_real)}</td>
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
            <BarChart data={segD} layout="vertical" margin={{left:0,right:8}}>
              <XAxis type="number" tick={{fill:"#333",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis dataKey="n" type="category" tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false} width={88}/>
              <Tooltip contentStyle={tt} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
              <Bar dataKey="v" radius={[0,3,3,0]}>{segD.map((_,i)=><Cell key={i} fill={SEG_C[i%SEG_C.length]}/>)}</Bar>
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
      <div style={sTit}>PERFIL DAS EMPRESAS</div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={{...th,textAlign:"left"}}>EMPRESA</th>
            <th style={{...th,textAlign:"left",width:52}}>TIER</th>
            <th style={{...th,textAlign:"left"}}>SEGMENTO</th>
            <th style={{...th,textAlign:"left",width:80}}>STATUS</th>
          </tr></thead>
          <tbody>
            {profT.map((r,i)=>{
              const t=r.tier_growth||"";
              const tb={background:`${TIER_C[t]||"#333"}18`,color:TIER_C[t]||"#555",borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:700,border:`1px solid ${TIER_C[t]||"#333"}30`,display:"inline-block"};
              return (
                <tr key={i} style={{background:i%2===0?"rgba(255,255,255,0.015)":"transparent"}}>
                  <td style={{...td,color:C.text}}><Trunc s={r.name} n={30}/></td>
                  <td style={td}><span style={tb}>{tl(t)}</span></td>
                  <td style={td}><Trunc s={r.setor_picklist||"—"} n={20}/></td>
                  <td style={{...td,color:r.status_da_empresa__cliente==="TRUE"?C.green:C.dim}}>{r.status_da_empresa__cliente==="TRUE"?"Cliente":"Prospect"}</td>
                </tr>
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
        <div style={{background:"linear-gradient(135deg,#1A1200,#111)",border:`1px solid rgba(255,165,0,0.2)`,borderRadius:8,padding:"16px 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:110}}>
          <div style={{fontSize:9,color:"#444",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>SCORE</div>
          <div style={{width:72,height:72,borderRadius:"50%",border:`3px solid ${C.orange}`,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,165,0,0.05)"}}>
            <span style={{fontSize:26,fontWeight:700,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{single?single.score:"—"}</span>
          </div>
          <div style={{fontSize:9,color:"#444",marginTop:6}}>/100</div>
        </div>
        {/* Big KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[
            {l:"RECEITA DIRETA",    v:fBRL(kpD.rd), c:C.orange},
            {l:"NEGÓCIOS DIRETOS",  v:fNum(kpD.nd), c:C.orange},
            {l:"RECEITA INFLUENC.", v:fBRL(kpD.ri), c:C.crayola},
            {l:"NEGÓCIOS INFLUENC.",v:fNum(kpD.ni), c:C.crayola},
          ].map((k,i)=>(
            <div key={i} style={{...card,borderLeft:`3px solid ${k.c}`,padding:"12px 14px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{fontSize:9,color:"#444",letterSpacing:0.8,textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:k.c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{k.v}</div>
            </div>
          ))}
        </div>
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
      {[{title:"TOP 10 — NEGÓCIOS ORIGEM DIRETA",data:t10d},{title:"TOP 10 — NEGÓCIOS INFLUENCIADOS",data:t10i}].map(({title,data},ti)=>(
        <div key={ti} style={{marginBottom:16}}>
          <div style={sTit}>{title}</div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup><col style={{width:24}}/><col/><col style={{width:40}}/><col style={{width:110}}/><col style={{width:96}}/><col style={{width:96}}/><col style={{width:82}}/></colgroup>
              <thead><tr>
                <th style={{...th,textAlign:"right"}}>#</th>
                <th style={{...th,textAlign:"left"}}>DEAL</th>
                <th style={{...th,textAlign:"left"}}>T</th>
                <th style={{...th,textAlign:"left"}}>VALOR</th>
                <th style={{...th,textAlign:"left"}}>PIPELINE</th>
                <th style={{...th,textAlign:"left"}}>FASE</th>
                <th style={{...th,textAlign:"left"}}>DATA</th>
              </tr></thead>
              <tbody>{data.map((row,i)=><TB key={i} row={row} rank={i+1}/>)}</tbody>
            </table>
            {!data.length&&<div style={{padding:"18px",textAlign:"center",color:"#333",fontSize:12}}>Nenhum negócio encontrado</div>}
          </div>
        </div>
      ))}
    </div>
  );

  const Tab3 = ()=>{
    if(selEvs.length<2) return (
      <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:10}}>📊</div>
        <div style={{fontSize:13,color:"#444"}}>Selecione 2 ou mais eventos para comparar.</div>
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

  if (loading) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{width:36,height:36,border:`2px solid ${C.border}`,borderTopColor:C.orange,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontSize:11,color:"#444",letterSpacing:1.5}}>{loadMsg.toUpperCase()}</span>
      {loadErr&&<span style={{fontSize:12,color:C.tart,maxWidth:400,textAlign:"center"}}>{loadErr}</span>}
    </div>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,color:C.text,fontSize:13}}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={hdr}>
        <div style={{maxWidth:1440,margin:"0 auto",padding:"10px 22px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,fontWeight:700,fontSize:16,color:C.text}}>
              <div style={{background:C.orange,borderRadius:5,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#000"}}>⚡</div>
              Event<span style={{color:C.orange}}>Hub</span>
            </div>
            <span style={{fontSize:9,color:"#333",letterSpacing:2}}>ANÁLISE ESTRATÉGICA DE EVENTOS</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <div style={{position:"relative"}} ref={ref}>
              <div onClick={()=>setOpen(o=>!o)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,minWidth:240,fontSize:12,color:C.text}}>
                <span style={{flex:1,color:selEvs.length?C.text:"#444"}}>{selEvs.length?`${selEvs.length} evento${selEvs.length>1?"s":""} selecionado${selEvs.length>1?"s":""}`:"Selecionar eventos..."}</span>
                <span style={{color:"#333",fontSize:9}}>{open?"▲":"▼"}</span>
              </div>
              {open&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,width:300,background:"#1A1A1A",border:`1px solid ${C.border}`,borderRadius:6,zIndex:300,maxHeight:240,overflowY:"auto",boxShadow:"0 12px 32px rgba(0,0,0,0.7)"}}>
                  <input style={{width:"100%",background:C.bg,border:"none",borderBottom:`1px solid ${C.border}`,padding:"7px 12px",color:C.text,fontSize:12,outline:"none",boxSizing:"border-box"}} placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
                  {filtEvs.length===0&&<div style={{padding:"12px",textAlign:"center",color:"#333",fontSize:12}}>{allEvs.length===0?"Nenhum evento":"Nenhum resultado"}</div>}
                  {filtEvs.map(ev=>(
                    <div key={ev} onClick={()=>tog(ev)} style={{padding:"7px 12px",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:7,background:selEvs.includes(ev)?"rgba(255,165,0,0.07)":"transparent",color:selEvs.includes(ev)?C.orange:"#666"}}>
                      <span style={{width:12,height:12,borderRadius:2,border:`1.5px solid ${selEvs.includes(ev)?C.orange:"#333"}`,background:selEvs.includes(ev)?C.orange:"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#000",fontSize:8,fontWeight:700}}>
                        {selEvs.includes(ev)?"✓":""}
                      </span>
                      {ev}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selEvs.length>0&&<span style={{background:C.orange,color:"#000",borderRadius:20,padding:"1px 9px",fontSize:11,fontWeight:700}}>{selEvs.length}</span>}
            {selEvs.length>0&&<button onClick={()=>setSelEvs([])} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:5,padding:"5px 10px",color:"#444",cursor:"pointer",fontSize:11}}>Limpar</button>}
            {win&&<div style={{background:"rgba(255,165,0,0.06)",border:`1px solid rgba(255,165,0,0.15)`,borderRadius:5,padding:"5px 10px",fontSize:11,color:C.orange,display:"flex",gap:5,alignItems:"center"}}><span>📅</span><span><b>Janela:</b> {win.s.toLocaleDateString("pt-BR")} → {win.e.toLocaleDateString("pt-BR")}</span></div>}
          </div>
        </div>
        <div style={{maxWidth:1440,margin:"0 auto",padding:"0 22px",display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {["Event Dashboard","Performance Dashboard","Comparativo de Eventos"].map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{padding:"10px 20px",cursor:"pointer",fontSize:12,fontWeight:tab===i?600:400,color:tab===i?C.orange:"#444",borderBottom:tab===i?`2px solid ${C.orange}`:"2px solid transparent",background:"transparent",border:"none",fontFamily:FONT,transition:"color 0.15s"}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1440,margin:"0 auto",padding:"18px 22px 48px"}}>
        {!selEvs.length?(
          <div style={{...card,padding:"56px 24px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>🎯</div>
            <div style={{fontSize:14,color:C.orange,fontWeight:600,marginBottom:6}}>Selecione um ou mais eventos para começar</div>
            <div style={{fontSize:12,color:"#444",marginBottom:10}}>Use o seletor acima para escolher os eventos que deseja analisar</div>
            <div style={{fontSize:11,color:"#333"}}>{allEvs.length} eventos · {rawEmpresas.length} empresas · {rawDeals.length} deals</div>
          </div>
        ):(
          <>
            {tab===0&&<Tab1/>}
            {tab===1&&<Tab2/>}
            {tab===2&&<Tab3/>}
          </>
        )}
      </div>
    </div>
  );
}
