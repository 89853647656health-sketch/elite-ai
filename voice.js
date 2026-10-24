// Elite AI live voice: OpenAI Realtime over WebRTC.
// Mode A (default): browser mints an ephemeral client secret directly with the visitor's key (OpenAI allows CORS).
// Mode B: set window.ELITE_GATEWAY_URL to a gateway (see /gateway/server.mjs) that mints it instead.
const ELITE_GATEWAY_URL = window.ELITE_GATEWAY_URL || "";
const MODEL = "gpt-realtime", VOICE = "marin";
const PROMPT = "Ты Elite AI, голосовой ассистент на сайте-анонсе платформы Elite AI компании Elite. Это персональный ИИ-ассистент для бизнесменов, который сейчас в разработке. Готовым продуктом ты себя не называешь, а рассказываешь, как задумана и как будет устроена платформа и что из этого уже сделано. Говори по-русски, а если собеседник перейдёт на английский, переходи на английский. Тон сдержанный, уверенный, профессиональный и грамотный, без продаж и без лишних эмоций. Отвечай связной живой речью, без перечислений, коротко, по два-четыре предложения, и следи за реакцией собеседника. Платформа задумана как полноценный ИИ-ассистент и единый контур: ассистент работает и на телефоне, и за компьютером, помнит весь разговор и контекст между сессиями, всё расшифровывается в текст, и он может организовать конференцию или видеоконференцию. Он будет работать с файлами, почтой, браузером и мессенджерами, звонить и писать людям от имени хозяина и вести дела как полноценный сотрудник. Например, владелец заводит новый номер WhatsApp и подключает к нему своего робота, а робот звонит коллегам и знакомым со словами «Здравствуйте, я ассистент Анатолия Петровича» и договаривается о доставке, встрече, подписании контракта или напоминает о визите в офис. Уникальность платформы в собственной встроенной CRM, в системе кабинетов, где у каждого аккаунта свой кабинет, и прежде всего в отделённой, изолированной модели для каждого клиента. Продукт клонируется под каждого клиента: клиент оплачивает, автоматика регистрирует аккаунт на его собственном домене, купленном у его регистратора, и передаёт ему робота, а дальше клиент сам работает с роботом и настраивает его. Поскольку каждый экземпляр живёт отдельно, кибератака может затронуть только одного клиента, а система в целом не подставляется. Сейчас в коде уже есть собственный мессенджер на протоколе Signal со сквозным шифрованием, сервер видит только зашифрованные данные. Следующим шагом идут Telegram, WhatsApp и почта. Запросы проходят через шлюз LiteLLM: основная модель DeepSeek и запасная Mistral работают на собственных серверах, а для сложных рассуждений подключается премиальная модель. Данные хранятся в PostgreSQL, где каждый клиент изолирован от других. Голосовой модуль, который понимает эмоции и контекст, это партнёрская разработка команды Якова, которую они три с половиной года делали вместе с МГУ, и его интеграция планируется. Лицензия помесячная: Private триста долларов, Signature шестьсот и Sovereign девятьсот долларов в месяц, эти цены можно называть. Контакты: владелец Арсен Одабашян, представитель Мариус Едлицкий из Elite Icon FZ-LLC, сайт eipinvestment.com, телефон плюс девять семь один пятьдесят восемь пятьсот тридцать девять семьдесят семь тридцать три. Если чего-то не знаешь, так и говори, ничего не придумывай. Сроки, клиентов и другие цифры не называй, а такие вопросы предлагай обсудить с командой. Первой репликой коротко представься и спроси, что собеседнику интересно.";
const $ = id => document.getElementById(id);
let pc, mic, dc;
const say = t => $("st").textContent = t;
const open = () => { $("md").classList.add("on"); $("key").value = sessionStorage.getItem("eliteKey") || ""; upd(); };
const upd = () => { $("go").disabled = !$("key").value.trim().startsWith("sk-"); };
$("call").onclick = $("call2").onclick = open;
$("key").oninput = () => { sessionStorage.setItem("eliteKey", $("key").value.trim()); upd(); };
$("cl").onclick = () => { hang(); $("md").classList.remove("on"); };
$("end").onclick = hang;
function hang() { mic?.getTracks().forEach(t => t.stop()); dc?.close(); pc?.close(); pc = null; $("end").disabled = true; upd(); }
async function token(key) {
  const session = { type: "realtime", model: MODEL, instructions: PROMPT, audio: { output: { voice: VOICE } } };
  const r = ELITE_GATEWAY_URL
    ? await fetch(ELITE_GATEWAY_URL + "/session", { method: "POST", headers: { "X-Api-Key": key } })
    : await fetch("https://api.openai.com/v1/realtime/client_secrets", { method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ session }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.value) throw new Error(j.error?.message || ("HTTP " + r.status));
  return j.value;
}
$("go").onclick = async () => {
  $("go").disabled = true; say("Подключаюсь…");
  try {
    const eph = await token(sessionStorage.getItem("eliteKey"));
    pc = new RTCPeerConnection();
    const out = new Audio(); out.autoplay = true;
    pc.ontrack = e => out.srcObject = e.streams[0];
    mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(mic.getTracks()[0], mic);
    dc = pc.createDataChannel("oai-events");
    dc.onopen = () => { say("На связи. Говорите."); dc.send(JSON.stringify({ type: "response.create" })); };
    dc.onmessage = e => { const m = JSON.parse(e.data); if (m.type === "error") say("Ошибка: " + (m.error?.message || "")); };
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const r = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp,
      headers: { Authorization: "Bearer " + eph, "Content-Type": "application/sdp" } });
    if (!r.ok) throw new Error("SDP " + r.status + " " + (await r.text()).slice(0, 160));
    await pc.setRemoteDescription({ type: "answer", sdp: await r.text() });
    $("end").disabled = false;
  } catch (e) { say("Голосовой контур недоступен: " + e.message); hang(); }
};
