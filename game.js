/* Mouse & Cheese canvas game using today's list */

(function () {
  const canvas = document.getElementById("snakeCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const grid = 24;
  const cols = Math.floor(canvas.width / grid);
  const rows = Math.floor(canvas.height / grid);

  let running = false;
  let tickMs = 130;
  let loopId = null;

  const state = {
    mouse: [{ x: 4, y: 4 }],
    dir: { x: 1, y: 0 },
    cheese: { x: 12, y: 10 },
    lives: 3,
    score: 0,
    idx: 0,
    list: [],
  };

  function reset(list) {
    state.mouse = [{ x: 4, y: 4 }];
    state.dir = { x: 1, y: 0 };
    state.cheese = randCell();
    state.lives = 3;
    state.score = 0;
    state.idx = 0;
    state.list = list;
    updateHUD();
  }

  function randCell() {
    return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  }

  function drawBackground() {
    const ctx2 = ctx;
    ctx2.fillStyle = "#121316";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
    // subtle grid
    ctx2.fillStyle = "rgba(255,255,255,.03)";
    for (let x = 0; x < cols; x++) ctx2.fillRect(x * 24, 0, 1, canvas.height);
    for (let y = 0; y < rows; y++) ctx2.fillRect(0, y * 24, canvas.width, 1);
  }

  function drawMouse() {
    ctx.fillStyle = "#e6fbff";
    for (const p of state.mouse) ctx.fillRect(p.x * 24, p.y * 24, 23, 23);
    // ear and tail accents
    const head = state.mouse[0];
    ctx.fillStyle = "#87c0ff";
    ctx.fillRect(head.x * 24 + 6, head.y * 24 + 4, 6, 6);
  }

  function drawCheese() {
    ctx.fillStyle = "#ffd85e";
    ctx.beginPath();
    ctx.arc(state.cheese.x * 24 + 12, state.cheese.y * 24 + 12, 24 / 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function step() {
    const head = { ...state.mouse[0] };
    head.x += state.dir.x;
    head.y += state.dir.y;

    // collision with wall or self
    const hitWall = head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
    const hitSelf = state.mouse.some(p => p.x === head.x && p.y === head.y);
    if (hitWall || hitSelf) {
      state.lives--;
      state.mouse = [{ x: 4, y: 4 }];
      state.dir = { x: 1, y: 0 };
      if (state.lives <= 0) {
        stop();
        badgeTry("first-game");
      }
      updateHUD();
      draw();
      return;
    }

    state.mouse.unshift(head);

    // cheese
    if (head.x === state.cheese.x && head.y === state.cheese.y) {
      state.score++;
      tickMs = Math.max(70, tickMs - 4); // speed up
      state.cheese = randCell();
      onCheese();
    } else {
      state.mouse.pop();
    }

    draw();
  }

  function draw() {
    drawBackground();
    drawCheese();
    drawMouse();
  }

  function onCheese() {
    const w = state.list[state.idx % state.list.length];
    state.idx++;
    updateHUD(w);
    // show on screen
    document.getElementById("gameWord").textContent = w.fr;
    document.getElementById("gameIPA").textContent = w.ipa || "";
    document.getElementById("gameSubtitle").textContent = w.fr;

    // say the word
    AudioCtl.speak(w.fr, { rate: 1 });
    // add points to profile
    const appState = VNData.loadState();
    appState.profile.points += 5;
    if (appState.profile.points >= appState.profile.level * 120) {
      appState.profile.level++;
      addBadge(appState, "level-" + appState.profile.level, "Level " + appState.profile.level);
    }
    VNData.saveState(appState);
    document.getElementById("kpi-points-val").textContent = appState.profile.points;
    document.getElementById("kpi-level-val").textContent = appState.profile.level;
  }

  function updateHUD() {
    document.getElementById("gameScore").textContent = "Score " + state.score;
    document.getElementById("gameLives").textContent = "❤".repeat(state.lives);
  }

  function start(list) {
    if (running) return;
    reset(list);
    running = true;
    tickMs = 130;
    if (loopId) clearInterval(loopId)
    loopId = setInterval(step, tickMs);
    draw();
  }
  function stop() {
    running = false;
    if (loopId) clearInterval(loopId);
  }

  // Controls
  window.addEventListener("keydown", e => {
    const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!m) return;
    const [x, y] = m;
    if (state.mouse.length > 1) {
      // prevent reversing into itself
      if (x === -state.dir.x && y === -state.dir.y) return;
    }
    state.dir = { x, y };
  });

  // Public API for app.js
  window.SnakeGame = { start, stop, draw };
})();
