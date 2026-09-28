import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Preferences } from "@capacitor/preferences";
import { Bell, Check, HeartPulse, History, Home, PackageOpen, Pencil, Pill, Plus, Trash2, UserRound, X } from "lucide-react";
import "./styles.css";

type Tab = "inicio" | "medicinas" | "historial" | "pastillero" | "perfil";
type Medicine = { id: string; name: string; dose: string; startTime: string; intervalHours: number; stock: number; alertAt: number };
type FormData = Omit<Medicine, "id">;
const STORAGE_KEY = "vitanex_medicines_v1";
const blankForm: FormData = { name: "", dose: "", startTime: "08:00", intervalHours: 8, stock: 10, alertAt: 2 };

const navItems = [
  { id: "inicio" as Tab, icon: Home, label: "Inicio" },
  { id: "medicinas" as Tab, icon: Pill, label: "Medicinas" },
  { id: "historial" as Tab, icon: History, label: "Historial" },
  { id: "pastillero" as Tab, icon: PackageOpen, label: "Pastillero" },
  { id: "perfil" as Tab, icon: UserRound, label: "Perfil" },
];

function getNextDose(medicine: Medicine, now = new Date()) {
  const [hours, minutes] = medicine.startTime.split(":").map(Number);
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);
  while (candidate.getTime() < now.getTime()) candidate.setHours(candidate.getHours() + medicine.intervalHours);
  return candidate;
}
function timeLabel(date: Date) { return date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false }); }

function Header() {
  return <header className="topbar">
    <div className="brand-heart"><HeartPulse /></div>
    <div className="brand"><strong>VITANEX</strong><small>Tu salud, siempre a tiempo</small></div>
    <button className="bell" aria-label="Notificaciones"><Bell /></button>
  </header>;
}

function HomeView({ medicines, onAdd }: { medicines: Medicine[]; onAdd: () => void }) {
  const today = new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const next = useMemo(() => medicines.map(m => ({ medicine: m, date: getNextDose(m) })).sort((a,b) => a.date.getTime() - b.date.getTime())[0], [medicines]);
  return <section className="screen home">
    <p className="eyebrow date">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
    <h1>Buenas noches, Randy</h1>
    <p className="lead">Tienes tu salud organizada para hoy.</p>
    <span className="status-pill">Pastillero disponible muy pronto</span>
    <button className="sos"><span className="sos-icon">△</span><span><strong>SOS · Me siento mal</strong><small>Llama al 911 o avisa a tu contacto de emergencia</small></span><b>›</b></button>
    <article className="dose-card">
      <div className="dose-art"><i></i><i></i><span>♥</span></div>
      <p>◷ &nbsp; Próxima dosis</p>
      {next ? <>
        <h2>{timeLabel(next.date)}</h2>
        <h3>{next.medicine.name}</h3>
        <span>{next.medicine.dose} · Cada {next.medicine.intervalHours} horas</span>
        <button disabled><Check /> Disponible 5 minutos antes</button>
      </> : <>
        <h2>Sin medicamentos</h2>
        <span>Agrega tu primer medicamento para calcular los horarios.</span>
        <button onClick={onAdd}><Plus /> Agregar medicamento</button>
      </>}
      <small>VITANEX organiza recordatorios; no determina indicaciones médicas.</small>
    </article>
    <article className="progress-card"><div><p>Medicamentos activos</p><strong>{medicines.length}</strong></div><Pill /><small>{medicines.length ? "Tus tratamientos están guardados en este dispositivo." : "Agrega un medicamento para comenzar."}</small></article>
  </section>;
}

function MedicineModal({ editing, onClose, onSave }: { editing: Medicine | null; onClose: () => void; onSave: (data: FormData) => void }) {
  const [form, setForm] = useState<FormData>(editing ? { name: editing.name, dose: editing.dose, startTime: editing.startTime, intervalHours: editing.intervalHours, stock: editing.stock, alertAt: editing.alertAt } : blankForm);
  const set = (key: keyof FormData, value: string | number) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!form.name.trim() || !form.dose.trim()) return; onSave(form); };
  const previews = useMemo(() => {
    const temp: Medicine = { ...form, id: "preview" };
    const first = getNextDose(temp);
    return [0,1,2].map(index => { const d = new Date(first); d.setHours(d.getHours() + index * form.intervalHours); return timeLabel(d); });
  }, [form]);
  return <div className="modal-backdrop">
    <form className="medicine-modal" onSubmit={submit}>
      <div className="modal-head"><div><p className="eyebrow">{editing ? "Actualizar tratamiento" : "Nuevo tratamiento"}</p><h2>{editing ? "Editar medicamento" : "Agregar medicamento"}</h2></div><button type="button" className="close" onClick={onClose}><X /></button></div>
      <label>Medicamento<input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej. Paracetamol" required /></label>
      <label>Dosis prescrita<input value={form.dose} onChange={e => set("dose", e.target.value)} placeholder="Ej. 500 mg · 1 tableta" required /></label>
      <div className="field-grid">
        <label>Hora de comienzo<input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} required /></label>
        <label>Frecuencia<select value={form.intervalHours} onChange={e => set("intervalHours", Number(e.target.value))}>{[1,2,3,4,5,6,8,12,24].map(h => <option key={h} value={h}>Cada {h} {h === 1 ? "hora" : "horas"}</option>)}</select></label>
        <label>Pastillas disponibles<input type="number" min="0" value={form.stock} onChange={e => set("stock", Number(e.target.value))} /></label>
        <label>Avisar cuando queden<input type="number" min="0" value={form.alertAt} onChange={e => set("alertAt", Number(e.target.value))} /></label>
      </div>
      <div className="schedule-preview"><strong>Próximos horarios</strong><div>{previews.map((time,index) => <span key={time}>{index === 0 ? "Siguiente: " : ""}{time}</span>)}</div></div>
      <p className="medical-note">Usa exactamente el horario y la frecuencia indicados en tu receta. VITANEX no prescribe medicamentos.</p>
      <button className="save" type="submit">{editing ? "Guardar cambios" : "Guardar medicamento"}</button>
    </form>
  </div>;
}

function MedicinesView({ medicines, onAdd, onEdit, onDelete }: { medicines: Medicine[]; onAdd: () => void; onEdit: (m: Medicine) => void; onDelete: (m: Medicine) => void }) {
  return <section className="screen medicines-screen">
    <div className="page-title"><div><p className="eyebrow">Mi tratamiento</p><h1>Medicamentos</h1></div><button onClick={onAdd}><Plus /> Agregar</button></div>
    {medicines.length === 0 ? <article className="empty-card"><span className="empty-icon"><Pill /></span><h2>Comienza tu tratamiento</h2><p>Aún no tienes medicamentos registrados.</p><button onClick={onAdd}><Plus /> Agregar medicamento</button></article> :
      <div className="medicine-list">{medicines.map(medicine => {
        const low = medicine.stock <= medicine.alertAt;
        return <article className="medicine-item" key={medicine.id}>
          <div className="medicine-icon"><Pill /></div>
          <div className="medicine-info"><h2>{medicine.name}</h2><p>{medicine.dose}</p><strong>Cada {medicine.intervalHours} horas</strong><span>Comienzo: {medicine.startTime} · Siguiente: {timeLabel(getNextDose(medicine))}</span><small className={low ? "stock low" : "stock"}>{medicine.stock} pastillas disponibles{low ? " · Reposición necesaria" : ""}</small></div>
          <div className="item-actions"><button onClick={() => onEdit(medicine)} aria-label="Editar"><Pencil /></button><button className="delete" onClick={() => onDelete(medicine)} aria-label="Eliminar"><Trash2 /></button></div>
        </article>;
      })}</div>}
    <p className="medical-footer">VITANEX organiza recordatorios. No cambia dosis ni reemplaza las indicaciones de un profesional de salud.</p>
  </section>;
}

function SimpleView({ tab }: { tab: Exclude<Tab, "inicio" | "medicinas"> }) {
  const data = {
    historial: ["Tu progreso","Historial","Aquí aparecerán tus dosis confirmadas y pendientes.", History],
    pastillero: ["Dispositivo físico","Pastillero VITANEX","La conexión con VITANEX Box estará disponible muy pronto.", PackageOpen],
    perfil: ["Tu cuenta","Perfil","Próximamente podrás guardar y sincronizar tus datos.", UserRound],
  } as const;
  const [eyebrow,title,text,Icon] = data[tab];
  return <section className="screen simple"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><article className="empty-card"><span className="empty-icon"><Icon /></span><h2>Estamos preparando esta sección</h2><p>{text}</p>{tab === "perfil" && <p className="coming-soon">El tutorial completo se habilitará cuando terminemos la aplicación.</p>}</article></section>;
}

function App() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);

  useEffect(() => { Preferences.get({ key: STORAGE_KEY }).then(({ value }) => { if (value) { try { setMedicines(JSON.parse(value)); } catch {} } setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(medicines) }); }, [medicines, loaded]);

  const openAdd = () => { setEditing(null); setModal(true); };
  const save = (data: FormData) => {
    if (editing) setMedicines(items => items.map(item => item.id === editing.id ? { ...data, id: item.id } : item));
    else setMedicines(items => [...items, { ...data, id: crypto.randomUUID() }]);
    setModal(false); setEditing(null); setTab("medicinas");
  };
  const remove = (medicine: Medicine) => {
    if (window.confirm(`¿Eliminar ${medicine.name}? Esta acción no se puede deshacer.`)) setMedicines(items => items.filter(item => item.id !== medicine.id));
  };

  return <main className="app">
    <Header />
    {tab === "inicio" && <HomeView medicines={medicines} onAdd={() => { setTab("medicinas"); openAdd(); }} />}
    {tab === "medicinas" && <MedicinesView medicines={medicines} onAdd={openAdd} onEdit={m => { setEditing(m); setModal(true); }} onDelete={remove} />}
    {(tab === "historial" || tab === "pastillero" || tab === "perfil") && <SimpleView tab={tab} />}
    <nav className="bottom-nav">{navItems.map(({ id, icon: Icon, label }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon /><small>{label}</small></button>)}</nav>
    {modal && <MedicineModal editing={editing} onClose={() => { setModal(false); setEditing(null); }} onSave={save} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
