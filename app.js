/* Main app logic */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const I18N = {
  en: {
    dashboard: "Dashboard",
    learn: "Learn",
    games: "Mouse & Cheese",
    review: "Quick Review",
    exam: "Weekly Exam",
    settings: "Settings",
    todaysList: "Today’s list",
    streak: "Streak",
  },
  fr: {
    dashboard: "Tableau de bord",
    learn: "Apprendre",
    games: "Souris et fromage",
    review: "Révision rapide",
    exam: "Examen hebdomadaire",
    settings: "Paramètres",
    todaysList: "Liste du jour",
    streak: "Série",
  }
};

let STATE = VNData.loadState();

function initTheme() {
  if (STATE.profile.theme === "dark") document.documentElement.classList.add("dark");
  $("#themeToggle").onclick = () => {
    const root = document.documentElement;
    root.classList.toggle("dark");
    STATE.profile.theme = root.classList.contains("dark") ? "dark" : "light";
    VNData.saveState(STATE);
  };
}

function initLang() {
  const btn = $("#langToggle");
  const uiSel = $("#uiLang");
  const apply = () => {
    btn.textContent = STATE.profile.ui.toUpperCase();
    uiSel.value = STATE.profile.ui;
    // Tab labels left in English for simplicity
  };
  btn.onclick = () => {
    STATE.profile.ui = STATE.profile.ui === "en" ? "fr" : "en";
    apply(); VNData.saveState(STATE);
  };
  uiSel.onchange = e => { STATE.profile.ui = e.target.value; apply(); VNData.saveState(STATE); };
  apply();
}

function initMute() {
  const btn = $("#muteToggle");
  const cb = $("#muteCheckbox");
  const sync = () => {
    btn.textContent = STATE.profile.mute ? "🔇" : "🔈";
    cb.checked = STATE.profile.mute;
    AudioCtl.setMuted(STATE.profile.mute);
  };
  btn.onclick = () => { STATE.profile.mute = !STATE.profile.mute; sync(); VNData.saveState(STATE); };
  cb.onchange = () => { STATE.profile.mute = cb.checked; sync(); VNData.saveState(STATE); };
  sync();
}

function initTabs() {
  $$(".tab").forEach(b => {
    b.onclick = () => {
      $$(".tab").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      const id = "view-" + b.dataset.tab;
      $$(".view").forEach(v => v.classList.remove("active"));
      $("#" + id).classList.add("active");
    };
  });
}

function initDashboard() {
  $("#kpi-streak-val").textContent = STATE.profile.streak + " 🔥";
  $("#kpi-level-val").textContent = STATE.profile.level;
  $("#kpi-points-val").textContent = STATE.profile.points;

  function fillList() {
    const list = VNData.dueItems(STATE, 12);
    const ul = $("#daily-list");
    ul.innerHTML = "";
    list.forEach(w => {
      const li = document.createElement("li");
      li.textContent = `${w.fr} — ${w.en}`;
      ul.appendChild(li);
    });
    $("#daily-list-title").textContent = I18N[STATE.profile.ui].todaysList || "Today’s list";
  }
  $("#regenList").onclick = () => fillList();
  $("#playAll").onclick = async () => {
    for (const w of VNData.dueItems(STATE, 12)) {
      await new Promise(res => AudioCtl.speak(w.fr, { onend: res }));
    }
  };
  drawProgressChart();
  renderBadges();
  fillList();
}

function drawProgressChart() {
  const canvas = $("#progressChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

  const hist = STATE.history.slice(-28); // last 4 weeks
  const max = Math.max(5, ...hist.map(x => x.points));
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f3c1d7";
  const barW = w / Math.max(1, hist.length || 7);
  hist.forEach((d, i) => {
    const bh = Math.round((d.points / max) * (h - 40));
    ctx.fillRect(i * barW + 6, h - bh - 24, barW - 12, bh);
  });
  ctx.fillStyle = "#888";
  ctx.fillText("Daily points", 12, 16);
}

function renderBadges() {
  const wrap = $("#badges");
  wrap.innerHTML = "";
  for (const b of STATE.profile.badges) {
    const el = document.createElement("span");
    el.className = "badge";
    el.textContent = b.title;
    wrap.appendChild(el);
  }
}

function addHistory(points) {
  const today = new Date().toISOString().slice(0, 10);
  const last = STATE.history[STATE.history.length - 1];
  if (last && last.date === today) last.points += points;
  else STATE.history.push({ date: today, points });
}

function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const last = STATE.profile.lastActive;
  if (last === today) return;
  const d = Math.floor((new Date(today) - new Date(last)) / 86400000);
  STATE.profile.streak = d === 1 ? STATE.profile.streak + 1 : 1;
  STATE.profile.lastActive = today;
}

function addBadge(state, id, title) {
  if (state.profile.badges.some(b => b.id === id)) return;
  state.profile.badges.push({ id, title });
  VNData.saveState(state);
  renderBadges();
  confetti();
}
window.addBadge = addBadge;

function confetti() {
  // simple canvas confetti on the progressChart
  const c = $("#progressChart");
  const ctx = c.getContext("2d");
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const r = 2 + Math.random() * 4;
    ctx.fillStyle = `hsl(${Math.random() * 360},80%,70%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

/* Learn activities */

const Activity = {
  mountFlashcards(el) {
    const list = VNData.dueItems(STATE, 1 + Math.floor(Math.random() * 6) + 4);
    let i = 0;
    el.innerHTML = `
      <div class="cardlet">
        <div id="fcWord" class="bigword"></div>
        <div id="fcIPA" class="ipa"></div>
        <div class="row" style="justify-content:center;margin-top:6px;">
          <button id="fcShow">Show EN</button>
          <button id="fcSpeak">▶</button>
          <button id="fcSlow">Slow</button>
        </div>
        <div id="fcEN" class="caption"></div>
        <div class="row" style="justify-content:center;margin-top:10px;">
          <button id="fcKnow" class="secondary">I knew</button>
          <button id="fcDont">I forgot</button>
        </div>
      </div>
    `;
    const fr = $("#fcWord"), ipa = $("#fcIPA"), en = $("#fcEN");
    const render = () => {
      const w = list[i % list.length];
      fr.textContent = w.fr;
      ipa.textContent = w.ipa || "";
      en.textContent = "";
      $("#captionArea").textContent = w.fr;
    };
    render();

    $("#fcShow").onclick = () => { const w = list[i % list.length]; en.textContent = w.en; };
    $("#fcSpeak").onclick = () => { const w = list[i % list.length]; AudioCtl.speak(w.fr); };
    $("#fcSlow").onclick = () => { const w = list[i % list.length]; AudioCtl.speak(w.fr, { rate: .85 }); };

    $("#fcKnow").onclick = () => {
      const w = list[i % list.length];
      VNData.updateSRS(STATE, w.id, true);
      STATE.profile.points += 2; addHistory(2);
      i++; render(); VNData.saveState(STATE); initDashboard();
    };
    $("#fcDont").onclick = () => {
      const w = list[i % list.length];
      VNData.updateSRS(STATE, w.id, false);
      STATE.profile.points += 1; addHistory(1);
      i++; render(); VNData.saveState(STATE); initDashboard();
    };
  },

  mountQuiz(el) {
    const q = () => {
      const pool = VNData.dueItems(STATE, 10);
      const target = pool[Math.floor(Math.random() * pool.length)];
      const options = [target, ...VNData.sampleOther(pool, target, 3)]
        .sort(() => Math.random() - .5);
      el.innerHTML = `
        <div class="cardlet">
          <p class="bigword">${target.fr}</p>
          <div class="row" style="justify-content:center; flex-wrap:wrap;">
            ${options.map(o => `<button class="opt" data-id="${o.id}">${o.en}</button>`).join("")}
          </div>
          <div class="caption" id="qFeedback"></div>
        </div>
      `;
      $$(".opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.id === target.id;
        $("#qFeedback").textContent = ok ? "Correct" : `No, ${target.en}`;
        VNData.updateSRS(STATE, target.id, ok);
        const pts = ok ? 3 : 1; STATE.profile.points += pts; addHistory(pts);
        VNData.saveState(STATE); initDashboard();
        setTimeout(q, 600);
      });
      AudioCtl.speak(target.fr);
    };
    q();
  },

  mountDictation(el) {
    const pool = VNData.dueItems(STATE, 10);
    const target = pool[Math.floor(Math.random() * pool.length)];
    el.innerHTML = `
      <div class="cardlet">
        <div class="row" style="justify-content:center;">
          <button id="dPlay">▶</button>
          <button id="dSlow">Slow</button>
        </div>
        <input id="dInput" placeholder="Type what you hear" />
        <div class="row" style="justify-content:center;margin-top:8px;">
          <button id="dCheck">Check</button>
        </div>
        <div id="dFeedback" class="caption"></div>
      </div>
    `;
    const play = r => AudioCtl.speak(target.fr, { rate: r || 1 });
    $("#dPlay").onclick = () => play(1);
    $("#dSlow").onclick = () => play(0.82);
    $("#dCheck").onclick = () => {
      const val = $("#dInput").value.trim();
      const score = AudioCtl.similarityScore(target.fr, val);
      $("#dFeedback").textContent = `Target: ${target.fr}  •  You: ${val}  •  Score ${score}`;
      VNData.updateSRS(STATE, target.id, score >= 70);
      const pts = score >= 70 ? 4 : 2; STATE.profile.points += pts; addHistory(pts);
      VNData.saveState(STATE); initDashboard();
      setTimeout(() => Activity.mountDictation(el), 700);
    };
    play(1);
  },

  mountRepeat(el) {
    const pool = VNData.dueItems(STATE, 10);
    const target = pool[Math.floor(Math.random() * pool.length)];
    el.innerHTML = `
      <div class="cardlet">
        <p class="bigword">${target.fr}</p>
        <p class="ipa">${target.ipa || ""}</p>
        <div class="row" style="justify-content:center;">
          <button id="rPlay">▶</button>
          <button id="rSlow">Slow</button>
          <button id="rRecord">Record</button>
        </div>
        <div id="rScore" class="caption"></div>
      </div>
    `;
    const play = r => AudioCtl.speak(target.fr, { rate: r || 1 });
    $("#rPlay").onclick = () => play(1);
    $("#rSlow").onclick = () => play(0.85);
    $("#rRecord").onclick = async () => {
      $("#rScore").textContent = "Listening...";
      const score = await AudioCtl.listenAndScore(target.fr);
      $("#rScore").textContent = `Pronunciation score: ${score}`;
      VNData.updateSRS(STATE, target.id, score >= 65);
      const pts = Math.round(score / 25); STATE.profile.points += pts; addHistory(pts);
      VNData.saveState(STATE); initDashboard();
      setTimeout(() => Activity.mountRepeat(el), 800);
    };
    play(1);
  },

  mountMatching(el) {
    // Emoji stand-ins for images
    const images = ["🚆", "🚻", "🖼️", "💊", "🏨"];
    const pool = VNData.ALL_ITEMS.filter(i => i.pattern && i.pattern.includes("{PLACE}")).slice(0, 5);
    const pairs = pool.map((p, idx) => ({ img: images[idx], word: p.pattern.replace("{PLACE}", ["la gare","les toilettes","le musée","la pharmacie","l’hôtel"][idx]) }));
    const tiles = [...pairs.map((p, i) => ({ id: "i" + i, label: p.img, match: "w" + i })),
                   ...pairs.map((p, i) => ({ id: "w" + i, label: p.word, match: "i" + i }))].sort(() => Math.random() - .5);
    const open = new Set();
    const matched = new Set();
    el.innerHTML = `
      <div class="cardlet">
        <div class="row" style="justify-content:center;flex-wrap:wrap;gap:10px">
          ${tiles.map(t => `<button class="tile" data-id="${t.id}" data-match="${t.match}" style="min-width:90px">${t.label}</button>`).join("")}
        </div>
        <div id="mFb" class="caption"></div>
      </div>
    `;
    $$(".tile").forEach(b => b.onclick = () => {
      if (matched.has(b.dataset.id)) return;
      if (open.has(b.dataset.id)) return;
      open.add(b.dataset.id);
      b.classList.add("pill");
      if (open.size === 2) {
        const [a, c] = Array.from(open);
        const A = $(`.tile[data-id="${a}"]`), C = $(`.tile[data-id="${c}"]`);
        if (A.dataset.match === c || C.dataset.match === a) {
          matched.add(a); matched.add(c);
          A.classList.add("active"); C.classList.add("active");
          $("#mFb").textContent = "Match";
          STATE.profile.points += 2; addHistory(2);
          VNData.saveState(STATE); initDashboard();
          if (matched.size === tiles.length) $("#mFb").textContent = "Great job";
        } else {
          $("#mFb").textContent = "Try again";
          setTimeout(() => { A.classList.remove("pill"); C.classList.remove("pill"); }, 450);
        }
        open.clear();
      }
    });
  },

  mountCloze(el) {
    const pool = [
      { fr: "Je ___ à Paris.", options: ["habite", "habites", "habitent"], answer: "habite" },
      { fr: "Où ___ la gare", options: ["est", "sont", "êtes"], answer: "est" },
      { fr: "Je voudrais ___ café.", options: ["un", "une", "des"], answer: "un" },
    ];
    const q = pool[Math.floor(Math.random() * pool.length)];
    el.innerHTML = `
      <div class="cardlet">
        <p class="bigword">${q.fr} ?</p>
        <div class="row" style="justify-content:center;flex-wrap:wrap;">
          ${q.options.map(o => `<button class="opt" data-ok="${o === q.answer}">${o}</button>`).join("")}
        </div>
        <div id="cFb" class="caption"></div>
      </div>
    `;
    $$(".opt").forEach(b => b.onclick = () => {
      const ok = b.dataset.ok === "true";
      $("#cFb").textContent = ok ? "Correct" : "Nope";
      const pts = ok ? 3 : 1; STATE.profile.points += pts; addHistory(pts);
      VNData.saveState(STATE); initDashboard();
      setTimeout(() => Activity.mountCloze(el), 600);
    });
  },

  mountPronounce(el) {
    const pool = VNData.dueItems(STATE, 12);
    const target = pool[Math.floor(Math.random() * pool.length)];
    el.innerHTML = `
      <div class="cardlet">
        <p class="bigword">${target.fr}</p>
        <p class="ipa">${target.ipa || ""}</p>
        <div class="row" style="justify-content:center;">
          <button id="pPlay">▶</button>
          <button id="pSlow">Slow</button>
          <button id="pRecord">Record</button>
        </div>
        <div id="pScore" class="caption"></div>
      </div>
    `;
    $("#pPlay").onclick = () => AudioCtl.speak(target.fr);
    $("#pSlow").onclick = () => AudioCtl.speak(target.fr, { rate: .85 });
    $("#pRecord").onclick = async () => {
      $("#pScore").textContent = "Listening...";
      const score = await AudioCtl.listenAndScore(target.fr);
      $("#pScore").textContent = `Pronunciation score: ${score}`;
      VNData.updateSRS(STATE, target.id, score >= 70);
      const pts = Math.round(score / 20); STATE.profile.points += pts; addHistory(pts);
      VNData.saveState(STATE); initDashboard();
      setTimeout(() => Activity.mountPronounce(el), 800);
    };
  }
};

function mountActivity(mode) {
  const el = $("#activity");
  $$(".pill").forEach(p => p.classList.remove("active"));
  $(`.pill[data-mode="${mode}"]`).classList.add("active");
  if (mode === "flashcards") Activity.mountFlashcards(el);
  if (mode === "quiz") Activity.mountQuiz(el);
  if (mode === "dictation") Activity.mountDictation(el);
  if (mode === "repeat") Activity.mountRepeat(el);
  if (mode === "matching") Activity.mountMatching(el);
  if (mode === "cloze") Activity.mountCloze(el);
  if (mode === "pronounce") Activity.mountPronounce(el);
}

function initLearnNav() {
  $$(".learn-nav .pill").forEach(p => p.onclick = () => mountActivity(p.dataset.mode));
  mountActivity("flashcards");
}

/* Games tab */

function initGame() {
  const list = () => VNData.dueItems(STATE, 30);
  $("#gameStart").onclick = () => SnakeGame.start(list());
  $("#gameSlow").onclick = () => { SnakeGame.stop(); SnakeGame.start(list()); };
  $("#gameFast").onclick = () => { SnakeGame.stop(); SnakeGame.start(list()); };
  $("#gameRepeat").onclick = () => {
    const t = $("#gameWord").textContent;
    if (t) AudioCtl.speak(t);
  };
  $("#gameSlowRead").onclick = () => {
    const t = $("#gameWord").textContent;
    if (t) AudioCtl.speak(t, { rate: .82 });
  };
}

/* Quick Review */

function initQuickReview() {
  let timer = null, endAt = 0;
  function start(mins) {
    const area = $("#qrArea");
    endAt = Date.now() + mins * 60000;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      const left = Math.max(0, endAt - Date.now());
      const mm = String(Math.floor(left / 60000)).padStart(2, "0");
      const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
      $("#qrTimer").textContent = `${mm}:${ss}`;
      if (left <= 0) {
        clearInterval(timer);
        area.innerHTML = "<div class='cardlet'>Time’s up. Great job.</div>";
        addBadge(STATE, "quick-review", "Quick review");
        VNData.saveState(STATE);
      }
    }, 250);
    Activity.mountFlashcards(area);
  }
  $("#qrStart").onclick = () => start(3);
  $("#qrStart5").onclick = () => start(5);
}

/* Exam */

function initExam() {
  $("#examStart").onclick = () => {
    const area = $("#examArea");
    const pool = VNData.dueItems(STATE, 20);
    let i = 0, score = 0;
    const ask = () => {
      const target = pool[i];
      if (!target) {
        $("#examScore").textContent = `${score} / ${pool.length}`;
        if (score >= 16) addBadge(STATE, "weekly-exam", "Weekly exam");
        area.innerHTML = "<div class='cardlet'>Done</div>";
        VNData.saveState(STATE); initDashboard();
        return;
      }
      const opts = [target, ...VNData.sampleOther(VNData.ALL_ITEMS, target, 3)].sort(() => Math.random() - .5);
      area.innerHTML = `
        <div class="cardlet">
          <p class="bigword">${target.fr}</p>
          <div class="row" style="justify-content:center;flex-wrap:wrap;">
            ${opts.map(o => `<button class="opt" data-id="${o.id}">${o.en}</button>`).join("")}
          </div>
        </div>
      `;
      $$(".opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.id === target.id;
        score += ok ? 1 : 0;
        STATE.profile.points += ok ? 5 : 1; addHistory(ok ? 5 : 1);
        i++; ask();
      });
      AudioCtl.speak(target.fr);
      $("#examScore").textContent = `${score} / ${pool.length}`;
    };
    ask();
  };
}

/* Settings */

function initSettings() {
  $("#profileName").value = STATE.profile.name || "";
  $("#profileName").onchange = e => { STATE.profile.name = e.target.value; VNData.saveState(STATE); };

  // Mascot upload
  $("#mascotFile").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("vn_mascot", reader.result);
      $("#brandMascot").src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  const savedMascot = localStorage.getItem("vn_mascot");
  if (savedMascot) $("#brandMascot").src = savedMascot;

  // Voices
  const vs = AudioCtl.refreshVoices();
  const sel = $("#voiceSelect");
  sel.innerHTML = vs.map(v => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`).join("");
  sel.onchange = () => { STATE.profile.voiceURI = sel.value; AudioCtl.setVoice(sel.value); VNData.saveState(STATE); };
  if (STATE.profile.voiceURI) sel.value = STATE.profile.voiceURI;
  AudioCtl.setVoice(sel.value);

  // Export import
  $("#exportData").onclick = () => {
    const blob = new Blob([localStorage.getItem("vn_state_v1") || "{}"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "voyage-notebook-data.json";
    a.click();
  };
  $("#importData").onclick = () => $("#importFile").click();
  $("#importFile").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    localStorage.setItem("vn_state_v1", text);
    location.reload();
  };

  // Reset
  $("#factoryReset").onclick = () => {
    if (confirm("Erase all local data")) {
      localStorage.removeItem("vn_state_v1");
      localStorage.removeItem("vn_mascot");
      location.reload();
    }
  };
}

/* Init */

function initTopNav() {
  // tabs already wired in initTabs
  $("#subtitle").textContent = "French learning journey";
}

function ready() {
  initTopNav();
  initTabs();
  initTheme();
  initLang();
  initMute();
  initDashboard();
  initLearnNav();
  initGame();
  initQuickReview();
  initExam();
  initSettings();
  touchStreak();
  VNData.saveState(STATE);

  // Learn nav keyboard hint
  document.addEventListener("keydown", e => {
    if (e.key === " ") { e.preventDefault(); AudioCtl.speak($("#gameWord").textContent || ""); }
  });

  // Interface language reductions: start with English labels and captions, slowly fade to French.
  // Here we keep UI static. Exercises already mix EN prompts and FR targets.
}

document.addEventListener("DOMContentLoaded", ready);
