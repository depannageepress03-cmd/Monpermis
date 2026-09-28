import { useMemo, useRef, useState } from "react";

/*
  Monpermis.bj — Connexion + Question du jour
  Charte : bleu nuit #0E1A3D · vert #4CAF50 → #3E8E47 · jaune #F4B400 · blanc

  Props
    logo       chemin du logo (défaut /logo.png, masqué proprement s'il est introuvable)
    onSubmit   async ({ phone, password }) — lance une Error("message") pour afficher un message
    onGoogle   () => void
    questions  ta propre banque de questions (même format que QUESTIONS plus bas)
    proof      texte de preuve sociale optionnel, ex. "Plus de 2 000 candidats inscrits"
*/

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

.mp{--navy:#0E1A3D;--navy-2:#1B2A55;--green:#4CAF50;--green-l:#62CC6E;--green-d:#3E8E47;--green-t:#2B7F37;
  --yellow:#F4B400;--red:#D64545;--red-t:#C23A3A;--white:#FFFFFF;--bg:#F7F9FC;--field:#EEF3FC;--line:#E2E8F2;--muted:#5B6781;
  display:grid;grid-template-columns:minmax(0,1.15fr) 56px minmax(440px,1fr);grid-template-rows:auto 1fr auto;
  min-height:100vh;min-height:100dvh;background:var(--bg);color:var(--navy);
  font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.mp *,.mp *::before,.mp *::after{box-sizing:border-box}
.mp p{margin:0}
.mp::before{content:"";grid-column:1;grid-row:1/-1;background:
  radial-gradient(640px 460px at 55% 50%,rgba(76,175,80,.16),transparent 65%),
  radial-gradient(520px 380px at 0% 100%,rgba(244,180,0,.10),transparent 60%),
  linear-gradient(160deg,#16275A 0%,var(--navy) 58%,#0A1430 100%)}
.mp .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.mp :focus-visible{outline:2px solid var(--green-d);outline-offset:3px}

/* ---------- Colonne bleu nuit ---------- */
.mp-head,.mp-left,.mp-foot{grid-column:1;position:relative;z-index:1;justify-self:center;
  width:min(560px,calc(100% - 96px));color:var(--white)}
.mp-head{grid-row:1;padding-top:40px;display:flex;align-items:center;gap:14px}
.mp-head img{width:52px;height:52px;border-radius:50%;background:var(--white);padding:6px;object-fit:contain;
  box-shadow:0 8px 20px -8px rgba(0,0,0,.5)}
.mp-word{font:800 28px/1 Poppins,sans-serif;letter-spacing:-.02em}
.mp-word b{color:var(--green)}
.mp-left{grid-row:2;align-self:center;padding:40px 0}
.mp-left h2{font:700 clamp(26px,2.4vw,34px)/1.2 Poppins,sans-serif;letter-spacing:-.02em;margin:0 0 28px;max-width:22ch}
.mp-foot{grid-row:3;padding-bottom:32px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
  gap:8px 24px;font-size:14px;color:rgba(255,255,255,.62)}
.mp-proof{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.88)}
.mp-proof svg{color:var(--green-l);flex:none}

/* ---------- Question du jour ---------- */
.mp-quiz{background:var(--white);color:var(--navy);border-radius:24px;padding:24px 24px 18px;
  box-shadow:0 30px 60px -24px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06);
  animation:mp-rise .7s cubic-bezier(.2,.8,.2,1) .15s both}
@keyframes mp-rise{from{opacity:0;translate:0 18px}}
.mp-quiz-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}
.mp-tag{display:inline-flex;align-items:center;height:30px;padding:0 14px;border-radius:999px;
  background:var(--yellow);color:var(--navy);font:600 13.5px Poppins,sans-serif}
.mp-date{font-size:13.5px;color:var(--muted)}
.mp-q{display:grid;grid-template-columns:88px 1fr;gap:20px;align-items:center;margin-bottom:20px}
.mp-sign{width:88px;height:88px;border-radius:20px;background:#F1F4F9;display:grid;place-items:center}
.mp-sign svg{width:66px;height:66px;filter:drop-shadow(0 4px 6px rgba(14,26,61,.2))}
.mp-q-text{font:600 18px/1.4 Poppins,sans-serif;letter-spacing:-.01em}
.mp-answers{display:grid;gap:10px}
.mp-ans{display:flex;align-items:center;gap:14px;width:100%;min-height:54px;padding:9px 16px 9px 9px;
  border-radius:14px;border:1.5px solid var(--line);background:var(--white);color:var(--navy);text-align:left;
  font:500 15.5px/1.35 Inter,sans-serif;cursor:pointer;
  transition:border-color .15s,background .15s,opacity .25s,transform .15s}
.mp-ans:not([aria-disabled]):hover{border-color:#B9C4D8;background:var(--bg)}
.mp-ans:not([aria-disabled]):active{transform:scale(.99)}
.mp-ans[aria-disabled]{cursor:default}
.mp-letter{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;
  background:var(--field);color:var(--navy);font:700 14px Poppins,sans-serif;transition:background .2s,color .2s}
.mp-ans.is-correct{border-color:var(--green);background:rgba(76,175,80,.08)}
.mp-ans.is-correct .mp-letter{background:var(--green);color:var(--white);animation:mp-pop .4s cubic-bezier(.2,1.6,.4,1)}
.mp-ans.is-wrong{border-color:var(--red);background:#FFF5F5;animation:mp-shake .4s ease}
.mp-ans.is-wrong .mp-letter{background:var(--red);color:var(--white)}
.mp-ans.is-dim{opacity:.5}
@keyframes mp-pop{from{scale:.5}}
@keyframes mp-shake{20%,60%{translate:-4px 0}40%,80%{translate:4px 0}}
.mp-collapse{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}
.mp-collapse.open{grid-template-rows:1fr}
.mp-collapse > div{overflow:hidden;min-height:0}
.mp-hint{padding:16px 0 6px;font-size:13.5px;color:var(--muted);text-align:center}
.mp-verdict{display:flex;align-items:center;gap:10px;padding-top:20px;margin-bottom:6px!important;
  font:700 16px/1.35 Poppins,sans-serif}
.mp-verdict.ok{color:var(--green-t)}
.mp-verdict.ko{color:var(--red-t)}
.mp-vicon{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:var(--white)}
.mp-verdict.ok .mp-vicon{background:var(--green)}
.mp-verdict.ko .mp-vicon{background:var(--red)}
.mp-expl{color:var(--muted);font-size:15px;line-height:1.55;padding-left:36px}
.mp-next{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;margin-top:18px;padding:18px 0 6px;border-top:1px solid var(--line)}
.mp-cta{height:46px;padding:0 22px;border:0;border-radius:999px;background:var(--navy);color:var(--white);
  font:600 15px Poppins,sans-serif;cursor:pointer;box-shadow:0 10px 20px -10px rgba(14,26,61,.6);
  transition:background .15s,transform .15s}
.mp-cta:hover{background:var(--navy-2);transform:translateY(-1px)}
.mp-next span{font-size:13.5px;color:var(--muted)}

/* ---------- Route + voiture rouge ---------- */
.mp-road{grid-column:2;grid-row:1/-1;position:relative;overflow:hidden;
  background:linear-gradient(90deg,#16244D,#1F3368 50%,#16244D);border-inline:3px solid rgba(255,255,255,.9)}
.mp-road::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:4px;transform:translateX(-50%);
  background:repeating-linear-gradient(180deg,var(--yellow) 0 30px,transparent 30px 54px)}
.mp-car{position:absolute;left:50%;top:-60px;width:26px;height:48px;margin-left:-13px;
  filter:drop-shadow(0 6px 6px rgba(0,0,0,.45));animation:mp-drive 7s cubic-bezier(.45,0,.55,1) infinite}
.mp-car svg{display:block;width:100%;height:100%}
@keyframes mp-drive{to{top:calc(100% + 12px)}}
@keyframes mp-drive-h{to{left:calc(100% + 30px)}}

/* ---------- Formulaire ---------- */
.mp-side{grid-column:3;grid-row:1/3;align-self:center;justify-self:center;width:100%;max-width:500px;padding:56px 40px 24px}
.mp-eyebrow{font:700 13px Poppins,sans-serif;letter-spacing:.14em;color:var(--green-t);margin-bottom:12px!important}
.mp-side h1{font:800 38px/1.1 Poppins,sans-serif;letter-spacing:-.025em;margin:0 0 12px}
.mp-sub{color:var(--muted);font-size:17px;line-height:1.55;margin-bottom:32px!important}

.mp-float{position:relative;isolation:isolate}
.mp-float::after{content:"";position:absolute;left:14%;right:14%;bottom:-10px;height:10px;border-radius:50%;z-index:-1;
  background:rgba(14,26,61,.18);filter:blur(6px);animation:mp-shadow 4.5s ease-in-out infinite}
.mp-float.green::after{background:rgba(76,175,80,.45)}
.mp-float.green::after,.mp-float.green .mp-pill{animation-delay:-2.2s}
@keyframes mp-shadow{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.85);opacity:.6}}

.mp-pill{position:relative;width:100%;height:56px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:12px;
  cursor:pointer;animation:mp-bob 4.5s ease-in-out infinite;
  transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,border-color .2s,background .2s}
.mp-pill:hover{transform:translateY(-3px)}
.mp-pill:hover,.mp-pill:focus-visible,.mp-pill:disabled{animation-play-state:paused}
.mp-pill:active{transform:translateY(0) scale(.99)}
@keyframes mp-bob{0%,100%{translate:0 0}50%{translate:0 -4px}}

.mp-google{background:var(--white);border:1px solid var(--line);color:var(--navy);font:500 16px Inter,sans-serif;
  box-shadow:0 1px 2px rgba(14,26,61,.06),0 8px 20px -12px rgba(14,26,61,.18)}
.mp-google:hover{border-color:#CBD5E4;box-shadow:0 2px 4px rgba(14,26,61,.06),0 14px 28px -12px rgba(14,26,61,.25)}

.mp-or{display:flex;align-items:center;gap:14px;margin:28px 0;color:var(--navy-2);font-weight:600;font-size:15px}
.mp-or::before,.mp-or::after{content:"";flex:1;height:1px;background:var(--line)}

.mp-field{margin-bottom:20px}
.mp-field label{display:block;font:600 15px Poppins,sans-serif;margin-bottom:8px}
.mp-input{display:flex;align-items:center;height:56px;border-radius:16px;background:var(--field);
  border:1.5px solid transparent;transition:border-color .2s,box-shadow .2s,background .2s}
.mp-input:focus-within{background:var(--white);border-color:var(--green);box-shadow:0 0 0 4px rgba(76,175,80,.15)}
.mp-input.err{border-color:var(--red);background:#FFF6F6}
.mp-input.err:focus-within{box-shadow:0 0 0 4px rgba(214,69,69,.12)}
.mp-input input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;padding:0 18px;
  font:500 17px Inter,sans-serif;color:var(--navy)}
.mp-input input::placeholder{color:#9AA5BA;font-weight:400}
.mp-prefix{display:flex;align-items:center;gap:8px;padding:0 14px 0 18px;height:50%;
  border-right:1px solid #D3DCEB;font-weight:600;font-size:15px;white-space:nowrap}
.mp-eye{border:0;background:none;padding:0 18px;height:100%;cursor:pointer;color:var(--muted);display:grid;place-items:center;border-radius:0 16px 16px 0}
.mp-eye:hover{color:var(--navy)}
.mp-input input:focus-visible{outline:none}
.mp-error{color:var(--red-t);font-size:13.5px;line-height:1.4;margin-top:8px!important}
.mp-caps{display:flex;align-items:center;gap:6px;color:#8A6100;font-size:13.5px;margin-top:8px!important}
.mp-forgot{display:block;width:max-content;margin:-4px 0 24px auto;font:600 15px Poppins,sans-serif;color:var(--navy-2);text-decoration:none}
.mp-forgot:hover{color:var(--green-t);text-decoration:underline;text-underline-offset:3px}
.mp-alert{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;margin-bottom:16px!important;
  background:#FFF4F4;border:1px solid #F5C2C2;color:var(--red-t);font-size:14px;line-height:1.45}

.mp-submit{overflow:hidden;border:0;color:var(--white);font:700 18px Poppins,sans-serif;
  background:linear-gradient(100deg,var(--green-l) 0%,var(--green) 50%,var(--green-d) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -3px 8px rgba(0,0,0,.12),0 16px 32px -12px rgba(76,175,80,.7)}
.mp-submit::before{content:"";position:absolute;left:10%;right:10%;top:4px;height:42%;border-radius:999px;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.45),rgba(255,255,255,0))}
.mp-submit::after{content:"";position:absolute;top:0;bottom:0;width:35%;left:-50%;transform:skewX(-20deg);
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent)}
.mp-submit:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -3px 8px rgba(0,0,0,.12),0 22px 40px -12px rgba(76,175,80,.85)}
.mp-submit:hover::after{left:120%;transition:left .8s ease}
.mp-submit:disabled{cursor:wait;transform:none;opacity:.85}
.mp-spin{width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4);border-top-color:var(--white);animation:mp-rot .8s linear infinite}
@keyframes mp-rot{to{rotate:360deg}}

.mp-signup{text-align:center;margin-top:36px!important;color:var(--muted);font-size:17px}
.mp-signup a{color:var(--green-t);font:700 17px Poppins,sans-serif;text-decoration:none;white-space:nowrap}
.mp-signup a:hover{text-decoration:underline;text-underline-offset:3px}

.mp-legal{grid-column:3;grid-row:3;justify-self:center;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 22px;padding:20px 40px 32px}
.mp-legal a{font-size:14px;color:var(--navy-2);text-decoration:underline;text-underline-offset:3px}
.mp-legal a:hover{color:var(--green-t)}

/* ---------- Tablette et mobile : connexion d'abord, question du jour ensuite ---------- */
@media (max-width:960px){
  .mp{grid-template-columns:minmax(0,1fr);grid-template-rows:none}
  .mp::before{grid-row:1}
  .mp::after{content:"";grid-column:1;grid-row:4/6;background:linear-gradient(180deg,var(--navy),#0A1430)}
  .mp-head,.mp-left,.mp-foot{width:min(560px,calc(100% - 40px))}
  .mp-head{grid-row:1;padding:18px 0}
  .mp-head img{width:40px;height:40px;padding:4px}
  .mp-word{font-size:22px}
  .mp-road{grid-column:1;grid-row:2;height:40px;border-inline:0;border-block:3px solid rgba(255,255,255,.9);
    background:linear-gradient(180deg,#16244D,#1F3368 50%,#16244D)}
  .mp-road::before{top:50%;bottom:auto;left:0;right:0;width:auto;height:4px;transform:translateY(-50%);
    background:repeating-linear-gradient(90deg,var(--yellow) 0 30px,transparent 30px 54px)}
  .mp-car{top:50%;left:-60px;margin:-24px 0 0;transform:rotate(-90deg);animation-name:mp-drive-h}
  .mp-side{grid-column:1;grid-row:3;padding:32px 20px 44px;max-width:520px}
  .mp-side h1{font-size:30px}
  .mp-sub{font-size:16px;margin-bottom:24px!important}
  .mp-signup,.mp-signup a{font-size:15.5px}
  .mp-left{grid-row:4;padding:40px 0 24px}
  .mp-left h2{font-size:24px;margin-bottom:20px}
  .mp-foot{grid-row:5;padding-bottom:28px}
  .mp-legal{grid-column:1;grid-row:6;padding:20px 20px 28px}
}
@media (max-width:420px){
  .mp-quiz{padding:18px 18px 14px;border-radius:20px}
  .mp-q{grid-template-columns:64px 1fr;gap:14px}
  .mp-sign{width:64px;height:64px;border-radius:16px}
  .mp-sign svg{width:48px;height:48px}
  .mp-q-text{font-size:16.5px}
  .mp-expl{padding-left:0}
}
@media (prefers-reduced-motion:reduce){
  .mp-car,.mp-pill,.mp-float::after,.mp-quiz,.mp-ans,.mp-letter{animation:none!important}
  .mp-collapse,.mp-submit:hover::after{transition:none}
}
`;

/* ---------- Panneaux (dessinés en SVG, aucun droit d'image) ---------- */
const S = (props) => <svg viewBox="0 0 100 100" aria-hidden="true" {...props} />;

const SignNoEntry = () => (
  <S><circle cx="50" cy="50" r="48" fill="#fff" /><circle cx="50" cy="50" r="45" fill="#D32F2F" />
    <rect x="20" y="42" width="60" height="16" rx="1.5" fill="#fff" /></S>
);
const SignGiveWay = () => (
  <S><polygon points="8,12 92,12 50,88" fill="#D32F2F" stroke="#D32F2F" strokeWidth="6" strokeLinejoin="round" />
    <polygon points="24.8,22.1 75.2,22.1 50,67.7" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /></S>
);
const SignStop = () => (
  <S><polygon points="94.35,68.37 68.37,94.35 31.63,94.35 5.65,68.37 5.65,31.63 31.63,5.65 68.37,5.65 94.35,31.63" fill="#D32F2F" />
    <polygon points="90.65,66.84 66.84,90.65 33.16,90.65 9.35,66.84 9.35,33.16 33.16,9.35 66.84,9.35 90.65,33.16" fill="#fff" />
    <polygon points="87.88,65.69 65.69,87.88 34.31,87.88 12.12,65.69 12.12,34.31 34.31,12.12 65.69,12.12 87.88,34.31" fill="#D32F2F" />
    <text x="50" y="50" dy=".35em" textAnchor="middle" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="25" letterSpacing=".5">STOP</text></S>
);
const SignPriority = () => (
  <S><polygon points="50,2 98,50 50,98 2,50" fill="#2A2A2A" /><polygon points="50,5.5 94.5,50 50,94.5 5.5,50" fill="#fff" />
    <polygon points="50,16 84,50 50,84 16,50" fill="#F4B400" /></S>
);
const SignSpeed50 = () => (
  <S><circle cx="50" cy="50" r="48" fill="#D32F2F" /><circle cx="50" cy="50" r="37" fill="#fff" />
    <text x="50" y="50" dy=".35em" textAnchor="middle" fill="#111" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="36">50</text></S>
);
const SignTurnRight = () => (
  <S><circle cx="50" cy="50" r="48" fill="#fff" /><circle cx="50" cy="50" r="45" fill="#1565C0" />
    <path d="M35 77 V49 Q35 39 45 39 H55" fill="none" stroke="#fff" strokeWidth="11" strokeLinejoin="round" />
    <polygon points="53,24 73,39 53,54" fill="#fff" /></S>
);
const SignPedestrian = () => (
  <S><polygon points="50,8 94,84 6,84" fill="#D32F2F" stroke="#D32F2F" strokeWidth="8" strokeLinejoin="round" />
    <polygon points="50,23.2 80.8,76.4 19.2,76.4" fill="#fff" />
    <circle cx="50" cy="38" r="4" fill="#111" />
    <path d="M49.5 43 L47.5 56 M49 46.5 L43.5 52.5 M49 46.5 L55.5 51 M47.5 56 L42 66.5 M47.5 56 L54 66"
      fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {[33, 40.5, 48, 55.5, 63].map((x) => <rect key={x} x={x} y="68.5" width="4.5" height="3.5" fill="#111" />)}</S>
);
const SignAmberLight = () => (
  <S><rect x="30" y="3" width="40" height="94" rx="14" fill="#1E2A44" stroke="#2E3D63" strokeWidth="2" />
    <circle cx="50" cy="23" r="11" fill="#5B1E24" />
    <circle cx="50" cy="50" r="17" fill="#F4B400" opacity=".22" /><circle cx="50" cy="50" r="11" fill="#F4B400" />
    <circle cx="46" cy="46" r="3.5" fill="#fff" opacity=".55" />
    <circle cx="50" cy="77" r="11" fill="#1D4A2C" /></S>
);

/* ---------- Banque de questions (une par jour, en rotation) ---------- */
export const QUESTIONS = [
  { id: "sens-interdit", sign: <SignNoEntry />, alt: "Panneau rond rouge barré d'une bande blanche horizontale",
    question: "Que signifie ce panneau ?",
    answers: ["Stationnement interdit", "Sens interdit à tous les véhicules", "Route fermée pour travaux"], correct: 1,
    explanation: "Le disque rouge barré de blanc interdit l'accès à la voie, quel que soit le véhicule. Tu ne peux pas t'y engager." },
  { id: "cedez", sign: <SignGiveWay />, alt: "Panneau triangulaire pointe en bas, bordé de rouge",
    question: "À ce panneau, que dois-tu faire ?",
    answers: ["Céder le passage aux véhicules de droite et de gauche", "Marquer un arrêt complet dans tous les cas", "Continuer : tu es prioritaire"], correct: 0,
    explanation: "Le triangle pointe en bas t'oblige à céder le passage sur la route que tu abordes. Tu ralentis, et tu ne t'arrêtes que si un véhicule arrive." },
  { id: "stop", sign: <SignStop />, alt: "Panneau octogonal rouge portant l'inscription STOP",
    question: "Au panneau STOP, tu dois :",
    answers: ["Ralentir et passer si la voie est libre", "Klaxonner avant de t'engager", "T'arrêter complètement, puis céder le passage"], correct: 2,
    explanation: "Le STOP impose un arrêt total à la limite de la chaussée, même si la voie paraît libre. Tu repars seulement après avoir cédé le passage." },
  { id: "prioritaire", sign: <SignPriority />, alt: "Panneau en losange jaune bordé de blanc",
    question: "Ce panneau t'indique :",
    answers: ["Un danger à l'approche", "Que tu circules sur une route prioritaire", "La fin d'une zone de travaux"], correct: 1,
    explanation: "Le losange jaune signale une route prioritaire : aux intersections, les véhicules des routes qui la croisent doivent te céder le passage." },
  { id: "vitesse-50", sign: <SignSpeed50 />, alt: "Panneau rond bordé de rouge avec le nombre 50",
    question: "Ce panneau t'indique :",
    answers: ["Une vitesse conseillée de 50 km/h", "Une vitesse maximale de 50 km/h", "Un danger dans 50 mètres"], correct: 1,
    explanation: "Un disque bordé de rouge avec un nombre fixe la vitesse à ne pas dépasser. Ici, tu ne dois pas rouler à plus de 50 km/h." },
  { id: "obligation-droite", sign: <SignTurnRight />, alt: "Panneau rond bleu avec une flèche blanche qui tourne à droite",
    question: "Que t'impose ce panneau ?",
    answers: ["De tourner à droite", "De céder le passage aux véhicules venant de droite", "Rien : c'est une direction conseillée"], correct: 0,
    explanation: "Un panneau rond à fond bleu exprime une obligation. La flèche montre la seule direction autorisée : tu dois tourner à droite." },
  { id: "pietons", sign: <SignPedestrian />, alt: "Panneau triangulaire bordé de rouge montrant un piéton sur des bandes au sol",
    question: "Ce panneau t'annonce :",
    answers: ["Une rue réservée aux piétons", "Un trottoir interdit aux piétons", "Un passage pour piétons"], correct: 2,
    explanation: "Le triangle bordé de rouge signale un danger. Ici, un passage pour piétons approche : ralentis et prépare-toi à les laisser traverser." },
  { id: "feu-orange", sign: <SignAmberLight />, alt: "Feu tricolore allumé à l'orange",
    question: "Le feu passe à l'orange fixe. Tu dois :",
    answers: ["T'arrêter, sauf si l'arrêt est dangereux", "Accélérer pour passer avant le rouge", "Passer en klaxonnant"], correct: 0,
    explanation: "L'orange fixe impose l'arrêt, comme le rouge. Tu ne passes que si tu es déjà trop près du feu pour t'arrêter sans danger." },
];

/* ---------- Icônes ---------- */
const Check = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Cross = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
);
const Eye = ({ open }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!open && <path d="M3 3l18 18" />}
  </svg>
);
const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>
);
const Car = () => (
  <svg viewBox="0 0 26 48">
    <defs><linearGradient id="mpCarShine" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".3" stopColor="#fff" stopOpacity=".6" /><stop offset=".6" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
    <rect x="1" y="2" width="24" height="44" rx="8" fill="#E53935" />
    <rect x="1" y="2" width="24" height="44" rx="8" fill="url(#mpCarShine)" opacity=".5" />
    <path d="M5 32h16l-2 7H7z" fill="#0E1A3D" opacity=".85" /><path d="M6 12h14l2 8H4z" fill="#0E1A3D" opacity=".85" />
    <rect x="6" y="20" width="14" height="12" rx="2" fill="#C62828" />
    <rect x="3" y="43" width="5" height="2" rx="1" fill="#FFF3B0" /><rect x="18" y="43" width="5" height="2" rx="1" fill="#FFF3B0" />
    <rect x="3" y="3" width="5" height="2" rx="1" fill="#7A0F0F" /><rect x="18" y="3" width="5" height="2" rx="1" fill="#7A0F0F" />
  </svg>
);

/* ---------- Question du jour ---------- */
const LETTERS = ["A", "B", "C", "D"];
const STORE = "mp-question-du-jour";
const todayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const dayOfYear = (d = new Date()) =>
  Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);

function DailyQuestion({ questions, onContinue }) {
  const today = todayKey();
  const q = questions[dayOfYear() % questions.length];

  const [picked, setPicked] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      return saved && saved.date === today && saved.id === q.id ? saved.picked : null;
    } catch { return null; }
  });
  const answered = picked !== null;
  const ok = picked === q.correct;

  const dateLabel = useMemo(() => {
    const s = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const choose = (i) => {
    if (answered) return;
    setPicked(i);
    try { localStorage.setItem(STORE, JSON.stringify({ date: today, id: q.id, picked: i })); } catch {}
  };

  return (
    <article className="mp-quiz" aria-labelledby="mp-qdj">
      <div className="mp-quiz-top">
        <span className="mp-tag" id="mp-qdj">Question du jour</span>
        <span className="mp-date">{dateLabel}</span>
      </div>

      <div className="mp-q">
        <div className="mp-sign" role="img" aria-label={q.alt}>{q.sign}</div>
        <p className="mp-q-text">{q.question}</p>
      </div>

      <div className="mp-answers" role="group" aria-label="Réponses possibles">
        {q.answers.map((a, i) => {
          const state = !answered ? "" : i === q.correct ? "is-correct" : i === picked ? "is-wrong" : "is-dim";
          return (
            <button key={i} type="button" className={`mp-ans ${state}`} onClick={() => choose(i)}
              aria-disabled={answered ? "true" : undefined}>
              <span className="mp-letter" aria-hidden="true">
                {state === "is-correct" ? <Check /> : state === "is-wrong" ? <Cross /> : LETTERS[i]}
              </span>
              <span>
                <span className="sr">{LETTERS[i]}. </span>{a}
                {answered && i === q.correct && <span className="sr"> (bonne réponse)</span>}
                {answered && i === picked && !ok && <span className="sr"> (ta réponse)</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`mp-collapse ${answered ? "" : "open"}`} aria-hidden={answered}>
        <div><p className="mp-hint">Choisis une réponse pour voir la correction.</p></div>
      </div>

      <div className={`mp-collapse ${answered ? "open" : ""}`}>
        <div>
          <div aria-live="polite">
            {answered && (
              <>
                <p className={`mp-verdict ${ok ? "ok" : "ko"}`}>
                  <span className="mp-vicon">{ok ? <Check size={14} /> : <Cross size={14} />}</span>
                  {ok ? "Bonne réponse !" : `Pas tout à fait, la bonne réponse est la ${LETTERS[q.correct]}.`}
                </p>
                <p className="mp-expl">{q.explanation}</p>
              </>
            )}
          </div>
          {answered && (
            <div className="mp-next">
              <button type="button" className="mp-cta" onClick={onContinue}>Me connecter pour continuer</button>
              <span>Nouvelle question demain</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------- Page ---------- */
export default function LoginPage({ logo = "/logo.png", onSubmit, onGoogle, questions = QUESTIONS, proof }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoOk, setLogoOk] = useState(true);
  const phoneRef = useRef(null);
  const passRef = useRef(null);

  const digits = phone.replace(/\s/g, "");

  // accepte aussi un numéro collé avec +229, et formate en 01 97 00 00 00
  const formatPhone = (v) => {
    let d = v.replace(/\D/g, "");
    if (d.startsWith("229") && d.length > 10) d = d.slice(3);
    return d.slice(0, 10).replace(/(\d{2})(?=\d)/g, "$1 ");
  };

  const focusForm = () => {
    const el = phoneRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (digits.length !== 10)
      next.phone = digits.length ? "Ton numéro doit contenir 10 chiffres, par exemple 01 97 00 00 00." : "Entre ton numéro de téléphone.";
    if (!password) next.password = "Entre ton mot de passe.";
    setErrors(next);
    if (next.phone) return phoneRef.current?.focus();
    if (next.password) return passRef.current?.focus();

    setLoading(true);
    try { await onSubmit?.({ phone: "+229" + digits, password }); }
    catch (err) { setErrors({ form: err?.message || "Numéro ou mot de passe incorrect. Vérifie-les et réessaie." }); }
    finally { setLoading(false); }
  };

  const onCaps = (e) => setCaps(!!e.getModifierState?.("CapsLock"));

  return (
    <main className="mp">
      <style>{css}</style>

      <header className="mp-head">
        {logoOk && <img src={logo} alt="" onError={() => setLogoOk(false)} />}
        <p className="mp-word">Monpermis<b>.bj</b></p>
      </header>

      <div className="mp-road" aria-hidden="true"><div className="mp-car"><Car /></div></div>

      <section className="mp-side" aria-labelledby="mp-title">
        <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
          <p className="mp-eyebrow">CONNEXION</p>
          <h1 id="mp-title">Content de te revoir</h1>
          <p className="mp-sub">Connecte-toi pour reprendre ta préparation au permis.</p>

          <div className="mp-float">
            <button type="button" className="mp-pill mp-google" onClick={onGoogle}>
              <GoogleIcon /> Continuer avec Google
            </button>
          </div>

          <div className="mp-or">ou avec ton téléphone</div>

          <div className="mp-field">
            <label htmlFor="mp-phone">Téléphone</label>
            <div className={`mp-input ${errors.phone ? "err" : ""}`}>
              <span className="mp-prefix" aria-hidden="true">🇧🇯 +229</span>
              <input ref={phoneRef} id="mp-phone" type="tel" inputMode="numeric" autoComplete="tel-national"
                placeholder="01 97 00 00 00" value={phone}
                aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "mp-phone-err" : undefined}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); if (errors.phone || errors.form) setErrors({}); }} />
            </div>
            {errors.phone && <p className="mp-error" id="mp-phone-err">{errors.phone}</p>}
          </div>

          <div className="mp-field">
            <label htmlFor="mp-pass">Mot de passe</label>
            <div className={`mp-input ${errors.password ? "err" : ""}`}>
              <input ref={passRef} id="mp-pass" type={show ? "text" : "password"} autoComplete="current-password"
                placeholder="Ton mot de passe" value={password}
                aria-invalid={!!errors.password} aria-describedby={errors.password ? "mp-pass-err" : undefined}
                onKeyDown={onCaps} onKeyUp={onCaps} onBlur={() => setCaps(false)}
                onChange={(e) => { setPassword(e.target.value); if (errors.password || errors.form) setErrors({}); }} />
              <button type="button" className="mp-eye" onClick={() => setShow(!show)}
                aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={show}>
                <Eye open={show} />
              </button>
            </div>
            {errors.password && <p className="mp-error" id="mp-pass-err">{errors.password}</p>}
            {caps && <p className="mp-caps">⇪ Majuscules activées</p>}
          </div>

          <a className="mp-forgot" href="/mot-de-passe-oublie">Mot de passe oublié ?</a>

          {errors.form && <p className="mp-alert" role="alert">{errors.form}</p>}

          <div className="mp-float green">
            <button type="submit" className="mp-pill mp-submit" disabled={loading}>
              {loading ? <><span className="mp-spin" aria-hidden="true" /> Connexion…</> : "Se connecter"}
            </button>
          </div>

          <p className="mp-signup">Pas encore de compte ? <a href="/inscription">Créer un compte</a></p>
        </form>
      </section>

      <section className="mp-left" aria-label="Question du jour">
        <h2>Code, conduite, confiance, avance à ton rythme.</h2>
        {questions?.length > 0 && <DailyQuestion questions={questions} onContinue={focusForm} />}
      </section>

      <div className="mp-foot">
        {proof && <p className="mp-proof"><Check size={16} /> {proof}</p>}
        <p>© {new Date().getFullYear()} Monpermis.bj</p>
      </div>

      <nav className="mp-legal" aria-label="Informations légales">
        <a href="/conditions-utilisation">Conditions d'utilisation</a>
        <a href="/politique-de-confidentialite">Confidentialité</a>
        <a href="/mentions-legales">Mentions légales</a>
      </nav>
    </main>
  );
}
