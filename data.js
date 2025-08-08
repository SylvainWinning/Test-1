/* Data and curriculum generator */

const SEED_WORDS = [
  // Common A2–B1 words and phrases, grouped with hints and simple IPA samples when safe.
  { id: "w1", fr: "bonjour", en: "hello", ipa: "/bɔ̃.ʒuʁ/", type: "word" },
  { id: "w2", fr: "merci", en: "thank you", ipa: "/mɛʁ.si/", type: "word" },
  { id: "w3", fr: "s’il vous plaît", en: "please", ipa: "/sil vu plɛ/", type: "phrase" },
  { id: "w4", fr: "je m’appelle", en: "my name is", ipa: "/ʒə ma.pɛl/", type: "phrase", pattern: "je m’appelle {NAME}" },
  { id: "w5", fr: "j’habite à", en: "I live in", ipa: "/ʒa.bit a/", type: "phrase", pattern: "j’habite à {CITY}" },
  { id: "w6", fr: "pouvez-vous répéter", en: "can you repeat", ipa: "/pu.ve vu ʁe.pe.te/", type: "phrase" },
  { id: "w7", fr: "hier", en: "yesterday", type: "word" },
  { id: "w8", fr: "demain", en: "tomorrow", type: "word" },
  { id: "w9", fr: "toujours", en: "always", type: "word" },
  { id: "w10", fr: "souvent", en: "often", type: "word" },
  { id: "w11", fr: "parler", en: "to speak", type: "verb" },
  { id: "w12", fr: "manger", en: "to eat", type: "verb" },
  { id: "w13", fr: "boire", en: "to drink", type: "verb" },
  { id: "w14", fr: "aller", en: "to go", type: "verb" },
  { id: "w15", fr: "venir", en: "to come", type: "verb" },
  { id: "w16", fr: "je voudrais", en: "I would like", type: "phrase" },
  { id: "w17", fr: "combien ça coûte", en: "how much is it", type: "phrase" },
  { id: "w18", fr: "où est", en: "where is", type: "phrase", pattern: "où est {PLACE}" },
  { id: "w19", fr: "aujourd’hui", en: "today", type: "word" },
  { id: "w20", fr: "désolé", en: "sorry", ipa: "/de.zo.le/", type: "word" },
];

const CITY = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille"];
const PLACE = ["la gare", "les toilettes", "le musée", "la pharmacie", "l’hôtel"];
const NAME = ["Anna", "Emily", "Sarah", "Jessica", "Kate"];

/** Generate phrases from patterns */
function expandItems(seed = SEED_WORDS) {
  const out = [];
  for (const it of seed) {
    if (it.pattern) {
      if (it.pattern.includes("{CITY}")) {
        for (const c of CITY) out.push({ ...it, id: it.id + "-" + c, fr: it.pattern.replace("{CITY}", c) });
      } else if (it.pattern.includes("{PLACE}")) {
        for (const p of PLACE) out.push({ ...it, id: it.id + "-" + p, fr: it.pattern.replace("{PLACE}", p) });
      } else if (it.pattern.includes("{NAME}")) {
        for (const n of NAME) out.push({ ...it, id: it.id + "-" + n, fr: it.pattern.replace("{NAME}", n) });
      }
    } else {
      out.push(it);
    }
  }
  return out;
}

const ALL_ITEMS = expandItems();

/** Leitner spaced repetition configuration */
const LEITNER = {
  boxes: 5,
  intervals: [0, 1, 2, 4, 7], // days until due again
};

/** Build or load app state */
function loadState() {
  const raw = localStorage.getItem("vn_state_v1");
  if (raw) return JSON.parse(raw);
  // initial state
  const today = new Date().toISOString().slice(0, 10);
  const items = {};
  for (const i of ALL_ITEMS) {
    items[i.id] = { id: i.id, box: 1, last: today, next: today, correct: 0, wrong: 0 };
  }
  const state = {
    profile: { name: "Traveler", ui: "en", theme: "light", mute: false, voiceURI: null, level: 1, points: 0, streak: 0, lastActive: today, badges: [] },
    srs: { items },
    history: [],
  };
  saveState(state);
  return state;
}
function saveState(state) {
  localStorage.setItem("vn_state_v1", JSON.stringify(state));
}

/** Compute due items for today */
function dueItems(state, limit = 20) {
  const today = new Date().toISOString().slice(0, 10);
  const arr = [];
  for (const rec of Object.values(state.srs.items)) {
    if (rec.next <= today) {
      const base = ALL_ITEMS.find(x => x.id === rec.id);
      if (base) arr.push({ ...base, srs: rec });
    }
  }
  // ensure mix of words and phrases
  arr.sort((a, b) => (a.type > b.type ? 1 : -1));
  return arr.slice(0, limit);
}

/** Update SRS after an answer */
function updateSRS(state, id, ok) {
  const it = state.srs.items[id];
  if (!it) return;
  const today = new Date();
  if (ok) {
    it.box = Math.min(LEITNER.boxes, it.box + 1);
    it.correct++;
  } else {
    it.box = Math.max(1, it.box - 1);
    it.wrong++;
  }
  const next = new Date();
  next.setDate(today.getDate() + LEITNER.intervals[it.box - 1]);
  it.last = today.toISOString().slice(0, 10);
  it.next = next.toISOString().slice(0, 10);
}

/** Utility to pick distractors */
function sampleOther(arr, correct, k = 3) {
  const pool = arr.filter(x => x.id !== correct.id);
  const out = [];
  while (out.length < k && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

window.VNData = {
  ALL_ITEMS,
  loadState,
  saveState,
  dueItems,
  updateSRS,
  sampleOther,
};
