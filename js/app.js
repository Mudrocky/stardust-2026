/* ============================================================
 * app.js —— 路由、进度存储、六个场景交互、信封五幕状态机
 * ============================================================ */
(function () {
  "use strict";

  const C = window.CONTENT;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fill = (t) => String(t).replace(/\{name\}/g, C.name);
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  /* 每次触摸都确保音频处于解锁状态（不只第一次：
     手机浏览器可能在首次手势之后仍保持 suspended，需要持续尝试） */
  document.addEventListener("pointerdown", () => window.Audio && Audio.unlock());

  /* ---------------- 进度存储 ---------------- */
  const STORE_KEY = "gift-progress-v1";
  const KEYS = ["star", "moon", "gift", "cake", "camera", "letter"];
  let store = { visited: {} };
  try {
    Object.assign(store, JSON.parse(localStorage.getItem(STORE_KEY) || "{}"));
    store.visited = store.visited || {};
  } catch (e) { /* 忽略隐私模式 */ }

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  function markVisited(key) {
    if (!store.visited[key]) { store.visited[key] = true; saveStore(); }
  }
  function visitedCount() { return KEYS.filter((k) => store.visited[k]).length; }

  /* ---------------- 文案填充 ---------------- */
  function fillContent() {
    $("introTitle").textContent = C.intro.title;
    $("introTap").textContent = C.intro.tap;
    $("homeHint").textContent = C.home.hint;

    $("starTease").textContent = C.star.tease;
    $("starLines").innerHTML = C.star.lines.map((l) => `<p>${l}</p>`).join("");

    $("songTitle").textContent = "♪ " + C.moon.title;
    $("songSub").textContent = C.moon.sub;

    $("giftLead").textContent = C.gift.lead;
    $("giftHint").textContent = "点一下，拆开它";
    $("couponNote").textContent = C.gift.note;

    $("cakeLead").textContent = C.cake.lead;
    $("cakeDone").textContent = C.cake.done;
    $("tray").innerHTML = C.cake.toppings
      .map((t) => `<button type="button" data-t="${t}">${t}</button>`).join("");

    $("camLead").textContent = C.camera.lead;
    $("camHint").textContent = "点快门，把记忆洗出来";

    $("act1Line").textContent = C.letter.act1;
    $("openLetter").textContent = C.letter.openBtn;
    $("envHi0").textContent = fill(C.letter.greeting[0]);
    $("envHi1").textContent = C.letter.greeting[1];
    $("act3Lead").textContent = C.letter.act3lead;
    $("letterCards").innerHTML = C.letter.cards
      .map((c) => `<button class="lc" data-key="${c.key}">${c.title}<span class="lc-dot"></span></button>`)
      .join("");
    $("toFinal").textContent = C.letter.toFinal;
    $("wishText").textContent = C.letter.wish;
    $("bdayBig").textContent = fill(C.letter.birthday);
    $("finalLine").textContent = C.letter.finalLine;

    $("epiLine1").textContent = C.letter.epilogue[0];
    $("epiLine2").textContent = C.letter.epilogue[1];
    $("epiBtn").textContent = C.letter.epilogueBtn;
  }

  /* ---------------- 提示条策略 ---------------- */
  /* 所有提示条：轻点即可关闭 */
  $$(".tap-hint").forEach((h) =>
    h.addEventListener("click", () => { h.style.display = "none"; }));

  /* 场景走到结尾时，让返回按钮呼吸高亮，提示怎么回去 */
  function setBackAttn(on) { $("backHome").classList.toggle("attn", on); }

  /* 首页引导语：只在第一次进入时短暂显示，轻点或几秒后淡出 */
  function maybeHomeHint() {
    const hint = $("homeHint");
    if (store.hintSeen) return;
    hint.classList.add("show");
    store.hintSeen = true; saveStore();
    setTimeout(() => hint.classList.remove("show"), 4200);
  }
  $("homeHint").addEventListener("click", () => $("homeHint").classList.remove("show"));

  /* ---------------- 小插画（无照片时的 SVG 替代） ---------------- */
  function artSVG(type) {
    const wrap = (inner, bg) =>
      `<svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
        <rect width="200" height="150" fill="${bg}"/>${inner}</svg>`;
    if (type === "laugh") {
      return wrap(`
        <circle cx="100" cy="78" r="46" fill="#FFD9B0" stroke="#3A2E2A" stroke-width="2.5"/>
        <path d="M82 68 q5 -5 10 0" fill="none" stroke="#3A2E2A" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M108 68 q5 -5 10 0" fill="none" stroke="#3A2E2A" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M78 86 q22 26 44 0" fill="none" stroke="#3A2E2A" stroke-width="3" stroke-linecap="round"/>
        <circle cx="146" cy="42" r="10" fill="#FFD66B"/>`,
        "#F6C9B8");
    }
    if (type === "sky") {
      return wrap(`
        <circle cx="156" cy="36" r="18" fill="#FFE9A8"/>
        <ellipse cx="70" cy="96" rx="46" ry="18" fill="#FFFFFF" opacity=".92"/>
        <ellipse cx="104" cy="86" rx="34" ry="15" fill="#FFFFFF" opacity=".92"/>
        <ellipse cx="50" cy="116" rx="70" ry="12" fill="#FFFFFF" opacity=".75"/>`,
        "#AED4EF");
    }
    if (type === "plates") {
      return wrap(`
        <ellipse cx="70" cy="112" rx="42" ry="12" fill="#FFFFFF" stroke="#3A2E2A" stroke-width="2"/>
        <ellipse cx="140" cy="112" rx="42" ry="12" fill="#FFFFFF" stroke="#3A2E2A" stroke-width="2"/>
        <rect x="90" y="62" width="22" height="34" rx="4" fill="#FF8A7A" stroke="#3A2E2A" stroke-width="2"/>
        <ellipse cx="101" cy="62" rx="11" ry="4" fill="#F0715F" stroke="#3A2E2A" stroke-width="2"/>
        <path d="M40 96 q8 -10 16 0M118 96 q8 -10 16 0" stroke="#B9B0A0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
        "#F0E3CC");
    }
    if (type === "day") {
      return wrap(`
        <circle cx="150" cy="36" r="17" fill="#FFD66B"/>
        <path d="M0 150 L52 86 L96 150 Z" fill="#B9D8A5"/>
        <path d="M64 150 L128 74 L192 150 Z" fill="#9CCB8C"/>
        <ellipse cx="52" cy="104" rx="26" ry="10" fill="#FFFFFF" opacity=".85"/>`,
        "#CFE9F7");
    }
    if (type === "night") {
      return wrap(`
        <circle cx="150" cy="34" r="18" fill="#F4F1E4"/>
        <circle cx="144" cy="30" r="15" fill="#1B1F4A"/>
        <rect x="20" y="82" width="40" height="68" fill="#22284E"/>
        <rect x="66" y="64" width="52" height="86" fill="#2B3160"/>
        <rect x="126" y="92" width="36" height="58" fill="#22284E"/>
        <g fill="#FFE9A8">
          <rect x="30" y="94" width="7" height="9"/><rect x="44" y="94" width="7" height="9"/>
          <rect x="80" y="78" width="8" height="9"/><rect x="97" y="78" width="8" height="9"/>
          <rect x="80" y="98" width="8" height="9"/><rect x="136" y="104" width="7" height="9"/>
        </g>`,
        "#10133A");
    }
    /* blank：留白拍立得 */
    return wrap(`
      <rect x="52" y="42" width="96" height="66" rx="8" fill="none" stroke="#B7AFA0"
            stroke-width="2.5" stroke-dasharray="7 7"/>
      <path d="M100 62 v26 M87 75 h26" stroke="#B7AFA0" stroke-width="2.5" stroke-linecap="round"/>`,
      "#F3EEE3");
  }

  /* ============================================================
   * ⭐ 星星
   * ============================================================ */
  function resetStar() {
    $("scene-star").classList.remove("revealed");
    $("starHint").style.display = "";
  }
  /* 整个场景都可点，避免只有点中文字才触发 */
  $("scene-star").addEventListener("click", () => {
    const s = $("scene-star");
    if (s.classList.contains("revealed")) return;
    s.classList.add("revealed");
    $("starHint").style.display = "none";
    setBackAttn(true);
  });

  /* ============================================================
   * 🌙 月亮
   * ============================================================ */
  function enterMoon() {
    $("moonHint").hidden = true;
    $("musicToggle").textContent = "暂停 ♪";
    document.body.classList.add("music-on");
    /* 手机可能拦截自动播放：失败则提示用户点一下月亮 */
    Audio.startMusic().then((ok) => {
      if (ok) return;
      document.body.classList.remove("music-on");
      $("musicToggle").textContent = "播放 ♪";
      $("moonHint").hidden = false;
    });
  }
  function leaveMoon() {
    Audio.leaveMusic();
    document.body.classList.remove("music-on");
  }
  /* 防重入：iOS 上一次点按可能同时触发多个事件，避免“播放→立即又暂停” */
  let toggleLockUntil = 0;
  async function toggleMusic() {
    const now = Date.now();
    if (now < toggleLockUntil) return;
    toggleLockUntil = now + 400;
    if (Audio.playing) {
      Audio.pauseMusic();
      document.body.classList.remove("music-on");
      $("musicToggle").textContent = "播放 ♪";
      return;
    }
    $("musicToggle").textContent = "暂停 ♪";
    const ok = await Audio.startMusic();   /* 这次在真实点击手势里，手机会放行 */
    if (ok) {
      document.body.classList.add("music-on");
      $("moonHint").hidden = true;
    } else {
      $("musicToggle").textContent = "播放 ♪";
      $("moonHint").hidden = false;
    }
  }
  $("moonBtn").addEventListener("click", toggleMusic);
  $("musicToggle").addEventListener("click", toggleMusic);
  /* 场景空白处也能点响：手机拦截自动播放时，用户随便点一下月亮页面即可 */
  $("scene-moon").addEventListener("click", (e) => {
    if (e.target.closest("#moonBtn, #musicToggle")) return;
    if (!Audio.playing) toggleMusic();
  });

  /* ============================================================
   * 🎁 礼物
   * ============================================================ */
  let couponIdx = 0;

  function resetGift() {
    $("scene-gift").classList.remove("opened");
    $("couponDeck").hidden = true;
    $("couponNote").hidden = true;
    $("couponNext").style.display = "";
    $("giftHint").style.display = "";
    couponIdx = 0;
  }

  function renderCoupon() {
    const item = C.gift.coupons[couponIdx];
    const card = $("couponCard");
    card.innerHTML =
      `<span class="c-icon">${item.icon}</span>
       <span class="c-title">${item.title}</span>
       <span class="c-desc">${item.desc}</span>`;
    card.classList.remove("swap");
    void card.offsetWidth;
    card.classList.add("swap");
    $("couponDots").innerHTML = C.gift.coupons
      .map((_, i) => `<i class="${i === couponIdx ? "on" : ""}"></i>`).join("");
    $("couponNext").textContent =
      couponIdx === C.gift.coupons.length - 1 ? "收好啦" : "下一张 →";
  }

  /* 整个场景都可点，而不是只点礼物盒 */
  $("scene-gift").addEventListener("click", () => {
    const scene = $("scene-gift");
    if (scene.classList.contains("opened")) return;
    scene.classList.add("opened");
    $("giftHint").style.display = "none";
    vibrate(20);
    FX.burst($("giftStage"), {
      count: 30,
      colors: ["#FFD66B", "#FFF6C8", "#FF8A7A", "#E8B86D", "#FFFFFF"],
      spread: 150
    });
    setTimeout(() => {
      $("couponDeck").hidden = false;
      $("couponNote").hidden = true;
      renderCoupon();
    }, 850);
  });

  $("couponNext").addEventListener("click", () => {
    if (couponIdx < C.gift.coupons.length - 1) {
      couponIdx++;
      renderCoupon();
    } else {
      $("couponNote").hidden = false;
      $("couponNext").style.display = "none";
      setBackAttn(true);
    }
  });

  /* ============================================================
   * 🎂 小蛋糕
   * ============================================================ */
  let toppingCount = 0;

  function resetCake() {
    $("toppingLayer").innerHTML = "";
    $("cakeDone").hidden = true;
    toppingCount = 0;
  }

  $("tray").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const t = btn.dataset.t;
    const span = document.createElement("span");
    span.textContent = t;
    const left = 34 + Math.random() * 32;   /* 落在顶层蛋糕范围内 */
    const top = 26 + Math.random() * 10;
    span.style.left = left + "%";
    span.style.top = top + "%";
    $("toppingLayer").appendChild(span);
    span.animate(
      [
        { transform: `translate(${Math.random() * 30 - 15}px, -110px) scale(.5)`, opacity: 0 },
        { transform: "translate(0, 0) scale(1.08)", opacity: 1, offset: .75 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 }
      ],
      { duration: 520 + Math.random() * 180, easing: "cubic-bezier(.3,.8,.4,1)" }
    );
    vibrate(8);

    toppingCount++;
    if (toppingCount === 6) {
      $("cakeDone").hidden = false;
      setBackAttn(true);
      FX.burst($("cakeWrap"), {
        count: 34,
        colors: ["#FF8A7A", "#FFD66B", "#E8B86D", "#F4A7B9", "#9CCB8C"],
        spread: 160
      });
      vibrate([12, 60, 12]);
    }
  });

  /* ============================================================
   * 📷 相机
   * ============================================================ */
  let photoIdx = 0;
  const stackPos = [
    { dx: -46, dy: 14, rot: -7 },
    { dx: 42, dy: -6, rot: 6 },
    { dx: -16, dy: 38, rot: -3 },
    { dx: 34, dy: 30, rot: 8 }
  ];

  function resetCamera() {
    $("photoStack").innerHTML = "";
    $("photoModal").hidden = true;
    $("shutterBtn").disabled = false;
    $("camHint").textContent = "点快门，把记忆洗出来";
    $("camHint").style.display = "";
    photoIdx = 0;
  }

  function photoInner(item) {
    const img = item.photo
      ? `<img src="${item.photo}" alt="${item.title || ""}">`
      : artSVG(item.type);
    return `<div class="ph-img">${img}</div><div class="ph-cap">${item.cap}</div>`;
  }

  $("shutterBtn").addEventListener("click", () => {
    if (photoIdx >= C.camera.photos.length) return;
    const item = C.camera.photos[photoIdx];
    const scene = $("scene-camera");
    scene.classList.add("flashing");
    setTimeout(() => scene.classList.remove("flashing"), 320);
    Audio.shutter();
    vibrate(12);

    const p = document.createElement("div");
    p.className = "polaroid";
    p.innerHTML = photoInner(item);
    const pos = stackPos[photoIdx];
    $("photoStack").appendChild(p);
    p.animate(
      [
        { transform: "translate(-50%, -50%) scale(1.5) rotate(0deg)", opacity: 0 },
        { transform: `translate(calc(-50% + ${pos.dx}px), calc(-50% + ${pos.dy}px)) rotate(${pos.rot}deg) scale(1)`, opacity: 1 }
      ],
      { duration: 480, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" }
    );

    p.addEventListener("click", () => {
      $("pmCard").innerHTML = photoInner(item);
      $("photoModal").hidden = false;
    });

    photoIdx++;
    if (photoIdx >= C.camera.photos.length) {
      $("shutterBtn").disabled = true;
      $("camHint").textContent = "点一点照片，可以放大看";
      setBackAttn(true);
    }
  });

  $("photoModal").addEventListener("click", () => { $("photoModal").hidden = true; });

  /* ============================================================
   * ✉️ 信封 · 五幕
   * ============================================================ */
  const letterScene = $("scene-letter");
  const actSub = $("actSub");
  let subRead = { memories: false, keywords: false, words: false };
  let act2Ready = false;

  function act(n) {
    $$(".act", letterScene).forEach((el) =>
      el.classList.toggle("show", el.classList.contains("act-" + n)));
  }

  function resetLetter() {
    [1, 2, 3, 5].forEach((n) =>
      $$(".act-" + n, letterScene).forEach((el) => el.classList.remove("show")));
    actSub.removeAttribute("data-panel");
    actSub.classList.remove("show");
    $("envelope").classList.remove("open");
    $("act5").classList.remove("out", "blessed");
    $("act2Hint").hidden = true;
    $("act2Hint").style.display = "";
    $("toFinal").hidden = true;
    $("wishBack").style.display = "";
    $("couponNext").style.display = "";
    letterScene.classList.remove("sub-open", "blessed");
    document.body.classList.remove("sub-open");
    subRead = { memories: false, keywords: false, words: false };
    act2Ready = false;
    $$(".lc").forEach((b) => b.classList.remove("read"));
    buildLetterSubs();
    act(1);
  }

  /* 构建三个子页面内容（每次重置时重建，保证入场动画重播） */
  function buildLetterSubs() {
    /* 记忆卡 */
    $("memDeck").innerHTML = C.letter.memories.map((m) => {
      let body;
      if (m.kind === "chat") {
        body = `<div class="chat">${m.bubbles.map((b) =>
          `<div class="bubble ${b.side}">${b.text}</div>`).join("")}</div>
          <p class="mem-caption">${m.caption}</p>`;
      } else {
        const pic = m.photo ? `<img src="${m.photo}" alt="">` : artSVG(m.kind);
        body = `<div class="mem-photo">${pic}</div>
          ${m.lines.map((l) => `<p>${l}</p>`).join("")}`;
      }
      return `<div class="mem-card"><div class="mem-inner">
        <div class="mem-title"><span class="m-icon">${m.icon}</span>${m.title}</div>
        ${body}</div></div>`;
    }).join("");

    /* 关键词 */
    $("kwList").innerHTML = C.letter.keywords
      .map((k) => `<button class="kw" type="button">
        <span class="kw-tag">${k.tag}</span><span class="kw-text">${k.text}</span>
      </button>`).join("");

    /* 想对你说的话 */
    $("wordsPaper").innerHTML = C.letter.words.map((l) => `<p>${l}</p>`).join("");
  }

  /* 第一幕 → 第二幕：点整幕任意处都能开信 */
  letterScene.querySelector(".act-1").addEventListener("click", () => {
    act(2);
    vibrate(18);
    setTimeout(() => {
      $("envelope").classList.add("open");
      FX.burst($("envelope"), {
        count: 26,
        colors: ["#FFE9A8", "#FFF6C8", "#E8B86D", "#FFFFFF"],
        spread: 130
      });
    }, 350);
    setTimeout(() => {
      act2Ready = true;
      $("act2Hint").hidden = false;
    }, 1900);
  });

  /* 第二幕 → 第三幕 */
  letterScene.querySelector(".act-2").addEventListener("click", () => {
    if (!act2Ready) return;
    act(3);
  });

  /* 第三幕：三个入口 */
  $("letterCards").addEventListener("click", (e) => {
    const btn = e.target.closest(".lc");
    if (!btn) return;
    const key = btn.dataset.key;
    openPanel(key);
    subRead[key] = true;
    btn.classList.add("read");
    vibrate(8);
    if (Object.keys(subRead).every((k) => subRead[k])) $("toFinal").hidden = false;
  });

  let memIdx = 0;
  function openPanel(key) {
    letterScene.classList.add("sub-open");
    document.body.classList.add("sub-open");
    actSub.setAttribute("data-panel", key);
    actSub.classList.add("show");
    if (key === "memories") {
      memIdx = 0;
      updateMemDeck();
    }
    if (key === "words") {
      const w = $("sub-words");
      w.classList.remove("show");
      void w.offsetWidth;
      w.classList.add("show");
    }
  }

  $$(".sub-back").forEach((b) =>
    b.addEventListener("click", () => {
      actSub.removeAttribute("data-panel");
      actSub.classList.remove("show");   /* 必须移除：否则透明容器会盖住第三幕，吞掉后续点击 */
      letterScene.classList.remove("sub-open");
      document.body.classList.remove("sub-open");
    }));

  /* 关键词手风琴 */
  $("kwList").addEventListener("click", (e) => {
    const kw = e.target.closest(".kw");
    if (!kw) return;
    const wasOpen = kw.classList.contains("open");
    $$(".kw", $("kwList")).forEach((k) => k.classList.remove("open"));
    if (!wasOpen) kw.classList.add("open");
  });

  /* 记忆卡翻页 */
  function updateMemDeck() {
    $("memDeck").style.transform = `translateX(-${memIdx * 100}%)`;
    $("memDots").innerHTML = C.letter.memories
      .map((_, i) => `<i class="${i === memIdx ? "on" : ""}"></i>`).join("");
    $("memPrev").disabled = memIdx === 0;
    $("memNext").disabled = memIdx === C.letter.memories.length - 1;
  }
  $("memPrev").addEventListener("click", () => { if (memIdx > 0) { memIdx--; updateMemDeck(); } });
  $("memNext").addEventListener("click", () => {
    if (memIdx < C.letter.memories.length - 1) { memIdx++; updateMemDeck(); }
  });
  /* 手势滑动 */
  (function () {
    const vp = document.querySelector(".mem-viewport");
    let sx = 0;
    vp.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    vp.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 42) dx < 0 ? $("memNext").click() : $("memPrev").click();
    }, { passive: true });
  })();

  /* 第三幕 → 第五幕（变暗、蛋糕、许愿） */
  $("toFinal").addEventListener("click", () => {
    actSub.removeAttribute("data-panel");
    actSub.classList.remove("show");
    letterScene.classList.remove("sub-open");
    document.body.classList.remove("sub-open");
    act(5);
  });

  $("cake5Wrap").addEventListener("click", () => {
    const a5 = $("act5");
    if (a5.classList.contains("out")) return;
    a5.classList.add("out");
    Audio.blow();
    vibrate([24, 80, 24]);
    setTimeout(() => {
      a5.classList.add("blessed");
      document.body.dataset.bg = "night";
      document.body.dataset.sky = "on";
      FX.setMode("finale");
      letterScene.classList.add("blessed");
    }, 1050);
  });

  $("wishBack").addEventListener("click", () => { location.hash = "#/home"; });

  /* ============================================================
   * 彩蛋：六个全部看完
   * ============================================================ */
  let epiShownThisLoad = false;
  function maybeEpilogue() {
    if (epiShownThisLoad || visitedCount() < 6) return;
    epiShownThisLoad = true;
    setTimeout(() => {
      $("epilogue").hidden = false;
      void $("epilogue").offsetWidth;
      $("epilogue").classList.add("show");
    }, 750);
  }
  function closeEpilogue() {
    $("epilogue").classList.remove("show");
    setTimeout(() => { $("epilogue").hidden = true; }, 600);
  }
  $("epiBtn").addEventListener("click", closeEpilogue);
  /* 点彩蛋背景任意处也能关闭：只认小按钮会让用户以为“卡死、点啥都没反应” */
  $("epilogue").addEventListener("click", (e) => {
    if (e.target === $("epilogue")) closeEpilogue();
  });

  /* ============================================================
   * 路由
   * ============================================================ */
  let introTimer = null;
  let leaveHook = null;

  function backLabel() {
    const n = 6 - visitedCount();
    if (n > 1) return `还有 ${n} 个小东西没打开 →`;
    if (n === 1) return "还有最后一个 →";
    return "回到小宇宙";
  }

  const ROUTES = {
    "#/": {
      scene: "scene-intro", bg: "night", sky: true, fx: "home",
      exit: false, back: false,
      enter() {
        $("scene-intro").classList.add("just-came");
        clearTimeout(introTimer);
        introTimer = setTimeout(() => { location.hash = "#/home"; }, 3600);
      }
    },
    "#/home": {
      scene: "scene-home", bg: "night", sky: true, fx: "home",
      exit: false, back: false,
      enter() {
        $$(".orb").forEach((o) => o.classList.toggle("visited", !!store.visited[o.dataset.key]));
        $("doneNum").textContent = visitedCount();
        maybeHomeHint();
        maybeEpilogue();
      }
    },
    "#/star": {
      scene: "scene-star", bg: "night", sky: true, fx: "meteor",
      exit: true, back: true, enter: resetStar
    },
    "#/moon": {
      scene: "scene-moon", bg: "night", sky: true, fx: "home",
      exit: true, back: true, enter: enterMoon, leave: leaveMoon
    },
    "#/gift": {
      scene: "scene-gift", bg: "paper", sky: false, fx: "home",
      exit: true, back: true, enter: resetGift
    },
    "#/cake": {
      scene: "scene-cake", bg: "paper", sky: false, fx: "home",
      exit: true, back: true, enter: resetCake
    },
    "#/camera": {
      scene: "scene-camera", bg: "paper", sky: false, fx: "home",
      exit: true, back: true, enter: resetCamera
    },
    "#/letter": {
      scene: "scene-letter", bg: "dark", sky: false, fx: "home",
      exit: true, back: false, enter: resetLetter
    }
  };

  const SCENE_KEY = {
    "scene-star": "star", "scene-moon": "moon", "scene-gift": "gift",
    "scene-cake": "cake", "scene-camera": "camera", "scene-letter": "letter"
  };

  function applyRoute() {
    const r = ROUTES[location.hash] || ROUTES["#/"];

    clearTimeout(introTimer);
    if (leaveHook) { leaveHook(); leaveHook = null; }

    /* 切场景时关闭所有可能残留的全屏弹层（拍立得大图等），
       否则透明/半透明遮罩会盖在新页面上吞掉点击 */
    $("photoModal").hidden = true;

    $$(".scene").forEach((s) => s.classList.toggle("active", s.id === r.scene));
    document.body.dataset.bg = r.bg;
    document.body.dataset.sky = r.sky ? "on" : "off";
    FX.setMode(r.fx);

    $("exitBtn").hidden = !r.exit;
    $("backHome").hidden = !r.back;
    document.body.classList.toggle("has-back", !!r.back);
    $("exitBtn").classList.toggle("on-paper", r.bg === "paper");
    $("backHome").classList.toggle("on-paper", r.bg === "paper");
    $("backHome").classList.remove("attn");
    $("backHomeText").textContent = backLabel();

    const key = SCENE_KEY[r.scene];
    if (key) markVisited(key);

    if (r.enter) r.enter();
    leaveHook = r.leave || null;
  }

  $("exitBtn").addEventListener("click", () => { location.hash = "#/home"; });
  $("backHome").addEventListener("click", () => { location.hash = "#/home"; });
  $("scene-intro").addEventListener("click", () => { location.hash = "#/home"; });

  window.addEventListener("hashchange", applyRoute);

  /* 启动 */
  fillContent();
  buildLetterSubs();
  if (!location.hash) location.hash = "#/";
  applyRoute();
})();
