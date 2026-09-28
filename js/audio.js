/* ============================================================
 * audio.js —— 零素材音频：八音盒旋律（五声音阶实时合成）
 *             + 快门声、吹蜡烛声
 * ============================================================ */
(function () {
  "use strict";

  let ctx = null;
  let master = null;
  let musicBus = null;
  let timer = null;
  let nextBeatTime = 0;
  let playing = false;

  const BEAT = .46;          /* 每个拍位的秒数 */
  const LOOP = 16;

  /* 旋律：A 宫五声音阶（A C D E G），温柔上行再回落 */
  const melody = [
    { n: 69, b: 0,    d: .9 },
    { n: 72, b: 1,    d: .9 },
    { n: 74, b: 2,    d: .5 },
    { n: 72, b: 3,    d: .5 },
    { n: 69, b: 4,    d: .9 },
    { n: 67, b: 5,    d: .9 },
    { n: 69, b: 6.5,  d: .5 },
    { n: 72, b: 7.5,  d: .9 },
    { n: 74, b: 8,    d: .9 },
    { n: 76, b: 9,    d: .9 },
    { n: 79, b: 10,   d: .5 },
    { n: 76, b: 11,   d: .5 },
    { n: 74, b: 12,   d: .9 },
    { n: 72, b: 13,   d: .9 },
    { n: 69, b: 14,   d: .9 },
    { n: 67, b: 15,   d: 1.1 }
  ];

  /* 低音：每 4 拍一个根音 */
  const bass = [
    { n: 45, b: 0  },
    { n: 48, b: 4  },
    { n: 50, b: 8  },
    { n: 43, b: 12 }
  ];

  function freq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = .9;
    master.connect(ctx.destination);

    /* 八音盒的回声空间 */
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = BEAT * .82;
    const fb = ctx.createGain();
    fb.gain.value = .32;
    const wet = ctx.createGain();
    wet.gain.value = .28;
    musicBus.connect(master);
    musicBus.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(master);
  }

  function musicNote(time, midi, dur, vel) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq(midi);
    const g = ctx.createGain();
    const peak = .32 * vel;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + .008);
    g.gain.exponentialRampToValueAtTime(.0001, time + Math.min(dur * 1.35, 1.7));
    osc.connect(g);
    g.connect(musicBus);
    osc.start(time);
    osc.stop(time + 1.8);
  }

  function bassNote(time, midi) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(.14, time + .03);
    g.gain.exponentialRampToValueAtTime(.0001, time + BEAT * 3.6);
    osc.connect(g); g.connect(musicBus);
    osc.start(time);
    osc.stop(time + BEAT * 4);
  }

  /* 调度器：每 100ms 检查并安排接下来 0.4 秒内的音 */
  function scheduler() {
    if (!ctx || !playing) return;
    while (nextBeatTime < ctx.currentTime + .45) {
      const beatIndex = Math.round((nextBeatTime - loopStart) / BEAT);
      const b = ((beatIndex % LOOP) + LOOP) % LOOP;
      for (const m of melody) if (m.b === b) {
        musicNote(nextBeatTime, m.n, m.d * BEAT, m.n > 74 ? .8 : 1);
      }
      for (const bs of bass) if (bs.b === b) bassNote(nextBeatTime, bs.n);
      nextBeatTime += BEAT;
    }
  }
  let loopStart = 0;

  const Audio = {
    /* 任意用户点击时解锁音频 */
    unlock() {
      ensureContext();
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    },

    get playing() { return playing; },

    /* 返回 Promise<boolean>：真正开始发声才算成功。
       手机浏览器自动播放被拦时，需要用户在月亮场景里再点一次 */
    async startMusic() {
      ensureContext();
      if (!ctx) return false;
      if (ctx.state !== "running") {
        try { await ctx.resume(); } catch (e) { /* 仍被拦截 */ }
      }
      if (ctx.state !== "running") return false;
      if (playing) return true;
      playing = true;
      loopStart = ctx.currentTime + .12;
      nextBeatTime = loopStart;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, .0001), ctx.currentTime);
      musicBus.gain.linearRampToValueAtTime(1, ctx.currentTime + .7);
      timer = setInterval(scheduler, 100);
      scheduler();
      return true;
    },

    pauseMusic() {
      if (!ctx || !playing) return;
      playing = false;
      clearInterval(timer);
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
      musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + .35);
    },

    /* 离开场景：淡出后挂起，省电 */
    leaveMusic() {
      if (!ctx) return;
      const wasPlaying = playing;
      playing = false;
      clearInterval(timer);
      if (wasPlaying) {
        musicBus.gain.cancelScheduledValues(ctx.currentTime);
        musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, .0001), ctx.currentTime);
        musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + .8);
        setTimeout(() => ctx.state === "running" && ctx.suspend(), 900);
      }
    },

    /* 快门：白噪声短促爆破 */
    shutter() {
      ensureContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const t = ctx.currentTime;
      const len = .14 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1900;
      bp.Q.value = .7;
      const g = ctx.createGain();
      g.gain.value = .28;
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t);
    },

    /* 吹蜡烛：低通气声，频率下扫 */
    blow() {
      ensureContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const t = ctx.currentTime;
      const len = .8 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * .88 + white * .12;           /* 布朗噪声，更像风 */
        data[i] = last * 1.8 * (1 - i / len);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(820, t);
      lp.frequency.exponentialRampToValueAtTime(210, t + .72);
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t);
      g.gain.linearRampToValueAtTime(.3, t + .12);
      g.gain.exponentialRampToValueAtTime(.0001, t + .78);
      src.connect(lp); lp.connect(g); g.connect(master);
      src.start(t);
    }
  };

  window.Audio = Audio;

  /* 从后台切回来时，iOS 可能把音频挂起，自动恢复 */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !ctx || !playing) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  });
})();
