import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Preferences } from "@capacitor/preferences";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Bell, Check, HeartPulse, History, Home, PackageOpen, Pencil, Pill, Plus, Trash2, UserRound, X } from "lucide-react";
import "./styles.css";

type Tab = "inicio" | "medicinas" | "historial" | "pastillero" | "perfil";
type Medicine = { id: string; name: string; dose: string; startTime: string; intervalHours: number; stock: number; alertAt: number; createdAt?: string };
type FormData = Omit<Medicine, "id">;
type DoseEvent = { id: string; medicineId: string; medicineName: string; dose: string; scheduledAt: string; takenAt: string };
type ScheduledDose = { medicine: Medicine; date: Date };
const MEDICINES_KEY = "vitanex_medicines_v1";
const EVENTS_KEY = "vitanex_dose_events_v1";
const blankForm: FormData = { name: "", dose: "", startTime: "08:00", intervalHours: 8, stock: 10, alertAt: 2 };

const navItems = [
  { id: "inicio" as Tab, icon: Home, label: "Inicio" },
  { id: "medicinas" as Tab, icon: Pill, label: "Medicinas" },
  { id: "historial" as Tab, icon: History, label: "Historial" },
  { id: "pastillero" as Tab, icon: PackageOpen, label: "Pastillero" },
  { id: "perfil" as Tab, icon: UserRound, label: "Perfil" },
];

function slotKey(medicineId: string, date: Date) { return medicineId + "_" + date.toISOString().slice(0,16); }
function timeLabel(date: Date) { return date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false }); }
function getCurrentSlot(medicine: Medicine, now = new Date()) {
  const [hours, minutes] = medicine.startTime.split(":").map(Number);
  const start = new Date(now); start.setHours(hours, minutes, 0, 0);
  if (now < start) return start;
  const intervalMs = medicine.intervalHours * 3600000;
  return new Date(start.getTime() + Math.floor((now.getTime() - start.getTime()) / intervalMs) * intervalMs);
}
function getNextUnconfirmed(medicine: Medicine, events: DoseEvent[], now = new Date()) {
  let date = getCurrentSlot(medicine, now);
  if (date.getTime() < now.getTime() - medicine.intervalHours * 3600000) date = new Date(date.getTime() + medicine.intervalHours * 3600000);
  for (let tries=0; tries<48; tries++) {
    const id = slotKey(medicine.id, date);
    if (!events.some(event => event.id === id)) return date;
    date = new Date(date.getTime() + medicine.intervalHours * 3600000);
  }
  return date;
}
function getNextGroup(medicines: Medicine[], events: DoseEvent[], now = new Date()) {
  const doses = medicines.filter(m => m.stock > 0).map(medicine => ({ medicine, date: getNextUnconfirmed(medicine, events, now) })).sort((a,b) => a.date.getTime() - b.date.getTime());
  if (!doses.length) return [] as ScheduledDose[];
  const firstMinute = Math.floor(doses[0].date.getTime() / 60000);
  return doses.filter(item => Math.floor(item.date.getTime() / 60000) === firstMinute);
}
function playVitanexTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    [0, .18, .36].forEach((delay,index) => {
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = [659,784,988][index];
      gain.gain.setValueAtTime(.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(.18, ctx.currentTime + delay + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + .15);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + delay); oscillator.stop(ctx.currentTime + delay + .17);
    });
  } catch {}
}

function Header() {
  return <header className="topbar"><div className="brand-heart"><HeartPulse /></div><div className="brand"><strong>VITANEX</strong><small>Tu salud, siempre a tiempo</small></div><button className="bell" aria-label="Notificaciones"><Bell /></button></header>;
}

function HomeView({ medicines, events, onAdd, onConfirm }: { medicines: Medicine[]; events: DoseEvent[]; onAdd: () => void; onConfirm: (group: ScheduledDose[]) => void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 15000); return () => window.clearInterval(timer); }, []);
  const today = new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const group = useMemo(() => getNextGroup(medicines, events, now), [medicines, events, now]);
  const scheduled = group[0]?.date;
  const active = scheduled ? now.getTime() >= scheduled.getTime() - 5 * 60000 : false;
  const minutes = scheduled ? Math.max(0, Math.ceil((scheduled.getTime() - now.getTime()) / 60000)) : 0;
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const confirmedThisWeek = events.filter(event => new Date(event.scheduledAt) >= weekStart).length;
  const expectedThisWeek = medicines.reduce((total, medicine) => {
    const created = medicine.createdAt ? new Date(medicine.createdAt) : now;
    const trackingStart = created > weekStart ? created : weekStart;
    const elapsedHours = Math.max(0, (now.getTime() - trackingStart.getTime()) / 3600000);
    return total + Math.floor(elapsedHours / medicine.intervalHours);
  }, 0);
  const weeklyPercent = expectedThisWeek ? Math.min(100, Math.round(confirmedThisWeek / expectedThisWeek * 100)) : 0;
  return <section className="screen home">
    <p className="eyebrow date">{today.charAt(0).toUpperCase() + today.slice(1)}</p><h1>Buenas noches, Randy</h1><p className="lead">Tienes tu salud organizada para hoy.</p><span className="status-pill">Pastillero disponible muy pronto</span>
    <button className="sos"><span className="sos-icon">△</span><span><strong>SOS · Me siento mal</strong><small>Llama al 911 o avisa a tu contacto de emergencia</small></span><b>›</b></button>
    <article className="dose-card">
      <div className="dose-art"><i></i><i></i><span>♥</span></div><p>◷ &nbsp; Próxima dosis</p>
      {group.length ? <>
        <h2>{timeLabel(group[0].date)}</h2>
        <div className="due-medicines">{group.map(item => <div key={item.medicine.id}><h3>{item.medicine.name}</h3><span>{item.medicine.dose}</span></div>)}</div>
        <button className={active ? "confirm-dose active" : "confirm-dose"} disabled={!active} onClick={() => onConfirm(group)}><Check />{active ? (group.length > 1 ? "Ya me las tomé" : "Ya me la tomé") : `Disponible en ${minutes} min`}</button>
        <small>{active ? "Confirma únicamente después de tomar la dosis." : "El botón se activa cinco minutos antes."}</small>
      </> : <>
        <h2>Sin medicamentos</h2><span>Agrega tu primer medicamento para calcular los horarios.</span><button onClick={onAdd}><Plus /> Agregar medicamento</button><small>VITANEX organiza recordatorios; no determina indicaciones médicas.</small>
      </>}
    </article>
    <article className="progress-card"><div><p>Cumplimiento semanal</p><strong>{weeklyPercent}%</strong></div><HeartPulse /><div className="weekly-track"><i style={{ width: weeklyPercent + "%" }} /></div><small>{medicines.length ? confirmedThisWeek + " dosis confirmadas durante los últimos 7 días." : "Agrega un medicamento para comenzar."}</small></article>
  </section>;
}

function MedicineModal({ editing, onClose, onSave }: { editing: Medicine | null; onClose: () => void; onSave: (data: FormData) => void }) {
  const [form, setForm] = useState<FormData>(editing ? { name: editing.name, dose: editing.dose, startTime: editing.startTime, intervalHours: editing.intervalHours, stock: editing.stock, alertAt: editing.alertAt } : blankForm);
  const set = (key: keyof FormData, value: string | number) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (form.name.trim() && form.dose.trim()) onSave(form); };
  const previews = useMemo(() => { const temp: Medicine = { ...form, id: "preview" }; const first = getCurrentSlot(temp); if (first < new Date()) first.setHours(first.getHours() + form.intervalHours); return [0,1,2].map(index => { const d = new Date(first); d.setHours(d.getHours() + index * form.intervalHours); return timeLabel(d); }); }, [form]);
  return <div className="modal-backdrop"><form className="medicine-modal" onSubmit={submit}>
    <div className="modal-head"><div><p className="eyebrow">{editing ? "Actualizar tratamiento" : "Nuevo tratamiento"}</p><h2>{editing ? "Editar medicamento" : "Agregar medicamento"}</h2></div><button type="button" className="close" onClick={onClose}><X /></button></div>
    <label>Medicamento<input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej. Paracetamol" required /></label>
    <label>Dosis prescrita<input value={form.dose} onChange={e => set("dose", e.target.value)} placeholder="Ej. 500 mg · 1 tableta" required /></label>
    <div className="field-grid"><label>Hora de comienzo<input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} required /></label><label>Frecuencia<select value={form.intervalHours} onChange={e => set("intervalHours", Number(e.target.value))}>{[1,2,3,4,5,6,8,12,24].map(h => <option key={h} value={h}>Cada {h} {h === 1 ? "hora" : "horas"}</option>)}</select></label><label>Pastillas disponibles<input type="number" min="0" value={form.stock} onChange={e => set("stock", Number(e.target.value))} /></label><label>Avisar cuando queden<input type="number" min="0" value={form.alertAt} onChange={e => set("alertAt", Number(e.target.value))} /></label></div>
    <div className="schedule-preview"><strong>Próximos horarios</strong><div>{previews.map((time,index) => <span key={index}>{index === 0 ? "Siguiente: " : ""}{time}</span>)}</div></div>
    <p className="medical-note">Usa el horario y la frecuencia indicados en tu receta. VITANEX no prescribe medicamentos.</p><button className="save" type="submit">{editing ? "Guardar cambios" : "Guardar medicamento"}</button>
  </form></div>;
}

function MedicinesView({ medicines, onAdd, onEdit, onDelete }: { medicines: Medicine[]; onAdd: () => void; onEdit: (m: Medicine) => void; onDelete: (m: Medicine) => void }) {
  return <section className="screen medicines-screen"><div className="page-title"><div><p className="eyebrow">Mi tratamiento</p><h1>Medicamentos</h1></div><button onClick={onAdd}><Plus /> Agregar</button></div>
    {!medicines.length ? <article className="empty-card"><span className="empty-icon"><Pill /></span><h2>Comienza tu tratamiento</h2><p>Aún no tienes medicamentos registrados.</p><button onClick={onAdd}><Plus /> Agregar medicamento</button></article> :
    <div className="medicine-list">{medicines.map(m => <article className="medicine-item" key={m.id}><div className="medicine-icon"><Pill /></div><div className="medicine-info"><h2>{m.name}</h2><p>{m.dose}</p><strong>Cada {m.intervalHours} horas</strong><span>Comienzo: {m.startTime}</span><small className={m.stock <= m.alertAt ? "stock low" : "stock"}>{m.stock} pastillas disponibles{m.stock <= m.alertAt ? " · Reposición necesaria" : ""}</small></div><div className="item-actions"><button onClick={() => onEdit(m)}><Pencil /></button><button className="delete" onClick={() => onDelete(m)}><Trash2 /></button></div></article>)}</div>}
    <p className="medical-footer">VITANEX organiza recordatorios. No cambia dosis ni reemplaza indicaciones profesionales.</p></section>;
}

function HistoryView({ events }: { events: DoseEvent[] }) {
  const ordered = [...events].sort((a,b) => b.takenAt.localeCompare(a.takenAt));
  return <section className="screen"><p className="eyebrow">Tu progreso</p><h1>Historial</h1>{!ordered.length ? <article className="empty-card"><span className="empty-icon"><History /></span><h2>Sin dosis confirmadas</h2><p>Cuando confirmes una dosis aparecerá aquí.</p></article> : <div className="history-list">{ordered.map(event => <article key={event.id}><span className="history-check"><Check /></span><div><strong>{event.medicineName}</strong><p>{event.dose}</p><small>Programada: {new Date(event.scheduledAt).toLocaleString("es-EC")} · Tomada: {new Date(event.takenAt).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"})}</small></div></article>)}</div>}</section>;
}
function SimpleView({ tab }: { tab: "pastillero" | "perfil" }) {
  const data = tab === "pastillero" ? ["Dispositivo físico","Pastillero VITANEX","La conexión con VITANEX Box estará disponible muy pronto.",PackageOpen] as const : ["Tu cuenta","Perfil","Próximamente podrás guardar y sincronizar tus datos.",UserRound] as const;
  const [eyebrow,title,text,Icon]=data; return <section className="screen simple"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><article className="empty-card"><span className="empty-icon"><Icon /></span><h2>Estamos preparando esta sección</h2><p>{text}</p></article></section>;
}

function App() {
  const [tab,setTab]=useState<Tab>("inicio"); const [medicines,setMedicines]=useState<Medicine[]>([]); const [events,setEvents]=useState<DoseEvent[]>([]); const [loaded,setLoaded]=useState(false); const [modal,setModal]=useState(false); const [editing,setEditing]=useState<Medicine|null>(null);
  useEffect(() => { Promise.all([Preferences.get({key:MEDICINES_KEY}),Preferences.get({key:EVENTS_KEY})]).then(([m,e]) => { try{if(m.value)setMedicines(JSON.parse(m.value));}catch{} try{if(e.value)setEvents(JSON.parse(e.value));}catch{} setLoaded(true); }); LocalNotifications.requestPermissions().catch(()=>{}); },[]);
  useEffect(() => { if(loaded) Preferences.set({key:MEDICINES_KEY,value:JSON.stringify(medicines)}); },[medicines,loaded]);
  useEffect(() => { if(loaded) Preferences.set({key:EVENTS_KEY,value:JSON.stringify(events)}); },[events,loaded]);
  useEffect(() => {
    if(!loaded || !medicines.length) return;
    const group=getNextGroup(medicines,events); const notifications=group.filter(item=>item.date.getTime()>Date.now()).map((item,index)=>({id:Math.abs(Array.from(item.medicine.id).reduce((n,c)=>n+c.charCodeAt(0),1000))+index,title:"VITANEX · Hora de tu medicamento",body:`${item.medicine.name} · ${item.medicine.dose}`,schedule:{at:item.date},extra:{medicineId:item.medicine.id}}));
    if(notifications.length) LocalNotifications.schedule({notifications}).catch(()=>{});
  },[medicines,events,loaded]);
  const openAdd=()=>{setEditing(null);setModal(true);};
  const save=(data:FormData)=>{if(editing)setMedicines(items=>items.map(item=>item.id===editing.id?{...data,id:item.id}:item));else setMedicines(items=>[...items,{...data,id:crypto.randomUUID(),createdAt:new Date().toISOString()}]);setModal(false);setEditing(null);setTab("medicinas");};
  const remove=(m:Medicine)=>{if(window.confirm(`¿Eliminar ${m.name}?`))setMedicines(items=>items.filter(item=>item.id!==m.id));};
  const confirm=(group:ScheduledDose[])=>{const takenAt=new Date().toISOString();const additions=group.map(item=>({id:slotKey(item.medicine.id,item.date),medicineId:item.medicine.id,medicineName:item.medicine.name,dose:item.medicine.dose,scheduledAt:item.date.toISOString(),takenAt}));setEvents(items=>[...items,...additions.filter(a=>!items.some(e=>e.id===a.id))]);setMedicines(items=>items.map(m=>group.some(g=>g.medicine.id===m.id)?{...m,stock:Math.max(0,m.stock-1)}:m));playVitanexTone();};
  return <main className="app"><Header />{tab==="inicio"&&<HomeView medicines={medicines} events={events} onAdd={()=>{setTab("medicinas");openAdd();}} onConfirm={confirm}/>} {tab==="medicinas"&&<MedicinesView medicines={medicines} onAdd={openAdd} onEdit={m=>{setEditing(m);setModal(true);}} onDelete={remove}/>} {tab==="historial"&&<HistoryView events={events}/>} {(tab==="pastillero"||tab==="perfil")&&<SimpleView tab={tab}/>}<nav className="bottom-nav">{navItems.map(({id,icon:Icon,label})=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon/><small>{label}</small></button>)}</nav>{modal&&<MedicineModal editing={editing} onClose={()=>{setModal(false);setEditing(null);}} onSave={save}/>}</main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
