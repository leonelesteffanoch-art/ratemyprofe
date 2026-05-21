import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlh41094phxhm6NZDyzKFENmivi5ceRuI",
  authDomain: "ratemyprofe-fea08.firebaseapp.com",
  projectId: "ratemyprofe-fea08",
  storageBucket: "ratemyprofe-fea08.firebasebasestorage.app",
  messagingSenderId: "103032053506",
  appId: "1:103032053506:web:74f887daba6bc94a6fac1b"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const COL_RESENAS = "resenas";
const B="#1560AA", BD="#0C447C", BL="#deeaf8", OR="#E87722";
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS;

// ── Claves EXACTAMENTE igual a como están en Firebase ──
const FAC_COLOR = {
  "Ciencias de la Arquitectura":"#B45309",
  "Ciencias Biológicas":"#059669",
  "Ciencias de la Comunicación y Creatividad":"#9333EA",
  "Ciencias Empresariales":"#0891B2",
  "Ciencias de la Ingenieria":"#1560AA",
  "Ciencias de la Salud":"#E87722",
  "Ciencias Políticas y Derecho":"#7C3AED",
  "Ciencias de la Educación":"#DB2777",
};
const FAC_BG = {
  "Ciencias de la Arquitectura":"#fef3c7",
  "Ciencias Biológicas":"#d1fae5",
  "Ciencias de la Comunicación y Creatividad":"#f3e8ff",
  "Ciencias Empresariales":"#e0f2fe",
  "Ciencias de la Ingenieria":"#deeaf8",
  "Ciencias de la Salud":"#fff3e0",
  "Ciencias Políticas y Derecho":"#ede9fe",
  "Ciencias de la Educación":"#fce7f3",
};
const FAC_EMOJI = {
  "Ciencias de la Arquitectura":"🏛️",
  "Ciencias Biológicas":"🔬",
  "Ciencias de la Comunicación y Creatividad":"🎨",
  "Ciencias Empresariales":"📊",
  "Ciencias de la Ingenieria":"⚙️",
  "Ciencias de la Salud":"🩺",
  "Ciencias Políticas y Derecho":"⚖️",
  "Ciencias de la Educación":"📚",
};

// Claves idénticas a Firebase — con tildes excepto Ingenieria
const FACULTADES = [
  "Todas",
  "Ciencias de la Arquitectura",
  "Ciencias Biológicas",
  "Ciencias de la Comunicación y Creatividad",
  "Ciencias Empresariales",
  "Ciencias de la Ingenieria",
  "Ciencias de la Salud",
  "Ciencias Políticas y Derecho",
  "Ciencias de la Educación",
];

const CRIT = ["claridad","puntualidad","trato","examenes"];
const CRIT_LABEL = {claridad:"Claridad",puntualidad:"Puntualidad",trato:"Trato",examenes:"Exámenes"};
const CRIT_ICON = {claridad:"💡",puntualidad:"⏰",trato:"🤝",examenes:"📝"};
const FORM_EMPTY = {texto:"",claridad:0,puntualidad:0,trato:0,examenes:0,carrera:"",ciclo:""};
const ADD_EMPTY = {nombre:"",facultad:"Ciencias de la Ingenieria",curso:"",bio:""};

const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const initials = n => n.split(" ").map(x=>x[0]).slice(0,2).join("");
const ratingColor = r => r>=4.5?"#059669":r>=3.5?"#1560AA":r>=2.5?"#E87722":"#DC2626";
const ratingLabel = r => r>=4.5?"Excelente":r>=3.5?"Bueno":r>=2.5?"Regular":"Deficiente";
const timeAgo = d => {
  if(!d) return "";
  const diff = (Date.now()-new Date(d))/(1000*60*60*24);
  return diff<1?"Hoy":diff<7?`Hace ${Math.floor(diff)}d`:new Date(d).toLocaleDateString("es-PE",{day:"numeric",month:"short"});
};
const calcRating = rs => rs.length ? parseFloat(avg(rs.map(x=>avg(CRIT.map(c=>x.criterios[c])))).toFixed(1)) : 0;

const Stars = ({value, onChange, size=16, gap=2}) => (
  <span style={{display:"inline-flex",gap}}>
    {[1,2,3,4,5].map(s=>(
      <span key={s} onClick={()=>onChange&&onChange(s)}
        style={{fontSize:size,color:s<=Math.round(value)?OR:"#dde3ec",cursor:onChange?"pointer":"default",lineHeight:1,display:"inline-block",transition:"transform .1s"}}
        onMouseEnter={e=>{if(onChange)e.target.style.transform="scale(1.25)"}}
        onMouseLeave={e=>{if(onChange)e.target.style.transform="scale(1)"}}>★</span>
    ))}
  </span>
);

const Avatar = ({name, fac, size=48}) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:FAC_BG[fac]||BL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32,fontWeight:700,color:FAC_COLOR[fac]||B,flexShrink:0,border:`2.5px solid ${FAC_COLOR[fac]||B}30`,letterSpacing:"-.5px"}}>
    {initials(name)}
  </div>
);

const RatingChip = ({r, large=false}) => {
  if(!r) return <span style={{color:"#bbb",fontSize:12}}>Sin calificar</span>;
  const c = ratingColor(r);
  return large ? (
    <div style={{textAlign:"center"}}>
      <span style={{background:`${c}18`,color:c,fontWeight:700,fontSize:28,padding:"10px 18px",borderRadius:14,lineHeight:1.2,display:"inline-block"}}>★ {r.toFixed(1)}</span>
      <div style={{fontSize:11,color:c,fontWeight:600,marginTop:4}}>{ratingLabel(r)}</div>
    </div>
  ) : <span style={{background:`${c}18`,color:c,fontWeight:700,fontSize:15,padding:"3px 10px",borderRadius:10}}>{r.toFixed(1)}</span>;
};

const CritBar = ({label, icon, value, delay=0}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9,animation:`fadeIn .4s ease ${delay}s both`}}>
    <span style={{fontSize:14,width:20,textAlign:"center"}}>{icon}</span>
    <span style={{fontSize:12,color:"#6b7a90",width:88,flexShrink:0}}>{label}</span>
    <div style={{flex:1,background:"#edf1f7",borderRadius:6,height:9,overflow:"hidden"}}>
      <div style={{width:`${value*20}%`,background:`linear-gradient(90deg,${B},${OR})`,height:"100%",borderRadius:6,transition:"width .6s ease"}}/>
    </div>
    <span style={{fontSize:12,fontWeight:700,color:ratingColor(value),width:26,textAlign:"right"}}>{value>0?value.toFixed(1):"—"}</span>
  </div>
);

const Toast = ({msg, onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t)},[]);
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2540",color:"#fff",padding:"12px 22px",borderRadius:14,fontSize:13,fontWeight:500,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,.2)",animation:"slideUp .3s ease"}}>{msg}</div>;
};

const Divider = () => <hr style={{border:"none",borderTop:"1px solid #edf1f7",margin:"14px 0"}}/>;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#eef2f9;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#f0f4fa}::-webkit-scrollbar-thumb{background:#c8d5e8;border-radius:3px}
.card{background:#fff;border-radius:18px;border:1px solid #e2eaf5;transition:box-shadow .2s,transform .2s}
.card-hover:hover{box-shadow:0 8px 28px rgba(21,96,170,.12);transform:translateY(-2px);cursor:pointer}
.btn{border:none;border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:all .15s;font-family:inherit;padding:11px 22px}
.btn:active{transform:scale(.97)}
.btn-blue{background:#1560AA;color:#fff}.btn-blue:hover{background:#0C447C}
.btn-orange{background:#E87722;color:#fff}.btn-orange:hover{background:#c96818}
.btn-ghost{background:#f0f4fa;color:#3a4a60}.btn-ghost:hover{background:#e2eaf5}
.btn-red{background:#fef2f2;color:#DC2626;border:1px solid #fecaca}.btn-red:hover{background:#fee2e2}
.input{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid #d8e3ef;font-size:14px;font-family:inherit;outline:none;transition:border .2s,box-shadow .2s;background:#fafcff}
.input:focus{border-color:#1560AA;box-shadow:0 0 0 3px #1560AA18}
.textarea{width:100%;min-height:100px;padding:12px 14px;border-radius:12px;border:1.5px solid #d8e3ef;font-size:14px;resize:vertical;font-family:inherit;outline:none;transition:border .2s;background:#fafcff}
.textarea:focus{border-color:#E87722;box-shadow:0 0 0 3px #E8772218}
.pill{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
.nav-link{color:rgba(255,255,255,.7);font-size:13px;font-weight:500;cursor:pointer;padding:7px 14px;border-radius:10px;transition:all .15s;white-space:nowrap}
.nav-link:hover,.nav-link.active{color:#fff;background:rgba(255,255,255,.18)}
.util-btn{background:none;border:1.5px solid #e2eaf5;border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s;color:#6b7a90;font-family:inherit}
.util-btn:hover{border-color:#1560AA;color:#1560AA;background:#deeaf8}
.tab{padding:8px 18px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .15s;font-family:inherit}
.fade-in{animation:fadeIn .3s ease both}
.shimmer{background:linear-gradient(90deg,#f0f4fa 25%,#e2eaf5 50%,#f0f4fa 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:10px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@media(max-width:600px){
  .nav-link{padding:6px 8px;font-size:11px}
  .pill{font-size:10px;padding:3px 8px}
  .tab{padding:6px 10px;font-size:11px}
  .btn{padding:9px 16px;font-size:13px}
  .card{border-radius:12px}
}
`;

export default function App() {
  const [page, setPage] = useState("home");
  const [profesores, setProfesores] = useState([]);
  const [resenas, setResenas] = useState({});
  const [carreras, setCarreras] = useState({});
  const [selProf, setSelProf] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [facFiltro, setFacFiltro] = useState("Todas");
  const [sortBy, setSortBy] = useState("rating");
  const [form, setForm] = useState(FORM_EMPTY);
  const [formErr, setFormErr] = useState("");
  const [addProf, setAddProf] = useState(ADD_EMPTY);
  const [toast, setToast] = useState(null);
  const [rankTab, setRankTab] = useState("top");
  const [loading, setLoading] = useState(true);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [reportes, setReportes] = useState([]);
  const formRef = useRef();

  useEffect(() => {
    const unsub = onSnapshot(collection(db,"profesores"), snap => {
      setProfesores(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db,"config","carreras"), snap => {
      if(snap.exists()){
        // Log para debug — puedes quitarlo luego
        console.log("Carreras cargadas:", snap.data());
        setCarreras(snap.data());
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if(!selProf) return;
    const q = query(collection(db,"profesores",selProf.id,COL_RESENAS), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      setResenas(prev=>({...prev,[selProf.id]:snap.docs.map(d=>({id:d.id,...d.data()}))}));
    });
    return () => unsub();
  }, [selProf]);

  useEffect(() => {
  const unsub = onSnapshot(collection(db,"reportes"), snap => {
    setReportes(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
  return () => unsub();
  }, []);

  const showToast = msg => setToast(msg);

  const navigate = (p, prof=null) => {
    setPage(p); setFormErr(""); setForm(FORM_EMPTY); setAddProf(ADD_EMPTY);
    if(prof) setSelProf(prof);
    window.scrollTo(0,0);
  };

  const submitResena = async () => {
    if(!form.texto.trim() || CRIT.some(c=>form[c]===0)) {
      setFormErr("Completa todos los criterios y escribe un comentario."); return;
    }
    try {
      const r = {
        texto: form.texto,
        criterios: {claridad:form.claridad,puntualidad:form.puntualidad,trato:form.trato,examenes:form.examenes},
        carrera: form.carrera||"", ciclo: form.ciclo||"",
        util:0, noUtil:0, createdAt:serverTimestamp()
      };
      await addDoc(collection(db,"profesores",selProf.id,COL_RESENAS), r);
      const allR = [r,...(resenas[selProf.id]||[])];
      await updateDoc(doc(db,"profesores",selProf.id), {rating:calcRating(allR), totalReseñas:allR.length});
      setForm(FORM_EMPTY); setFormErr("");
      showToast("✅ ¡Reseña publicada de forma anónima!");
    } catch(e) {
      showToast("❌ Error al publicar la reseña. Verifica tu conexión.");
    }
  };

  const submitAddProf = async () => {
    if(!addProf.nombre.trim()||!addProf.curso.trim()) { showToast("⚠️ Completa el nombre y el curso."); return; }
    try {
      await addDoc(collection(db,"profesores"), {
        nombre:addProf.nombre, facultad:addProf.facultad, cursos:[addProf.curso],
        bio:addProf.bio||"Profesor de la Universidad Científica del Sur.",
        rating:0, totalReseñas:0, createdAt:serverTimestamp()
      });
      showToast("✅ ¡Profesor agregado!");
      setTimeout(()=>navigate("home"), 1200);
    } catch(e) {
      showToast("❌ Error al agregar el profesor. Verifica tu conexión.");
    }
  };  

  const agregarCursoAProfe = async (prof) => {
    if(!addProf.curso.trim()) { showToast("⚠️ Escribe el curso."); return; }
    if((prof.cursos||[]).includes(addProf.curso)) { showToast("⚠️ Ese curso ya existe."); return; }
    try {
      await updateDoc(doc(db,"profesores",prof.id), {cursos:[...(prof.cursos||[]),addProf.curso]});
      showToast("✅ ¡Curso agregado!");
      setTimeout(()=>navigate("home"), 1200);
    } catch(e) {
      showToast("❌ Error al agregar el curso. Verifica tu conexión.");
    }
  };

  const toggleUtil = async (profId, resId, tipo) => {
    const r = resenas[profId]?.find(x=>x.id===resId); if(!r) return;
    try {
      await updateDoc(doc(db,"profesores",profId,COL_RESENAS,resId), {[tipo]:(r[tipo]||0)+1});
    } catch(e) {
      showToast("❌ Error al registrar tu voto.");
    }
  };

  const eliminarProfesor = async (p) => {
    if(!window.confirm(`¿Eliminar a ${p.nombre} y todas sus reseñas?`)) return;
    try {
      const rSnap = await getDocs(collection(db,"profesores",p.id,COL_RESENAS));
      for(const r of rSnap.docs) await deleteDoc(doc(db,"profesores",p.id,COL_RESENAS,r.id));
      await deleteDoc(doc(db,"profesores",p.id));
      showToast(`🗑️ ${p.nombre} eliminado.`);
    } catch(e) {
      showToast("❌ Error al eliminar el profesor. Verifica tu conexión.");
    }
  };

  const eliminarResena = async (p, r) => {
    if(!window.confirm("¿Eliminar esta reseña?")) return;
    try {
      await deleteDoc(doc(db,"profesores",p.id,COL_RESENAS,r.id));
      const remaining = (resenas[p.id]||[]).filter(x=>x.id!==r.id);
      const newRating = calcRating(remaining);
      await updateDoc(doc(db,"profesores",p.id), {rating:newRating, totalReseñas:remaining.length});
      setResenas(prev=>({...prev,[p.id]:remaining}));
      setProfesores(prev=>prev.map(x=>x.id===p.id?{...x,rating:newRating,totalReseñas:remaining.length}:x));
      showToast("🗑️ Reseña eliminada.");
    } catch(e) {
      showToast("❌ Error al eliminar la reseña. Verifica tu conexión.");
    }
  };

  const reportarResena = async (profId, resId, texto, profNombre) => {
    if(!window.confirm("¿Reportar esta reseña como inapropiada o falsa?")) return;
    const yaReportada = reportes.some(r=>r.resId===resId);
    if(yaReportada){ showToast("⚠️ Esta reseña ya fue reportada."); return; }
    try {
      await addDoc(collection(db,"reportes"), {
        profId, resId, texto, profNombre,
        fecha: serverTimestamp(),
        estado: "pendiente"
      });
      showToast("⚠️ Reseña reportada. La revisaremos pronto.");
    } catch(e) {
      showToast("❌ Error al enviar el reporte. Verifica tu conexión.");
    }
  };

  const allR = selProf ? (resenas[selProf.id]||[]) : [];
  const critAvg = CRIT.reduce((acc,c)=>({...acc,[c]:allR.length?avg(allR.map(r=>r.criterios[c])):0}),{});
  const globalRating = calcRating(allR);
  const filtered = profesores
    .filter(p=>p.nombre?.toLowerCase().includes(busqueda.toLowerCase())||p.cursos?.some(c=>c.toLowerCase().includes(busqueda.toLowerCase())))
    .filter(p=>facFiltro==="Todas"||p.facultad===facFiltro)
    .sort((a,b)=>sortBy==="rating"?b.rating-a.rating:(b.totalReseñas||0)-(a.totalReseñas||0));

  const Header = () => (
    <div style={{background:`linear-gradient(135deg,${BD} 0%,${B} 100%)`,padding:"0 20px",display:"flex",alignItems:"center",gap:10,height:62,boxShadow:"0 2px 16px rgba(12,68,124,.3)",position:"sticky",top:0,zIndex:100}}>
      <span onClick={()=>navigate("home")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{background:OR,borderRadius:12,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 2px 8px rgba(232,119,34,.4)"}}>★</div>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:15,lineHeight:1.1}}>RateMyProfe</div>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:9.5,letterSpacing:.8,fontWeight:500}}>CIENTÍFICA DEL SUR</div>
        </div>
      </span>
      <span style={{flex:1}}/>
      <nav style={{display:"flex",gap:2,overflowX:"auto",flexShrink:1,minWidth:0}}>
      {[["home","🏠 Inicio"],["ranking","🏆 Ranking"],["agregar","➕ Agregar"],["admin","⚙️"]].map(([p,l])=>(
        <span key={p} className={`nav-link${page===p?" active":""}`} onClick={()=>navigate(p)}
          style={{padding:"7px 10px"}}>{l}</span>
      ))}
      </nav>
    </div>
  );

  if(page==="home") return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#eef2f9"}}>
      <style>{css}</style><Header/>
      <div style={{background:`linear-gradient(150deg,${BD} 0%,${B} 55%,#2176c7 100%)`,padding:"40px 20px 64px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(232,119,34,.1)",pointerEvents:"none"}}/>
        <div style={{maxWidth:600,margin:"0 auto",textAlign:"center",position:"relative"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.12)",borderRadius:20,padding:"5px 14px",marginBottom:16}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,.9)",fontWeight:500}}>🔒 100% anónimo · sin registro</span>
          </div>
          <h1 style={{color:"#fff",fontSize:26,fontWeight:700,marginBottom:8,lineHeight:1.2}}>¿Qué profesor te tocó este ciclo?</h1>
          <p style={{color:"rgba(255,255,255,.65)",fontSize:14,marginBottom:24}}>Opiniones reales de estudiantes de la Científica del Sur.</p>
          <div style={{display:"flex",gap:10,background:"rgba(255,255,255,.12)",borderRadius:16,padding:8}}>
            <input className="input" value={busqueda} onChange={e=>setBusqueda(e.target.value)}
              placeholder="🔍  Buscar por nombre o curso..." style={{flex:1,border:"none",background:"rgba(255,255,255,.95)"}}/>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:18,flexWrap:"wrap"}}>
            {[{n:profesores.length,l:"profesores",i:"👨‍🏫"},{n:Object.values(resenas).flat().length,l:"reseñas",i:"💬"},{n:FACULTADES.length-1,l:"facultades",i:"🏫"}].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:"8px 16px",display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:16}}>{s.i}</span>
                <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{s.n}</span>
                <span style={{color:"rgba(255,255,255,.65)",fontSize:12}}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:780,margin:"-22px auto 0",padding:"0 16px 48px"}}>
        <div className="card" style={{padding:"12px 16px",marginBottom:14,marginTop:28,display:"flex",gap:8,alignItems:"center",overflowX:"auto"}}>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {FACULTADES.map(f=>(
              <button key={f} onClick={()=>setFacFiltro(f)}
                style={{padding:"5px 13px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:600,border:"1.5px solid",transition:"all .15s",whiteSpace:"nowrap",flexShrink:0,
                  background:facFiltro===f?FAC_COLOR[f]||B:"transparent",
                  color:facFiltro===f?"#fff":FAC_COLOR[f]||"#666",
                  borderColor:facFiltro===f?FAC_COLOR[f]||B:FAC_BG[f]||"#e2eaf5"}}>
                {f==="Todas"?"Todas":`${FAC_EMOJI[f]||""} ${f}`}
              </button>
            ))}
          </div>
          <div style={{marginLeft:"auto",flexShrink:0}}>
            <select className="input" style={{width:"auto",padding:"6px 12px",fontSize:12}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="rating">⭐ Mejor calificados</option>
              <option value="resenas">💬 Más reseñas</option>
            </select>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {loading && [1,2,3].map(i=><div key={i} className="shimmer" style={{height:80}}/>)}
          {!loading && filtered.length===0 && (
            <div className="card" style={{padding:48,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>🔍</div>
              <div style={{color:"#aaa",fontSize:14}}>No se encontraron profesores.</div>
              <button className="btn btn-ghost" onClick={()=>{setBusqueda("");setFacFiltro("Todas")}} style={{marginTop:12}}>Limpiar filtros</button>
            </div>
          )}
          {filtered.map((p,i)=>(
            <div key={p.id} className="card card-hover fade-in" onClick={()=>navigate("perfil",p)}
              style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:14,borderLeft:`4px solid ${FAC_COLOR[p.facultad]||B}`,animationDelay:`${i*.04}s`}}>
              <Avatar name={p.nombre} fac={p.facultad} size={52}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:15,color:"#1a2540",marginBottom:4}}>{p.nombre}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <span className="pill" style={{background:FAC_BG[p.facultad]||BL,color:FAC_COLOR[p.facultad]||BD}}>{FAC_EMOJI[p.facultad]||""} {p.facultad}</span>
                  {(p.cursos||[]).map(c=><span key={c} className="pill" style={{background:"#f3f6fb",color:"#5a6a80"}}>📚 {c}</span>)}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <RatingChip r={p.rating}/>
                <div style={{marginTop:4}}><Stars value={p.rating} size={13} gap={1}/></div>
                <div style={{fontSize:11,color:"#a0adb8",marginTop:3}}>{p.totalReseñas||0} reseñas</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );

  if(page==="ranking") {
    const withR = profesores.filter(p=>p.totalReseñas>0);
    const top = [...withR].sort((a,b)=>b.rating-a.rating);
    const worst = [...withR].sort((a,b)=>a.rating-b.rating);
    const popular = [...profesores].sort((a,b)=>(b.totalReseñas||0)-(a.totalReseñas||0));
    const maxR = Math.max(...profesores.map(p=>p.totalReseñas||0),1);
    const podio = top.slice(0,3);
    const ord=[1,0,2], heights=["60px","80px","44px"], medals=["🥇","🥈","🥉"];
    return (
      <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#eef2f9"}}>
        <style>{css}</style><Header/>
        <div style={{maxWidth:780,margin:"0 auto",padding:"28px 16px 48px"}}>
          <h2 style={{fontSize:20,fontWeight:700,color:BD,marginBottom:4}}>🏆 Ranking de profesores</h2>
          <p style={{fontSize:13,color:"#8a99b0",marginBottom:20}}>Basado en calificaciones reales de estudiantes.</p>
          <div style={{display:"flex",gap:4,background:"#e2eaf5",borderRadius:14,padding:4,width:"fit-content",marginBottom:20}}>
            {[["top","⭐ Top rated"],["worst","💔 Peor rated"],["popular","🔥 Populares"]].map(([k,l])=>(
              <button key={k} className="tab" onClick={()=>setRankTab(k)} style={{background:rankTab===k?B:"transparent",color:rankTab===k?"#fff":"#6b7a90"}}>{l}</button>
            ))}
          </div>
          {rankTab==="top" && podio.length>0 && <>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:16,marginBottom:24,paddingTop:20}}>
              {ord.map((idx,i)=>{const p=podio[idx];if(!p)return null;return(
                <div key={p.id} onClick={()=>navigate("perfil",p)} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",flex:1,maxWidth:160}}>
                  <span style={{fontSize:22,marginBottom:4}}>{medals[idx]}</span>
                  <Avatar name={p.nombre} fac={p.facultad} size={idx===0?56:46}/>
                  <div style={{fontSize:12,fontWeight:600,color:"#1a2540",marginTop:6,textAlign:"center"}}>{p.nombre.split(" ")[0]}</div>
                  <RatingChip r={p.rating}/>
                  <div style={{background:idx===0?OR:idx===1?"#a8b8cc":"#b8a090",height:heights[i],width:"100%",borderRadius:"10px 10px 0 0",marginTop:10,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:6}}>
                    <span style={{color:"#fff",fontWeight:700,fontSize:16}}>#{idx+1}</span>
                  </div>
                </div>
              );})}
            </div>
            <div className="card" style={{padding:"4px 0"}}>
              {top.slice(3).map((p,i)=>(
                <div key={p.id} onClick={()=>navigate("perfil",p)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid #edf1f7":"none",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:13,color:"#a0adb8",fontWeight:600,width:28}}>#{i+4}</span>
                  <Avatar name={p.nombre} fac={p.facultad} size={36}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div><div style={{fontSize:11,color:"#8a99b0"}}>{p.facultad}</div></div>
                  <RatingChip r={p.rating}/>
                </div>
              ))}
            </div>
          </>}
          {rankTab==="worst" && <div className="card" style={{padding:"4px 0"}}>
            {worst.map((p,i)=>(
              <div key={p.id} onClick={()=>navigate("perfil",p)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid #edf1f7":"none",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:22}}>{i===0?"💀":i===1?"😬":"😕"}</span>
                <Avatar name={p.nombre} fac={p.facultad} size={36}/>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div><div style={{fontSize:11,color:"#8a99b0"}}>{p.facultad}</div></div>
                <RatingChip r={p.rating}/>
              </div>
            ))}
          </div>}
          {rankTab==="popular" && <div className="card" style={{padding:"4px 0"}}>
            {popular.map((p,i)=>(
              <div key={p.id} onClick={()=>navigate("perfil",p)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid #edf1f7":"none",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:13,color:"#a0adb8",fontWeight:600,width:28}}>#{i+1}</span>
                <Avatar name={p.nombre} fac={p.facultad} size={36}/>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div><div style={{fontSize:11,color:"#8a99b0"}}>{p.totalReseñas||0} reseñas · {p.facultad}</div></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:80,background:"#edf1f7",borderRadius:6,height:8,overflow:"hidden"}}>
                    <div style={{width:`${((p.totalReseñas||0)/maxR)*100}%`,background:`linear-gradient(90deg,${B},${OR})`,height:"100%",borderRadius:6}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:B}}>{p.totalReseñas||0}</span>
                </div>
              </div>
            ))}
          </div>}
        </div>
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      </div>
    );
  }

  if(page==="agregar") {
    const sugerencias = addProf.nombre.length>=2 ? profesores.filter(p=>p.nombre.toLowerCase().includes(addProf.nombre.toLowerCase())) : [];
    const cursosExistentes = [...new Set(profesores.filter(p=>p.facultad===addProf.facultad).flatMap(p=>p.cursos||[]))];
    const exact = profesores.find(p=>p.nombre.toLowerCase()===addProf.nombre.toLowerCase());
    return (
      <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#eef2f9"}}>
        <style>{css}</style><Header/>
        <div style={{maxWidth:500,margin:"0 auto",padding:"32px 16px 48px"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:8}}>👨‍🏫</div>
            <h2 style={{fontSize:20,fontWeight:700,color:BD,marginBottom:4}}>Agregar un profesor</h2>
            <p style={{fontSize:13,color:"#8a99b0"}}>¿Tu profe no aparece? Agrégalo y sé el primero en calificarlo.</p>
          </div>
          <div className="card" style={{padding:26,display:"flex",flexDirection:"column",gap:16}}>
            <div style={{position:"relative"}}>
              <label style={{fontSize:13,fontWeight:500,color:"#3a4a60",display:"block",marginBottom:6}}>Nombre completo del profesor</label>
              <input className="input" value={addProf.nombre} onChange={e=>setAddProf(p=>({...p,nombre:e.target.value}))} placeholder="Ej. Juan Pérez García" autoComplete="off"/>
              {sugerencias.length>0 && (
                <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #d8e3ef",borderRadius:12,marginTop:4,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.1)",overflow:"hidden"}}>
                  <div style={{padding:"8px 14px",fontSize:11,color:"#8a99b0",fontWeight:600,borderBottom:"1px solid #edf1f7"}}>PROFESORES EXISTENTES</div>
                  {sugerencias.map(p=>(
                    <div key={p.id} onClick={()=>setAddProf(prev=>({...prev,nombre:p.nombre,facultad:p.facultad}))}
                      style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f5f7fa"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <Avatar name={p.nombre} fac={p.facultad} size={32}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div>
                        <div style={{fontSize:11,color:"#8a99b0"}}>{p.facultad} · {(p.cursos||[]).join(", ")}</div>
                      </div>
                      <span style={{marginLeft:"auto",fontSize:11,color:B,fontWeight:500}}>Seleccionar</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:500,color:"#3a4a60",display:"block",marginBottom:6}}>Facultad</label>
              <select className="input" style={{cursor:"pointer"}} value={addProf.facultad} onChange={e=>setAddProf(p=>({...p,facultad:e.target.value,curso:""}))}>
                {FACULTADES.filter(f=>f!=="Todas").map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:500,color:"#3a4a60",display:"block",marginBottom:6}}>Curso que enseña</label>
              <input className="input" value={addProf.curso} onChange={e=>setAddProf(p=>({...p,curso:e.target.value}))} placeholder="Ej. Cálculo III" autoComplete="off"/>
              {cursosExistentes.length>0 && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:11,color:"#8a99b0",marginBottom:6,fontWeight:500}}>CURSOS YA REGISTRADOS</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {cursosExistentes.map(c=>(
                      <span key={c} onClick={()=>setAddProf(p=>({...p,curso:c}))}
                        style={{background:addProf.curso===c?FAC_COLOR[addProf.facultad]||B:FAC_BG[addProf.facultad]||BL,color:addProf.curso===c?"#fff":FAC_COLOR[addProf.facultad]||BD,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all .15s"}}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:500,color:"#3a4a60",display:"block",marginBottom:6}}>Descripción (opcional)</label>
              <input className="input" value={addProf.bio} onChange={e=>setAddProf(p=>({...p,bio:e.target.value}))} placeholder="Ej. Doctor con 10 años de experiencia."/>
            </div>
            {addProf.nombre && (
              <div style={{background:"#f7f9fc",borderRadius:12,padding:"12px 14px",border:"1px dashed #d0dcea"}}>
                <div style={{fontSize:11,color:"#8a99b0",marginBottom:8,fontWeight:500}}>VISTA PREVIA</div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <Avatar name={addProf.nombre} fac={addProf.facultad} size={40}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{addProf.nombre}</div>
                    <div style={{fontSize:11,color:"#8a99b0"}}>{addProf.facultad}{addProf.curso&&` · ${addProf.curso}`}</div>
                  </div>
                </div>
              </div>
            )}
            {exact && addProf.curso ? (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{background:"#fff4eb",border:"1px solid #E87722",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#8a99b0"}}>
                  ⚠️ <strong style={{color:"#1a2540"}}>{exact.nombre}</strong> ya existe. ¿Agregar <strong style={{color:OR}}>"{addProf.curso}"</strong> a su perfil?
                </div>
                <button className="btn btn-orange" onClick={()=>agregarCursoAProfe(exact)} style={{width:"100%",padding:13}}>Agregar curso al profesor existente</button>
                <button className="btn btn-ghost" onClick={submitAddProf} style={{width:"100%",padding:13}}>Crear como profesor nuevo</button>
              </div>
            ) : (
              <button className="btn btn-blue" onClick={submitAddProf} style={{width:"100%",padding:13}}>Agregar profesor</button>
            )}
          </div>
        </div>
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      </div>
    );
  }

  if(page==="perfil" && selProf) return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#eef2f9"}}>
      <style>{css}</style><Header/>
      <div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px 48px"}}>
        <button className="btn btn-ghost" onClick={()=>navigate("home")} style={{marginBottom:16,fontSize:13,padding:"7px 14px"}}>← Volver</button>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button className="btn btn-ghost" style={{fontSize:13,padding:"7px 14px"}}
          onClick={()=>{
            const url = window.location.href;
            const texto = `¿Conoces a ${selProf.nombre}? Mira sus reseñas en RateMyProfe 👇\n${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`,"_blank");
          }}>
          📲 Compartir en WhatsApp
        </button>
      </div>
        <div className="card" style={{marginBottom:14,overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${FAC_COLOR[selProf.facultad]||BD}18,${OR}08)`,padding:"22px 24px 18px"}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
              <Avatar name={selProf.nombre} fac={selProf.facultad} size={68}/>
              <div style={{flex:1,minWidth:160}}>
                <h2 style={{fontSize:22,fontWeight:700,color:"#1a2540",marginBottom:6}}>{selProf.nombre}</h2>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                  <span className="pill" style={{background:FAC_BG[selProf.facultad]||BL,color:FAC_COLOR[selProf.facultad]||BD,fontSize:12}}>{FAC_EMOJI[selProf.facultad]||""} {selProf.facultad}</span>
                  {(selProf.cursos||[]).map(c=><span key={c} className="pill" style={{background:"#f3f6fb",color:"#5a6a80",fontSize:12}}>📚 {c}</span>)}
                </div>
                {selProf.bio&&<p style={{fontSize:13,color:"#6b7a90",lineHeight:1.5}}>{selProf.bio}</p>}
              </div>
              <div style={{textAlign:"center",background:"#fff",borderRadius:16,padding:"16px 22px",border:"1px solid #e2eaf5",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                <RatingChip r={globalRating} large/>
                <Stars value={globalRating} size={14} gap={2}/>
                <div style={{fontSize:11,color:"#a0adb8",marginTop:6}}>{allR.length} reseñas</div>
              </div>
            </div>
          </div>
          <Divider/>
          <div style={{padding:"0 24px 18px"}}>
            {CRIT.map((c,i)=><CritBar key={c} label={CRIT_LABEL[c]} icon={CRIT_ICON[c]} value={critAvg[c]} delay={i*.05}/>)}
          </div>
        </div>

        <div ref={formRef} className="card" style={{padding:22,marginBottom:14,border:`2px solid ${OR}30`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <div style={{background:`${OR}18`,borderRadius:10,padding:"6px 10px",fontSize:18}}>✍️</div>
            <div>
              <div style={{fontWeight:600,color:BD,fontSize:15}}>Dejar una reseña</div>
              <div style={{fontSize:11,color:"#8a99b0"}}>🔒 Completamente anónima</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {CRIT.map(c=>(
              <div key={c} style={{background:form[c]>0?"#fff8f2":"#f7f9fc",border:`1.5px solid ${form[c]>0?OR+"40":"#e2eaf5"}`,borderRadius:12,padding:"10px 14px",transition:"all .2s"}}>
                <div style={{fontSize:12,color:"#6b7a90",marginBottom:5}}>{CRIT_ICON[c]} {CRIT_LABEL[c]}</div>
                <Stars value={form[c]} onChange={v=>setForm(prev=>({...prev,[c]:v}))} size={24} gap={3}/>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:12,color:"#6b7a90",display:"block",marginBottom:5}}>🎓 Tu carrera (opcional)</label>
              <select className="input" style={{padding:"9px 12px",fontSize:13}} value={form.carrera} onChange={e=>setForm(prev=>({...prev,carrera:e.target.value}))}>
                <option value="">Selecciona tu carrera</option>
                {(carreras[selProf.facultad]||[]).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:12,color:"#6b7a90",display:"block",marginBottom:5}}>📅 Tu ciclo (opcional)</label>
              <select className="input" style={{padding:"9px 12px",fontSize:13}} value={form.ciclo} onChange={e=>setForm(prev=>({...prev,ciclo:e.target.value}))}>
                <option value="">Selecciona tu ciclo</option>
                {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>Ciclo {n}</option>)}
              </select>
            </div>
          </div>
          <textarea className="textarea" value={form.texto} onChange={e=>setForm(prev=>({...prev,texto:e.target.value}))} placeholder="Escribe tu opinión libremente..."/>
          {formErr && <div style={{color:"#DC2626",fontSize:12,marginTop:10,background:"#fef2f2",padding:"8px 14px",borderRadius:10,border:"1px solid #fecaca"}}>{formErr}</div>}
          <button className="btn btn-orange" onClick={submitResena} style={{marginTop:14,width:"100%",padding:13,fontSize:15}}>Publicar reseña anónima</button>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{fontSize:16,fontWeight:700,color:BD}}>Reseñas ({allR.length})</h3>
          {allR.length>0 && <span style={{fontSize:12,color:"#8a99b0"}}>Más recientes primero</span>}
        </div>
        {allR.length===0 && <div className="card" style={{padding:40,textAlign:"center"}}><div style={{fontSize:40,marginBottom:10}}>📝</div><div style={{color:"#aaa",fontSize:14}}>¡Sé el primero en dejar una reseña!</div></div>}
        {allR.map((r,idx)=>{
          const rAvg = avg(CRIT.map(c=>r.criterios[c]));
          const fecha = r.createdAt?.toDate ? timeAgo(r.createdAt.toDate()) : timeAgo(r.createdAt);
          return (
            <div key={r.id} className="card fade-in" style={{padding:"16px 18px",marginBottom:10,animationDelay:`${idx*.05}s`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"#edf1f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎓</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#1a2540"}}>Estudiante anónimo</div>
                    <div style={{fontSize:11,color:"#a0adb8",display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span>{fecha}</span>
                      {r.carrera && <span>· 🎓 {r.carrera}</span>}
                      {r.ciclo && <span>· 📅 Ciclo {r.ciclo}</span>}
                    </div>
                  </div>
                </div>
                <span style={{background:`${ratingColor(rAvg)}18`,color:ratingColor(rAvg),fontWeight:700,fontSize:14,padding:"4px 12px",borderRadius:10}}>★ {rAvg.toFixed(1)}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {CRIT.map(c=><span key={c} style={{background:"#f3f6fb",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#5a6a80"}}>{CRIT_ICON[c]} {CRIT_LABEL[c]}: <strong style={{color:ratingColor(r.criterios[c])}}>{r.criterios[c]}</strong></span>)}
              </div>
              <p style={{fontSize:14,color:"#2d3a50",lineHeight:1.7}}>{r.texto}</p>
              <Divider/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#8a99b0"}}>¿Te fue útil?</span>
                <button className="util-btn" onClick={()=>toggleUtil(selProf.id,r.id,"util")}>👍 {r.util||0}</button>
                <button className="util-btn" onClick={()=>toggleUtil(selProf.id,r.id,"noUtil")}>👎 {r.noUtil||0}</button>
                <button className="util-btn" 
                  onClick={()=>reportarResena(selProf.id, r.id, r.texto, selProf.nombre)}
                  style={{marginLeft:"auto",color:"#DC2626",borderColor:"#fecaca",opacity:reportes.some(x=>x.resId===r.id)?0.5:1}}
                  disabled={reportes.some(x=>x.resId===r.id)}>
                  🚨 {reportes.some(x=>x.resId===r.id)?"Reportada":"Reportar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );

  if(page==="admin") return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#eef2f9"}}>
      <style>{css}</style><Header/>
      {!adminAuth ? (
        <div style={{maxWidth:400,margin:"80px auto",padding:"0 16px"}}>
          <div className="card" style={{padding:32,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🔐</div>
            <h2 style={{fontSize:20,fontWeight:700,color:BD,marginBottom:4}}>Panel de administrador</h2>
            <p style={{fontSize:13,color:"#8a99b0",marginBottom:24}}>Acceso restringido</p>
            <input className="input" type="password" value={adminPass}
              onChange={e=>setAdminPass(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){if(adminPass===ADMIN_PASS){setAdminAuth(true);setAdminPass("");}else showToast("❌ Contraseña incorrecta.");}}}
              placeholder="Contraseña" style={{marginBottom:12}}/>
            <button className="btn btn-blue" style={{width:"100%",padding:13}} onClick={()=>{
              if(adminPass===ADMIN_PASS){setAdminAuth(true);setAdminPass("");}
              else showToast("❌ Contraseña incorrecta.");
            }}>Ingresar</button>
          </div>
        </div>
      ) : (
        <div style={{maxWidth:780,margin:"0 auto",padding:"28px 16px 48px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:BD}}>⚙️ Panel de administrador</h2>
              <p style={{fontSize:13,color:"#8a99b0"}}>Gestiona profesores y reseñas</p>
            </div>
            <button className="btn btn-ghost" style={{fontSize:13}} onClick={()=>{setAdminAuth(false);navigate("home");}}>Cerrar sesión</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
            {[{label:"Profesores",n:profesores.length,icon:"👨‍🏫",color:B},{label:"Reseñas totales",n:Object.values(resenas).flat().length,icon:"💬",color:OR},{label:"Facultades",n:FACULTADES.length-1,icon:"🏫",color:"#059669"}].map(s=>(
              <div key={s.label} className="card" style={{padding:"16px 20px",borderLeft:`4px solid ${s.color}`}}>
                <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:26,fontWeight:700,color:s.color}}>{s.n}</div>
                <div style={{fontSize:12,color:"#8a99b0"}}>{s.label}</div>
              </div>
            ))}
          </div>
          <h3 style={{fontSize:16,fontWeight:700,color:BD,marginBottom:12}}>Profesores registrados</h3>
          <div className="card" style={{padding:"4px 0",marginBottom:20}}>
            {profesores.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid #edf1f7":"none"}}>
                <Avatar name={p.nombre} fac={p.facultad} size={38}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:"#8a99b0"}}>{p.facultad} · {(p.cursos||[]).join(", ")} · {p.totalReseñas||0} reseñas</div>
                </div>
                <RatingChip r={p.rating}/>
                <button className="btn btn-red" style={{fontSize:12,padding:"5px 12px",flexShrink:0}} onClick={()=>eliminarProfesor(p)}>🗑️ Eliminar</button>
              </div>
            ))}
          </div>
          {reportes.length>0 && <>
            <h3 style={{fontSize:16,fontWeight:700,color:"#DC2626",marginBottom:12}}>
              🚨 Reseñas reportadas ({reportes.length})
            </h3>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {reportes.map(rep=>{
                const prof = profesores.find(p=>p.id===rep.profId);
                const resena = (resenas[rep.profId]||[]).find(r=>r.id===rep.resId);
                return(
                  <div key={rep.id} className="card" style={{padding:"14px 18px",border:"1.5px solid #fecaca"}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:"#DC2626",fontWeight:600,marginBottom:4}}>
                          🚨 Reseña reportada · {prof?.nombre||"Profesor eliminado"}
                        </div>
                        <p style={{fontSize:13,color:"#2d3a50",lineHeight:1.6}}>{rep.texto}</p>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                        <button className="btn btn-red" style={{fontSize:12,padding:"5px 12px"}}
                          onClick={async()=>{
                            if(resena) await eliminarResena(prof, resena);
                            await deleteDoc(doc(db,"reportes",rep.id));
                            showToast("🗑️ Reseña eliminada.");
                          }}>
                          🗑️ Eliminar reseña
                        </button>
                        <button className="btn btn-ghost" style={{fontSize:12,padding:"5px 12px"}}
                          onClick={async()=>{
                            await deleteDoc(doc(db,"reportes",rep.id));
                            showToast("✅ Reporte descartado.");
                          }}>
                          Ignorar reporte
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}
          <h3 style={{fontSize:16,fontWeight:700,color:BD,marginBottom:12}}>Reseñas recientes</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {profesores.flatMap(p=>(resenas[p.id]||[]).map(r=>{
              const rAvg = avg(CRIT.map(c=>r.criterios[c]));
              return (
                <div key={r.id} className="card" style={{padding:"14px 18px",display:"flex",gap:12,alignItems:"flex-start"}}>
                  <Avatar name={p.nombre} fac={p.facultad} size={36}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{p.nombre}</span>
                      <span style={{background:`${ratingColor(rAvg)}18`,color:ratingColor(rAvg),fontWeight:700,fontSize:12,padding:"2px 8px",borderRadius:8}}>★ {rAvg.toFixed(1)}</span>
                      {r.carrera && <span style={{fontSize:11,color:"#8a99b0"}}>🎓 {r.carrera}</span>}
                      {r.ciclo && <span style={{fontSize:11,color:"#8a99b0"}}>Ciclo {r.ciclo}</span>}
                    </div>
                    <p style={{fontSize:13,color:"#2d3a50",lineHeight:1.6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.texto}</p>
                  </div>
                  <button className="btn btn-red" style={{fontSize:12,padding:"5px 12px",flexShrink:0}} onClick={()=>eliminarResena(p,r)}>🗑️</button>
                </div>
              );
            }))}
          </div>
        </div>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );

  return null;
}