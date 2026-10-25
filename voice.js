// Elite AI voice demo: browser speech recognition (free) -> DeepSeek via gateway /chat -> browser speechSynthesis (free).
const GW = window.ELITE_GATEWAY_URL || "https://elite-gateway.onrender.com";
const $ = id => document.getElementById(id);
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const LG = () => document.documentElement.lang === "en" ? "en" : "ru";
const TX = {
  ru: { wake: "Подключаюсь…", think: "Думаю…", speak: "Говорит ассистент…", listen: "Слушаю, говорите.", type: "Ваш браузер не распознаёт речь. Напишите вопрос, ответ прозвучит голосом.", end: "Разговор завершён.", limit: "Разговор длился 10 минут и завершён.", err: "Ошибка связи: ", mic: "Нет доступа к микрофону. Разрешите его в настройках браузера.", you: "Вы", ai: "Elite AI", lim: "Лимит демо исчерпан: с одного устройства доступно 3 голосовых разговора в сутки. Задайте вопрос в текстовом чате на странице или свяжитесь с командой Elite.", left: "До конца разговора", bye: "Время демо разговора подошло к концу. Спасибо, что поговорили со мной! Если остались вопросы, задайте их в чате на сайте или свяжитесь с командой Elite.", ph: "Ваш вопрос…", send: "Отправить" },
  en: { wake: "Connecting…", think: "Thinking…", speak: "Assistant speaking…", listen: "Listening, go ahead.", type: "Your browser cannot recognise speech. Type a question, the answer will be spoken.", end: "Call ended.", limit: "The call reached 10 minutes and has ended.", err: "Connection error: ", mic: "No microphone access. Allow it in browser settings.", you: "You", ai: "Elite AI", lim: "Demo limit reached: 3 voice conversations per device per day. Ask your question in the text chat on this page or contact the Elite team.", left: "Time left", bye: "Our demo conversation time is up. Thank you for talking with me! If you have more questions, ask them in the chat on the site or contact the Elite team.", ph: "Your question…", send: "Send" }
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
const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAzAAAAAAAAAAAAAAD/83DAAAAAAAAAAAAASW5mbwAAAA8AAAAGAAADKQBaWlpaWlpaWlpaWlpaWlpae3t7e3t7e3t7e3t7e3t7e3ucnJycnJycnJycnJycnJycvb29vb29vb29vb29vb29vb3e3t7e3t7e3t7e3t7e3t7e3v////////////////////8AAAAATGF2YzYxLjE5AAAAAAAAAAAAAAAAJAKjAAAAAAAAAymyjycdAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FMy4xMDBVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxFsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
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
function legacyStart() {
  $("md").classList.add("on"); $("q").placeholder = t("ph"); $("qs").textContent = t("send");
  if (active) return; active = true; hist = []; log.innerHTML = ""; $("end").disabled = false; say(t("wake"));
  player.src = SILENT; player.play().catch(() => {}); speechSynthesis.speak(new SpeechSynthesisUtterance("")); // unlock audio on user gesture (iOS)
  timer = setTimeout(() => { hang(); say(t("limit")); }, 10 * 60e3);
  greet();
}
async function greet() { const g = GREET[LG()]; hist.push({ role: "assistant", content: g }); line("ai", g); await speak(g); listen(); }
function hang() { grokStop(); active = false; busy = false; speaking = false; clearTimeout(timer); stopRec(); stopAudio(); $("end").disabled = true; say(t("end")); }
$("call").onclick = $("call2").onclick = grokStart;
$("off").onclick = () => { hang(); $("md").classList.remove("on"); };
$("cl").onclick = () => { hang(); $("md").classList.remove("on"); };
$("end").onclick = hang;
window.eliteLang = () => { grokLang(); if ($("q")) { $("q").placeholder = t("ph"); $("qs").textContent = t("send"); } if (rec) { stopRec(); listen(); } };

// ===== Grok Voice (xAI realtime, speech to speech). Falls back to legacyStart() if it cannot connect. =====
let gws = null, gctx = null, gmic = null, gproc = null, gsrc = null, gNext = 0, gSources = [], gInstr = null, gVoice = { ru: "celeste", en: "eve" }, gOn = false, gTimer = null;
const G_RATE = 24000, G_MAX = 300, G_PER_DAY = 3;
let gCd = null, gEnd = 0;
const cd = document.createElement("div"); cd.id = "cd"; cd.style.cssText = "font:700 22px Manrope,sans-serif;margin:6px 0;color:var(--acc,#1d5bff)"; $("st").before(cd);
const callsLog = () => { try { return JSON.parse(localStorage.getItem("elite-calls") || "[]").filter(x => Date.now() - x < 864e5); } catch { return []; } };
const limitHit = () => { stopCd(); grokStop(); active = false; $("end").disabled = true; say(t("lim")); };
function stopCd() { clearInterval(gCd); gCd = null; cd.textContent = ""; }
function startCd() {
  gEnd = Date.now() + G_MAX * 1000; stopCd();
  const tick = () => { const r = Math.max(0, Math.round((gEnd - Date.now()) / 1000)); cd.textContent = t("left") + " " + Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
    if (r <= 0) { stopCd(); closeCall(); } };
  tick(); gCd = setInterval(tick, 1000);
}
function closeCall() {
  if (!gws || gws.readyState !== 1) { hang(); return; }
  try { gproc && gproc.disconnect(); } catch {} // stop sending mic
  gws.send(JSON.stringify({ type: "conversation.item.create", item: { type: "force_message", role: "assistant", interruptible: false, content: [{ type: "output_text", text: t("bye") }] } }));
  gws.addEventListener("message", ev => { try { if (JSON.parse(ev.data).type === "response.done") { const w = Math.max(0, (gNext - (gctx ? gctx.currentTime : 0)) * 1000) + 400; setTimeout(hang, w); } } catch {} });
  setTimeout(hang, 20000);
}
function grokStop() {
  gOn = false; clearTimeout(gTimer); stopCd && gCd && stopCd();
  try { gws && gws.close(); } catch {} gws = null;
  gSources.forEach(s => { try { s.stop(); } catch {} }); gSources = []; gNext = 0;
  try { gproc && gproc.disconnect(); gsrc && gsrc.disconnect(); } catch {}
  gmic && gmic.getTracks().forEach(t => t.stop()); gmic = null;
  if (gctx) { gctx.close().catch(() => {}); gctx = null; }
}
const b64 = buf => { let s = "", b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
function toPcm16(f32, inRate) {
  const ratio = inRate / G_RATE, n = Math.floor(f32.length / ratio), o = new Int16Array(n);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, f32[Math.floor(i * ratio)])); o[i] = x < 0 ? x * 0x8000 : x * 0x7fff; }
  return o.buffer;
}
function playPcm(b64s) {
  if (!gctx) return;
  const bin = atob(b64s), n = bin.length >> 1, buf = gctx.createBuffer(1, n, G_RATE), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v >= 0x8000) v -= 0x10000; ch[i] = v / 32768; }
  const src = gctx.createBufferSource(); src.buffer = buf; src.connect(gctx.destination);
  const t0 = Math.max(gctx.currentTime + 0.03, gNext); src.start(t0); gNext = t0 + buf.duration;
  gSources.push(src); src.onended = () => { gSources = gSources.filter(x => x !== src); if (!gSources.length && gOn) say(t("listen")); };
}
function bargeIn() { gSources.forEach(s => { try { s.stop(); } catch {} }); gSources = []; gNext = 0; }
function gcfg(l) {
  return { type: "session.update", session: { voice: gVoice[l], instructions: gInstr[l], turn_detection: { type: "server_vad" },
    audio: { input: { format: { type: "audio/pcm", rate: G_RATE }, transcription: { language_hint: l } }, output: { format: { type: "audio/pcm", rate: G_RATE } } } } };
}
function grokLang() { if (gws && gws.readyState === 1 && gInstr) gws.send(JSON.stringify(gcfg(LG()))); }
async function grokStart() {
  $("md").classList.add("on"); $("q").placeholder = t("ph"); $("qs").textContent = t("send");
  if (active || gOn) return;
  if (callsLog().length >= G_PER_DAY) { say(t("lim")); return; }
  // unlock audio inside the click (iOS)
  const AC = window.AudioContext || window.webkitAudioContext;
  try { gctx = new AC(); gctx.resume(); const sb = gctx.createBuffer(1, 1, 22050), s0 = gctx.createBufferSource(); s0.buffer = sb; s0.connect(gctx.destination); s0.start(0); } catch { gctx = null; }
  player.src = SILENT; player.play().catch(() => {});
  active = true; gOn = true; hist = []; log.innerHTML = ""; $("end").disabled = false; form.style.display = "none"; say(t("wake"));
  const l = LG();
  try {
    if (!gctx || !window.WebSocket) throw new Error("no audio");
    const [tok, mic] = await Promise.all([
      fetch(GW + "/grok-session?lang=" + l, { method: "POST" }).then(async r => { const j = await r.json().catch(() => ({})); if (r.status === 429) { const e = new Error("demo_limit"); e.limit = true; throw e; } if (!r.ok || !j.value) throw new Error(j.error?.message || "HTTP " + r.status); return j; }),
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    ]);
    if (!gOn) { mic.getTracks().forEach(x => x.stop()); return; }
    localStorage.setItem("elite-calls", JSON.stringify(callsLog().concat(Date.now())));
    gmic = mic; gInstr = tok.instructions; if (tok.voice && typeof tok.voice === "object") gVoice = tok.voice;
    gws = new WebSocket("wss://api.x.ai/v1/realtime?model=" + (tok.model || "grok-voice-latest"), ["xai-client-secret." + tok.value]);
    let opened = false;
    const failT = setTimeout(() => { if (!opened) gws && gws.close(); }, 8000);
    gws.onopen = () => {
      opened = true; clearTimeout(failT); const L = LG();
      gws.send(JSON.stringify(gcfg(L)));
      gws.send(JSON.stringify({ type: "conversation.item.create", item: { type: "force_message", role: "assistant", interruptible: true, content: [{ type: "output_text", text: GREET[L] }] } }));
      gsrc = gctx.createMediaStreamSource(gmic); gproc = gctx.createScriptProcessor(2048, 1, 1);
      const mute = gctx.createGain(); mute.gain.value = 0;
      gproc.onaudioprocess = e => { if (gws && gws.readyState === 1) gws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64(toPcm16(e.inputBuffer.getChannelData(0), gctx.sampleRate)) })); };
      gsrc.connect(gproc); gproc.connect(mute); mute.connect(gctx.destination);
      startCd();
    };
    gws.onmessage = ev => {
      let e; try { e = JSON.parse(ev.data); } catch { return; }
      if (e.type === "response.output_audio.delta" || e.type === "response.audio.delta") { playPcm(e.delta); say(t("speak")); }
      else if (e.type === "input_audio_buffer.speech_started") { bargeIn(); say(t("listen")); }
      else if (e.type === "input_audio_buffer.speech_stopped") say(t("think"));
      else if (e.type === "response.output_audio_transcript.done" && e.transcript) line("ai", e.transcript);
      else if (e.type === "conversation.item.input_audio_transcription.completed" && e.transcript) line("you", e.transcript);
      else if (e.type === "error") console.warn("grok", e);
    };
    gws.onclose = () => {
      clearTimeout(failT);
      if (!opened && gOn) { grokStop(); active = false; legacyStart(); return; } // fallback
      if (gOn) { hang(); }
    };
  } catch (e) {
    console.warn("grok fallback", e);
    if (e && e.limit) { limitHit(); return; }
    if (/notallowed|permission|denied/i.test(String(e && (e.name + e.message)))) { grokStop(); hang(); say(t("mic")); return; }
    grokStop(); active = false; legacyStart();
  }
}
