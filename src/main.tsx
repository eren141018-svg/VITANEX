import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
function App(){return <main className="app"><header><span className="logo">♡</span><div><strong>VITANEX</strong><small>Tu salud, siempre a tiempo</small></div></header><section className="welcome"><p>Aplicación Android</p><h1>VITANEX está tomando forma</h1><span>Base independiente preparada para medicamentos, alarmas y notificaciones.</span></section><section className="dose"><small>Próxima dosis</small><h2>Sin medicamentos</h2><p>En el siguiente paso migraremos tu panel completo.</p><button>Agregar medicamento</button></section><nav><b>Inicio</b><span>Medicinas</span><span>Historial</span><span>Pastillero</span><span>Perfil</span></nav></main>}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
