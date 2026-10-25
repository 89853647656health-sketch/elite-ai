// Elite AI voice demo: browser speech recognition (free) -> DeepSeek via gateway /chat -> browser speechSynthesis (free).
const GW = window.ELITE_GATEWAY_URL || "https://elite-gateway.onrender.com";
const $ = id => document.getElementById(id);
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const LG = () => document.documentElement.lang === "en" ? "en" : "ru";
const TX = {
  ru: { wake: "Подключаюсь…", think: "Думаю…", speak: "Говорит ассистент…", listen: "Слушаю, говорите.", type: "Ваш браузер не распознаёт речь. Напишите вопрос, ответ прозвучит голосом.", end: "Разговор завершён.", limit: "Разговор длился 10 минут и завершён.", err: "Ошибка связи: ", mic: "Нет доступа к микрофону. Разрешите его в настройках браузера.", you: "Вы", ai: "Elite AI", ph: "Ваш вопрос…", send: "Отправить" },
  en: { wake: "Connecting…", think: "Thinking…", speak: "Assistant speaking…", listen: "Listening, go ahead.", type: "Your browser cannot recognise speech. Type a question, the answer will be spoken.", end: "Call ended.", limit: "The call reached 10 minutes and has ended.", err: "Connection error: ", mic: "No microphone access. Allow it in browser settings.", you: "You", ai: "Elite AI", ph: "Your question…", send: "Send" }
};
const GREET = {
  ru: "Здравствуйте, я Elite AI, персональный интеллектуальный ассистент премиум класса. Платформу создаёт компания Elite, её основатели Мариус и Арсен, юридическое лицо находится в Эмиратах. Сейчас вы говорите с демо версией, запуск запланирован на ноябрь. Что вам интересно узнать?",
  en: "Hello, I am Elite AI, a premium class personal intelligent assistant. The platform is being built by Elite, founded by Marius and Arsen, with its legal entity in the UAE. You are talking to a demo version, and launch is planned for November. What would you like to know?"
};
const t = k => TX[LG()][k];
let active = false, speaking = false, busy = false, rec = null, hist = [], timer = null;
document.querySelectorAll("#md .box > p.m").forEach(p => p.remove());
$("key")?.remove(); $("go")?.remove();
const box = $("md").querySelector(".box");
const log = document.createElement("div"); log.id = "tr"; log.style.cssText = "max-height:40vh;overflow:auto;text-align:left;margin:10px 0;font-size:14px;line-height:1.45";
$("st").after(log);
const form = document.createElement("form"); form.style.cssText = "display:none;gap:8px;margin:8px 0";
form.innerHTML = '<input id="q" autocomplete="off" style="flex:1"><button class="btn" type="submit" id="qs"></button>';
log.after(form);
const say = s => $("st").textContent = s;
const line = (who, s) => { const p = document.createElement("p"); p.style.margin = "6px 0"; p.innerHTML = "<b></b> "; p.firstChild.textContent = t(who) + ":"; p.append(s); log.append(p); log.scrollTop = log.scrollHeight; };
function pickVoice(l) {
  const vs = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(l));
  const fem = /female|milena|irina|alena|svetlana|daria|ekaterina|samantha|zira|aria|jenny|google|natural|online/i;
  return vs.find(v => /natural|online/i.test(v.name) && fem.test(v.name)) || vs.find(v => fem.test(v.name)) || vs[0];
}
speechSynthesis.onvoiceschanged = () => {};
const player = new Audio(); player.preload = "auto";
const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
let speakGen = 0;
const splitS = s => (s.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g) || [s]).map(x => x.trim()).filter(Boolean).reduce((a, x) => { if (a.length && a[a.length - 1].length < 40) a[a.length - 1] += " " + x; else a.push(x); return a; }, []);
const fetchTTS = (text, l) => fetch(GW + "/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang: l }) })
  .then(r => { if (!r.ok || !(r.headers.get("content-type") || "").includes("audio")) throw new Error("tts " + r.status); return r.blob(); });
const playBlob = (b, gen) => new Promise((res, rej) => {
  if (gen !== speakGen) return res();
  const u = URL.createObjectURL(b); player.src = u;
  player.onended = () => { URL.revokeObjectURL(u); res(); }; player.onerror = () => { URL.revokeObjectURL(u); rej(new Error("play")); };
  player.play().catch(rej);
});
function browserSpeak(text, l) {
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = l === "en" ? "en-US" : "ru-RU"; const v = pickVoice(l); if (v) u.voice = v;
    u.onend = u.onerror = () => res(); speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}
async function speak(text) {
  if (!active) return;
  const gen = ++speakGen, l = LG(), parts = splitS(text);
  speaking = true; stopRec(); say(t("speak"));
  try {
    let next = fetchTTS(parts[0], l);
    for (let k = 0; k < parts.length; k++) {
      const b = await next; if (gen !== speakGen || !active) break;
      if (k + 1 < parts.length) next = fetchTTS(parts[k + 1], l); next.catch(() => {});
      await playBlob(b, gen);
    }
  } catch (e) {
    if (gen === speakGen && active) await browserSpeak(text, l);
  }
  if (gen === speakGen) speaking = false;
}
function stopAudio() { speakGen++; player.pause(); player.removeAttribute("src"); speechSynthesis.cancel(); }
async function ask(q) {
  if (!active || busy) return; busy = true;
  if (q) { hist.push({ role: "user", content: q }); line("you", q); }
  say(t("think"));
  try {
    const r = await fetch(GW + "/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: LG(), messages: hist.slice(-12) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.reply) throw new Error(j.error?.message || "HTTP " + r.status);
    hist.push({ role: "assistant", content: j.reply }); line("ai", j.reply);
    busy = false; await speak(j.reply);
  } catch (e) { busy = false; say(t("err") + e.message); }
  listen();
}
function stopRec() { if (rec) { rec.onend = null; try { rec.abort(); } catch {} rec = null; } }
function listen() {
  if (!active || speaking || busy) return;
  if (!SR) { form.style.display = "flex"; say(t("type")); $("q").focus(); return; }
  stopRec(); rec = new SR(); rec.lang = LG() === "en" ? "en-US" : "ru-RU"; rec.interimResults = false; rec.continuous = false;
  rec.onresult = e => { const s = e.results[0][0].transcript.trim(); if (s) { stopRec(); ask(s); } };
  rec.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { say(t("mic")); form.style.display = "flex"; rec = null; } };
  rec.onend = () => { rec = null; if (active && !speaking && !busy) setTimeout(listen, 200); };
  try { rec.start(); say(t("listen")); } catch {}
}
form.onsubmit = e => { e.preventDefault(); const q = $("q").value.trim(); if (!q) return; $("q").value = ""; stopRec(); ask(q); };
function start() {
  $("md").classList.add("on"); $("q").placeholder = t("ph"); $("qs").textContent = t("send");
  if (active) return; active = true; hist = []; log.innerHTML = ""; $("end").disabled = false; say(t("wake"));
  player.src = SILENT; player.play().catch(() => {}); // unlock audio on user gesture (iOS)
  timer = setTimeout(() => { hang(); say(t("limit")); }, 10 * 60e3);
  greet();
}
async function greet() { const g = GREET[LG()]; hist.push({ role: "assistant", content: g }); line("ai", g); await speak(g); listen(); }
function hang() { active = false; busy = false; speaking = false; clearTimeout(timer); stopRec(); stopAudio(); $("end").disabled = true; say(t("end")); }
$("call").onclick = $("call2").onclick = start;
$("off").onclick = () => { hang(); $("md").classList.remove("on"); };
$("cl").onclick = () => { hang(); $("md").classList.remove("on"); };
$("end").onclick = hang;
window.eliteLang = () => { if ($("q")) { $("q").placeholder = t("ph"); $("qs").textContent = t("send"); } if (rec) { stopRec(); listen(); } };
