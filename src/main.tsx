import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Preferences } from "@capacitor/preferences";
import "./styles.css";

type Tab = "inicio" | "medicinas" | "historial" | "pastillero" | "perfil";

const navItems: { id: Tab; icon: string; label: string }[] = [
  { id: "inicio", icon: "⌂", label: "Inicio" },
  { id: "medicinas", icon: "◒", label: "Medicinas" },
  { id: "historial", icon: "↶", label: "Historial" },
  { id: "pastillero", icon: "⌁", label: "Pastillero" },
  { id: "perfil", icon: "◎", label: "Perfil" },
];

const tutorialSteps = [
  { title: "Bienvenido a VITANEX", text: "Te ayudaremos a organizar tus medicamentos y recordar cada dosis.", target: "Inicio" },
  { title: "Tus medicamentos", text: "Aquí podrás agregar, editar y eliminar los medicamentos indicados por tu profesional de salud.", target: "Medicinas" },
  { title: "Confirma cada dosis", text: "El botón se activará cinco minutos antes de la hora programada.", target: "Inicio" },
  { title: "Consulta tu progreso", text: "En Historial verás las dosis confirmadas, pendientes y omitidas.", target: "Historial" },
  { title: "Siempre podrás repetirlo", text: "Encontrarás este tutorial nuevamente dentro de Perfil.", target: "Perfil" },
];

function Header() {
  return <header className="topbar">
    <div className="brand-heart" aria-hidden="true">♥</div>
    <div className="brand"><strong>VITANEX</strong><small>Tu salud, siempre a tiempo</small></div>
    <button className="bell" aria-label="Notificaciones">♧</button>
  </header>;
}

function Home({ goMedicines }: { goMedicines: () => void }) {
  const today = new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <section className="screen home">
    <p className="eyebrow date">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
    <h1>Buenas noches, Randy</h1>
    <p className="lead">Tienes tu salud organizada para hoy.</p>
    <span className="status-pill">Pastillero disponible muy pronto</span>

    <button className="sos">
      <span className="sos-icon">△</span>
      <span><strong>SOS · Me siento mal</strong><small>Llama al 911 o avisa a tu contacto de emergencia</small></span>
      <b>›</b>
    </button>

    <article className="dose-card">
      <div className="dose-art"><i></i><i></i><span>♥</span></div>
      <p>◷ &nbsp; Próxima dosis</p>
      <h2>Sin medicamentos</h2>
      <span>Agrega tu primer medicamento para calcular los horarios.</span>
      <button onClick={goMedicines}>＋ Agregar medicamento</button>
      <small>VITANEX organiza recordatorios; no determina indicaciones médicas.</small>
    </article>

    <article className="progress-card">
      <div><p>Cumplimiento semanal</p><strong>—</strong></div>
      <span>♢</span>
      <small>Tu progreso aparecerá cuando confirmes la primera dosis.</small>
    </article>
  </section>;
}

function EmptyScreen({ tab, openTutorial }: { tab: Tab; openTutorial: () => void }) {
  const data: Record<Exclude<Tab, "inicio">, { eyebrow: string; title: string; icon: string; text: string }> = {
    medicinas: { eyebrow: "Mi tratamiento", title: "Medicamentos", icon: "◒", text: "Aún no tienes medicamentos registrados." },
    historial: { eyebrow: "Tu progreso", title: "Historial", icon: "↶", text: "Aquí aparecerán tus dosis confirmadas y pendientes." },
    pastillero: { eyebrow: "Dispositivo físico", title: "Pastillero VITANEX", icon: "⌁", text: "La conexión con VITANEX Box estará disponible muy pronto." },
    perfil: { eyebrow: "Tu cuenta", title: "Perfil", icon: "◎", text: "Próximamente podrás guardar y sincronizar tus datos." },
  };
  const info = data[tab as Exclude<Tab, "inicio">];
  return <section className="screen simple">
    <p className="eyebrow">{info.eyebrow}</p>
    <h1>{info.title}</h1>
    <article className="empty-card">
      <span className="empty-icon">{info.icon}</span>
      <h2>{tab === "medicinas" ? "Comienza tu tratamiento" : "Estamos preparando esta sección"}</h2>
      <p>{info.text}</p>
      {tab === "medicinas" && <button>＋ Agregar medicamento</button>}
      {tab === "perfil" && <button onClick={openTutorial}>Ver tutorial nuevamente</button>}
    </article>
  </section>;
}

function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const item = tutorialSteps[step];
  const finish = async () => {
    await Preferences.set({ key: "vitanex_tutorial_seen", value: "true" });
    onClose();
  };
  return <div className="tutorial-backdrop" role="dialog" aria-modal="true">
    <div className="tutorial-card">
      <div className="tutorial-mark">♥</div>
      <span className="tutorial-count">{step + 1} de {tutorialSteps.length}</span>
      <h2>{item.title}</h2>
      <p>{item.text}</p>
      <div className="tutorial-target">→ {item.target}</div>
      <div className="dots">{tutorialSteps.map((_, index) => <i key={index} className={index === step ? "active" : ""}></i>)}</div>
      <div className="tutorial-actions">
        <button className="ghost" onClick={finish}>Omitir</button>
        {step > 0 && <button className="ghost" onClick={() => setStep(step - 1)}>Atrás</button>}
        <button className="primary" onClick={() => step === tutorialSteps.length - 1 ? finish() : setStep(step + 1)}>
          {step === tutorialSteps.length - 1 ? "Comenzar" : "Siguiente"}
        </button>
      </div>
    </div>
  </div>;
}

function App() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [tutorial, setTutorial] = useState(false);

  useEffect(() => {
    Preferences.get({ key: "vitanex_tutorial_seen" }).then(({ value }) => {
      if (value !== "true") setTutorial(true);
    });
  }, []);

  return <main className="app">
    <Header />
    {tab === "inicio" ? <Home goMedicines={() => setTab("medicinas")} /> : <EmptyScreen tab={tab} openTutorial={() => setTutorial(true)} />}
    <nav className="bottom-nav">
      {navItems.map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
        <span>{item.icon}</span><small>{item.label}</small>
      </button>)}
    </nav>
    {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
  </main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
