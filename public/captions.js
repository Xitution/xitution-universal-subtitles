(() => {
  const script = document.currentScript;
  const API = (script?.dataset.apiBase || "").replace(/\/$/, "");
  const DEFAULT_LANG = script?.dataset.defaultLang || "de";
  const AUTO = script?.dataset.auto !== "false";
  const AUTO_OPEN = script?.dataset.autoOpen !== "false";

  const LANGS = [
    ["original","Original"],
    ["de","Deutsch"],
    ["en","English"],
    ["zh","中文"],
    ["es","Español"],
    ["pt","Português"],
    ["fr","Français"],
    ["it","Italiano"],
    ["ar","العربية"],
    ["tr","Türkçe"],
    ["pl","Polski"],
    ["ru","Русский"],
    ["ja","日本語"],
    ["ko","한국어"],
    ["nl","Nederlands"],
    ["cs","Čeština"],
    ["ro","Română"]
  ];

  const css = `
  .xus-host{
    position:relative!important;
    overflow:hidden;
  }

  /* Main subtitle banner – intentionally styled like the supplied reference */
  .xus-caption-layer{
    position:absolute;
    left:0;
    right:0;
    bottom:8.5%;
    z-index:2147482000;
    pointer-events:none;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:0 clamp(12px,2.2vw,34px);
    box-sizing:border-box;
  }

  .xus-caption-box{
    width:min(94%,1800px);
    box-sizing:border-box;
    padding:clamp(11px,1.45vw,24px) clamp(18px,2.25vw,42px);
    border-radius:clamp(12px,1.35vw,24px);
    background:rgba(20,18,18,.72);
    -webkit-backdrop-filter:blur(5px) saturate(105%);
    backdrop-filter:blur(5px) saturate(105%);
    box-shadow:
      0 7px 24px rgba(0,0,0,.20),
      inset 0 1px 0 rgba(255,255,255,.035);
    opacity:0;
    transform:translateY(8px);
    transition:opacity .13s ease, transform .13s ease;
  }

  .xus-caption-layer.xus-visible .xus-caption-box{
    opacity:1;
    transform:translateY(0);
  }

  .xus-caption-text{
    display:block;
    margin:0;
    color:#fff;
    text-align:center;
    font-family:Inter,Arial,Helvetica,sans-serif;
    font-weight:800;
    font-size:clamp(22px,3.25vw,62px);
    line-height:1.18;
    letter-spacing:-.018em;
    text-wrap:balance;
    overflow-wrap:anywhere;
    text-shadow:0 2px 5px rgba(0,0,0,.42);
  }

  /* Small unobtrusive control – subtitle itself remains the visual focus */
  .xus-control{
    position:absolute;
    z-index:2147483000;
    top:14px;
    right:14px;
    display:flex;
    gap:8px;
    align-items:center;
    pointer-events:auto;
  }

  .xus-cc,
  .xus-menu-btn{
    border:1px solid rgba(255,255,255,.28);
    background:rgba(20,20,22,.62);
    color:#fff;
    height:42px;
    min-width:42px;
    border-radius:13px;
    box-shadow:0 6px 20px rgba(0,0,0,.18);
    -webkit-backdrop-filter:blur(9px);
    backdrop-filter:blur(9px);
    cursor:pointer;
    font:800 14px/1 Inter,Arial,sans-serif;
  }

  .xus-cc{
    padding:0 13px;
  }

  .xus-cc[aria-pressed="true"]{
    background:rgba(255,255,255,.92);
    color:#111;
  }

  .xus-menu{
    position:absolute;
    right:0;
    top:50px;
    width:min(250px,72vw);
    padding:10px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,.18);
    background:rgba(14,14,16,.90);
    box-shadow:0 20px 50px rgba(0,0,0,.34);
    -webkit-backdrop-filter:blur(16px);
    backdrop-filter:blur(16px);
    display:none;
    color:#fff;
    font-family:Inter,Arial,sans-serif;
  }

  .xus-menu.xus-open{display:block}

  .xus-menu label{
    display:block;
    color:rgba(255,255,255,.62);
    font-size:11px;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
    margin:5px 6px 7px;
  }

  .xus-menu select{
    width:100%;
    height:42px;
    border:1px solid rgba(255,255,255,.18);
    border-radius:11px;
    background:#17171a;
    color:#fff;
    padding:0 11px;
    font:700 14px Inter,Arial,sans-serif;
    outline:none;
  }

  .xus-menu-row{
    display:flex;
    gap:7px;
    margin-top:8px;
  }

  .xus-menu-row button{
    flex:1;
    height:38px;
    border:1px solid rgba(255,255,255,.14);
    border-radius:10px;
    background:#202024;
    color:#fff;
    cursor:pointer;
    font:700 12px Inter,Arial,sans-serif;
  }

  .xus-status{
    position:absolute;
    z-index:2147483100;
    left:50%;
    bottom:18px;
    transform:translateX(-50%);
    max-width:80%;
    background:rgba(10,10,12,.84);
    border:1px solid rgba(255,255,255,.16);
    color:#fff;
    padding:9px 13px;
    border-radius:999px;
    pointer-events:none;
    font:700 12px Inter,Arial,sans-serif;
    box-shadow:0 8px 24px rgba(0,0,0,.25);
    display:none;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }

  .xus-host.xus-font-small .xus-caption-text{
    font-size:clamp(18px,2.45vw,46px);
  }

  .xus-host.xus-font-large .xus-caption-text{
    font-size:clamp(25px,3.8vw,70px);
  }

  .xus-host.xus-pos-middle .xus-caption-layer{
    bottom:39%;
  }

  .xus-host.xus-pos-high .xus-caption-layer{
    bottom:57%;
  }

  @media(max-width:680px){
    .xus-caption-layer{
      bottom:10%;
      padding:0 10px;
    }
    .xus-caption-box{
      width:97%;
      padding:11px 14px;
      border-radius:13px;
    }
    .xus-caption-text{
      font-size:clamp(20px,6.4vw,34px);
      line-height:1.17;
      letter-spacing:-.012em;
    }
    .xus-control{
      top:9px;
      right:9px;
    }
    .xus-cc,.xus-menu-btn{
      height:38px;
      min-width:38px;
      border-radius:11px;
    }
  }
  `;

  if (!document.getElementById("xus-v2-style")) {
    const style = document.createElement("style");
    style.id = "xus-v2-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  const states = new WeakMap();

  function hashString(s){
    let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16);
  }

  async function jsonFetch(url, options) {
    const r = await fetch(url, options);
    let data = null;
    try { data = await r.json(); } catch {}
    if (!r.ok) throw new Error(data?.error || `Request failed (${r.status})`);
    return data;
  }

  function setStatus(state, msg, show=true) {
    state.status.textContent = msg || "";
    state.status.style.display = show && msg ? "block" : "none";
  }

  function findActiveText(segments, t) {
    if (!segments?.length) return "";
    const items = [];
    for (const s of segments) {
      if (t >= Number(s.start)-0.07 && t <= Number(s.end)+0.20) items.push(String(s.text||"").trim());
      if (Number(s.start) > t + 1.5) break;
    }
    return items.filter(Boolean).join(" ");
  }

  function render(state) {
    if (!state.enabled) {
      state.layer.classList.remove("xus-visible");
      state.text.textContent = "";
      return;
    }
    const segs = state.languages[state.lang] || state.languages.original || [];
    const txt = findActiveText(segs, state.video.currentTime || 0);
    state.text.textContent = txt;
    state.layer.classList.toggle("xus-visible", Boolean(txt));
  }

  async function translate(state, lang) {
    state.lang = lang;
    state.select.value = lang;
    if (lang === "original") {
      render(state);
      return;
    }
    if (state.languages[lang]) {
      render(state);
      return;
    }
    setStatus(state, `Übersetze → ${LANGS.find(x=>x[0]===lang)?.[1] || lang} …`);
    const data = await jsonFetch(`${API}/api/captions/translate`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        sourceId:state.sourceId,
        segments:state.languages.original,
        target:lang
      })
    });
    state.languages[lang] = data.segments || [];
    setStatus(state, "", false);
    render(state);
  }

  async function loadCaptions(state) {
    if (state.loading || state.languages.original) return;
    state.loading = true;
    try {
      setStatus(state, "Untertitel werden vorbereitet …");
      const src =
        state.video.dataset.xitutionCaptionSrc ||
        state.video.currentSrc ||
        state.video.src;

      if (!src) throw new Error("Keine Videoquelle gefunden.");

      state.sourceId = hashString(src);

      const data = await jsonFetch(`${API}/api/captions/url`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({videoUrl:src})
      });

      state.languages.original = data.segments || [];
      setStatus(state, "", false);

      if (state.lang !== "original") await translate(state, state.lang);
      else render(state);
    } catch (e) {
      console.error("[Xitution Subtitles]", e);
      setStatus(state, "Untertitel konnten nicht geladen werden.");
    } finally {
      state.loading = false;
    }
  }

  function setEnabled(state, yes) {
    state.enabled = Boolean(yes);
    state.cc.setAttribute("aria-pressed", state.enabled ? "true" : "false");
    if (state.enabled) loadCaptions(state);
    render(state);
  }

  function cycleSize(state) {
    const host = state.host;
    if (!host.classList.contains("xus-font-small") && !host.classList.contains("xus-font-large")) {
      host.classList.add("xus-font-large");
      return;
    }
    if (host.classList.contains("xus-font-large")) {
      host.classList.remove("xus-font-large");
      host.classList.add("xus-font-small");
      return;
    }
    host.classList.remove("xus-font-small");
  }

  function cyclePosition(state) {
    const host = state.host;
    if (!host.classList.contains("xus-pos-middle") && !host.classList.contains("xus-pos-high")) {
      host.classList.add("xus-pos-middle");
      return;
    }
    if (host.classList.contains("xus-pos-middle")) {
      host.classList.remove("xus-pos-middle");
      host.classList.add("xus-pos-high");
      return;
    }
    host.classList.remove("xus-pos-high");
  }

  function mount(video) {
    if (!video || states.has(video)) return;

    const host = video.parentElement;
    if (!host) return;

    const computed = getComputedStyle(host);
    if (computed.position === "static") host.style.position = "relative";
    host.classList.add("xus-host");

    const layer = document.createElement("div");
    layer.className = "xus-caption-layer";
    layer.innerHTML = `
      <div class="xus-caption-box">
        <div class="xus-caption-text" aria-live="polite"></div>
      </div>
    `;

    const control = document.createElement("div");
    control.className = "xus-control";
    control.innerHTML = `
      <button type="button" class="xus-cc" aria-label="Untertitel" aria-pressed="false">CC</button>
      <button type="button" class="xus-menu-btn" aria-label="Untertitel Einstellungen">•••</button>
      <div class="xus-menu">
        <label>Sprache</label>
        <select class="xus-language">
          ${LANGS.map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}
        </select>
        <div class="xus-menu-row">
          <button type="button" class="xus-size">Textgröße</button>
          <button type="button" class="xus-position">Position</button>
        </div>
      </div>
    `;

    const status = document.createElement("div");
    status.className = "xus-status";

    host.append(layer, control, status);

    const state = {
      video,
      host,
      layer,
      text:layer.querySelector(".xus-caption-text"),
      control,
      cc:control.querySelector(".xus-cc"),
      menuBtn:control.querySelector(".xus-menu-btn"),
      menu:control.querySelector(".xus-menu"),
      select:control.querySelector(".xus-language"),
      status,
      enabled:AUTO_OPEN,
      loading:false,
      lang:DEFAULT_LANG,
      sourceId:null,
      languages:{}
    };
    states.set(video, state);

    state.select.value = DEFAULT_LANG;
    state.cc.setAttribute("aria-pressed", state.enabled ? "true" : "false");

    state.cc.addEventListener("click", () => setEnabled(state, !state.enabled));
    state.menuBtn.addEventListener("click", e => {
      e.stopPropagation();
      state.menu.classList.toggle("xus-open");
    });

    state.menu.addEventListener("click", e => e.stopPropagation());

    state.select.addEventListener("change", async e => {
      try {
        if (!state.languages.original) await loadCaptions(state);
        await translate(state, e.target.value);
      } catch (err) {
        console.error(err);
        setStatus(state, "Übersetzung fehlgeschlagen.");
      }
    });

    control.querySelector(".xus-size").addEventListener("click", () => cycleSize(state));
    control.querySelector(".xus-position").addEventListener("click", () => cyclePosition(state));

    document.addEventListener("click", () => state.menu.classList.remove("xus-open"));

    ["timeupdate","seeked","loadedmetadata","play","pause"].forEach(ev =>
      video.addEventListener(ev, () => render(state))
    );

    if (state.enabled) loadCaptions(state);
  }

  function scan() {
    document.querySelectorAll("video").forEach(mount);
  }

  window.XitutionSubtitles = {
    scan,
    mount,
    enable(video){
      const s=states.get(video);
      if(s) setEnabled(s,true);
    },
    disable(video){
      const s=states.get(video);
      if(s) setEnabled(s,false);
    },
    setLanguage(video,lang){
      const s=states.get(video);
      if(s) return translate(s,lang);
    }
  };

  if (AUTO) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scan, {once:true});
    } else {
      scan();
    }
    new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
  }
})();
