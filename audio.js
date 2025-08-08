/* TTS, captions and pronunciation scoring */

const AudioCtl = (() => {
  let voices = [];
  let voiceURI = null;
  let muted = false;

  function refreshVoices() {
    voices = speechSynthesis.getVoices().filter(v =>
      v.lang.toLowerCase().startsWith("fr")
    );
    return voices;
  }

  function setVoice(uri) { voiceURI = uri; }
  function setMuted(m) { muted = m; }

  function speak(text, { rate = 1, pitch = 1, volume = 1, onend } = {}) {
    // Always show subtitles
    const captionEls = [document.getElementById("captionArea"), document.getElementById("gameSubtitle")];
    captionEls.forEach(el => { if (el) el.textContent = text; });

    if (muted) {
      if (onend) setTimeout(onend, Math.max(500, Math.min(2500, text.length * 40)));
      return;
    }
    if (!window.speechSynthesis) {
      console.warn("TTS not supported");
      if (onend) setTimeout(onend, 600);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    if (voiceURI) {
      const v = voices.find(v => v.voiceURI === voiceURI);
      if (v) u.voice = v;
    }
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    u.onend = onend || null;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // STT scoring using Web Speech API when available, else string similarity
  function listenAndScore(targetText, { timeout = 5000 } = {}) {
    return new Promise(resolve => {
      const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{Nd}\s']/gu, "").trim();
      const target = norm(targetText);

      const scoreFromText = heard => {
        const h = norm(heard);
        resolve(similarityScore(target, h));
      };

      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Rec) {
        console.warn("STT not supported, fallback to manual input prompt");
        const manual = prompt("Say the phrase aloud, then type what you said:");
        scoreFromText(manual || "");
        return;
      }
      const rec = new Rec();
      rec.lang = "fr-FR";
      rec.interimResults = false;
      let done = false;

      rec.onresult = e => {
        done = true;
        const text = Array.from(e.results).map(r => r[0].transcript).join(" ");
        scoreFromText(text);
      };
      rec.onerror = () => {
        if (!done) scoreFromText("");
      };
      rec.onend = () => {
        if (!done) scoreFromText("");
      };
      rec.start();
      setTimeout(() => { try { rec.stop(); } catch {} }, timeout);
    });
  }

  // 0 to 100
  function similarityScore(a, b) {
    if (!a && !b) return 100;
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    const sim = Math.max(0, 1 - dist / maxLen);
    return Math.round(sim * 100);
  }

  function levenshtein(a, b) {
    const m = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) m[i][0] = i;
    for (let j = 0; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        m[i][j] = Math.min(
          m[i - 1][j] + 1,
          m[i][j - 1] + 1,
          m[i - 1][j - 1] + cost
        );
      }
    }
    return m[a.length][b.length];
  }

  return { refreshVoices, setVoice, setMuted, speak, listenAndScore, similarityScore };
})();

window.AudioCtl = AudioCtl;
