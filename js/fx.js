/* ============================================================
 * fx.js —— 星空画布（呼吸星 / 流星 / 终幕星爆）+ DOM 粒子爆发
 * ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let stars = [];
  let meteors = [];
  let sparks = [];
  let mode = "home";
  let meteorTimer = 1.2;
  let lastT = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
  }

  function makeStars() {
    const count = Math.round((W * H) / 6500);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(.6, 1.7),
        phase: Math.random() * Math.PI * 2,
        speed: rand(.5, 1.6),
        base: rand(.35, .85)
      });
    }
  }

  function spawnMeteor() {
    const dir = Math.random() < .78 ? 1 : -1;
    meteors.push({
      x: dir === 1 ? rand(W * .15, W * .95) : rand(W * .05, W * .85),
      y: rand(-20, H * .35),
      vx: dir * rand(6.5, 10),
      vy: rand(2.8, 4.6),
      life: 0,
      ttl: rand(.8, 1.25)
    });
  }

  /* 终幕：从屏幕中上部向四周一次性爆开的星星 */
  function finaleBurst() {
    const cx = W / 2, cy = H * .42;
    for (let i = 0; i < (reduceMotion ? 18 : 64); i++) {
      const ang = Math.random() * Math.PI * 2;
      const upBias = -Math.abs(Math.sin(ang)) * rand(.5, 2.2);
      const sp = rand(1.5, 8.5);
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp + upBias,
        r: rand(1.2, 2.8),
        life: 0,
        ttl: rand(1.4, 2.8)
      });
    }
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    const t = performance.now() / 1000;

    /* 呼吸星 */
    for (const s of stars) {
      const a = reduceMotion ? s.base : s.base + Math.sin(t * s.speed + s.phase) * .25;
      ctx.globalAlpha = Math.max(.1, a);
      ctx.fillStyle = "#FFF6C8";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 流星 */
    if (mode === "meteor" || mode === "finale") {
      meteorTimer -= dt;
      if (meteorTimer <= 0) {
        spawnMeteor();
        meteorTimer = mode === "meteor" ? rand(1.8, 4.2) : rand(2.6, 5.5);
      }
    }

    meteors = meteors.filter((m) => {
      m.life += dt;
      m.x += m.vx;
      m.y += m.vy;
      const fade = Math.max(0, 1 - m.life / m.ttl);
      const tailX = m.x - m.vx * 11;
      const tailY = m.y - m.vy * 11;
      const g = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      g.addColorStop(0, `rgba(255,250,225,${.9 * fade})`);
      g.addColorStop(1, "rgba(255,250,225,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      return m.life < m.ttl && m.x > -80 && m.x < W + 80 && m.y < H + 80;
    });

    /* 终幕火花 */
    sparks = sparks.filter((p) => {
      p.life += dt;
      p.vy += .045;
      p.x += p.vx;
      p.y += p.vy;
      const fade = Math.max(0, 1 - p.life / p.ttl);
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#FFE9A8";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * fade + .4, 0, Math.PI * 2);
      ctx.fill();
      return p.life < p.ttl;
    });
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000) || .016;
    lastT = now;
    if (document.body.dataset.sky === "on") draw(dt);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  /* ---------- DOM 粒子爆发（拆礼物 / 撒花 / 信封开启） ---------- */
  function burst(target, opts) {
    opts = opts || {};
    const count = opts.count || 24;
    const colors = opts.colors || ["#FFD66B", "#FFF6C8", "#FF8A7A", "#E8B86D"];
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "spark";
      const size = rand(5, 10);
      dot.style.width = dot.style.height = size + "px";
      dot.style.left = (cx - size / 2) + "px";
      dot.style.top = (cy - size / 2) + "px";
      dot.style.background = colors[i % colors.length];
      document.body.appendChild(dot);

      const ang = Math.random() * Math.PI * 2;
      const dist = rand(50, opts.spread || 120);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - rand(10, 50);
      dot.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * .55}px, ${dy * .55 + 14}px) scale(1.05)`, opacity: 1, offset: .55 },
          { transform: `translate(${dx}px, ${dy + 90}px) scale(.4)`, opacity: 0 }
        ],
        { duration: rand(900, 1400), easing: "cubic-bezier(.2,.7,.3,1)" }
      ).onfinish = () => dot.remove();
    }
  }

  window.FX = {
    setMode(m) {
      mode = m;
      meteorTimer = m === "meteor" ? rand(.4, 1.2) : rand(2, 3.5);
      if (m === "finale") finaleBurst();
    },
    burst,
  };
})();
