/* ==========================================================================
   منصة الاستفهام — محرك التفاعل
   ========================================================================== */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STORE = {
  get(k, d){ try{ const v = localStorage.getItem('istifham_' + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('istifham_' + k, JSON.stringify(v)); }catch(e){} }
};

/* ---------- toast ---------- */
let toastEl = null, toastT = null;
function toast(msg, icon = '✓'){
  if(!toastEl){
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = `<span style="font-size:16px">${icon}</span><span>${msg}</span>`;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------- reading progress ---------- */
function initReadbar(){
  const bar = $('#readbar > i');
  if(!bar) return;
  const upd = () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    bar.style.width = Math.min(100, Math.max(0, p * 100)) + '%';
  };
  addEventListener('scroll', upd, {passive:true});
  addEventListener('resize', upd);
  upd();
}

/* ---------- nav: active link on scroll ---------- */
function initScrollSpy(){
  const links = $$('.nav-links a[href^="#"]');
  if(!links.length) return;
  const sections = links.map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) })).filter(x => x.el);
  const spy = () => {
    const y = scrollY + 140;
    let cur = sections[0];
    for(const s of sections){ if(s.el.offsetTop <= y) cur = s; }
    links.forEach(a => a.classList.toggle('on', a === cur.a));
  };
  addEventListener('scroll', spy, {passive:true});
  spy();
}

/* ---------- mobile drawer ---------- */
function initDrawer(){
  const btn = $('#menuBtn'), drawer = $('#drawer');
  if(!btn || !drawer) return;
  const close = () => drawer.classList.remove('open');
  btn.addEventListener('click', () => drawer.classList.toggle('open'));
  $('#drawerBg')?.addEventListener('click', close);
  $$('#drawer a').forEach(a => a.addEventListener('click', close));
}

/* ---------- theme + font size ---------- */
function initPrefs(){
  const body = document.body;
  if(STORE.get('theme', 'dark') === 'light') body.classList.add('light');
  if(STORE.get('narrow', false)) body.classList.add('narrow');

  const tBtn = $('#themeBtn');
  tBtn?.addEventListener('click', () => {
    body.classList.toggle('light');
    STORE.set('theme', body.classList.contains('light') ? 'light' : 'dark');
    tBtn.classList.toggle('active', body.classList.contains('light'));
    toast(body.classList.contains('light') ? 'الوضع الورقي (فاتح)' : 'الوضع الليلي (داكن)', '◐');
  });
  tBtn?.classList.toggle('active', body.classList.contains('light'));

  const wBtn = $('#widthBtn');
  wBtn?.addEventListener('click', () => {
    body.classList.toggle('narrow');
    STORE.set('narrow', body.classList.contains('narrow'));
    toast(body.classList.contains('narrow') ? 'عرض قراءة مركّز' : 'عرض كامل', '⇄');
  });

  // font size
  let fs = STORE.get('fs', 100);
  const applyFs = v => {
    fs = Math.min(140, Math.max(88, v));
    const pct = fs / 100;
    document.body.style.setProperty('--z', pct);
    document.body.style.zoom = pct;
    STORE.set('fs', fs);
  };
  applyFs(fs);
  $('#fsUp')?.addEventListener('click', () => { applyFs(fs + 5); toast('تكبير الخط ' + fs + '%', 'A+'); });
  $('#fsDown')?.addEventListener('click', () => { applyFs(fs - 5); toast('تصغير الخط ' + fs + '%', 'A−'); });
}

/* ---------- accordions ---------- */
function initAcc(){
  $$('.acc-h').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
  });
  $$('[data-open-all]').forEach(b => b.addEventListener('click', () => {
    const scope = document.querySelector(b.dataset.openAll);
    const accs = $$('.acc', scope || document);
    const allOpen = accs.every(a => a.classList.contains('open'));
    accs.forEach(a => a.classList.toggle('open', !allOpen));
    b.textContent = b.dataset.label ? (allOpen ? b.dataset.label : 'إغلاق') : (allOpen ? 'فتح الكل' : 'إغلاق الكل');
  }));
  $$('[data-close-all]').forEach(b => b.addEventListener('click', () => {
    const scope = document.querySelector(b.dataset.closeAll);
    $$('.acc', scope || document).forEach(a => a.classList.remove('open'));
    toast('تم إغلاق كل العناصر', '↺');
  }));
}

/* ---------- flashcards ---------- */
function initFlash(){
  $$('.fc').forEach(c => c.addEventListener('click', () => c.classList.toggle('flip')));
  $('#fcShuffle')?.addEventListener('click', () => {
    const wrap = $('#fcWrap');
    if(!wrap) return;
    const cards = [...wrap.children];
    cards.sort(() => Math.random() - .5).forEach(c => { c.classList.remove('flip'); wrap.appendChild(c); });
    toast('تم خلط البطاقات', '↻');
  });
}

/* ---------- blank click-to-reveal ---------- */
function initBlanks(){
  $$('.blank').forEach(b => {
    b.addEventListener('click', () => {
      if(b.classList.contains('revealed')){ b.classList.remove('revealed'); b.classList.add('blank-hidden'); }
      else { b.classList.remove('blank-hidden'); b.classList.add('revealed'); }
    });
  });
  $$('[data-blank-all]').forEach(btn => btn.addEventListener('click', () => {
    const scope = document.querySelector(btn.dataset.blankAll);
    const bl = $$('.blank', scope || document);
    const all = bl.every(b => b.classList.contains('revealed'));
    bl.forEach(b => { b.classList.toggle('revealed', !all); b.classList.toggle('blank-hidden', all); });
    btn.textContent = all ? 'إظهار جميع الأجوبة' : 'إخفاء جميع الأجوبة';
  }));
}

/* ---------- question bank rendering ---------- */
function renderBank(){
  const host = $('#bankList');
  if(!host || !window.BANK) return;

  let cat = 'الكل';
  const BANK = window.BANK;
  const cats = ['الكل', ...new Set(BANK.map(q => q.cat))];

  const chips = $('#bankChips');
  if(chips){
    chips.innerHTML = cats.map((c, i) =>
      `<button class="chip ${i===0?'on':''}" data-cat="${c}">${c} <span style="opacity:.6">${c==='الكل'?BANK.length:BANK.filter(q=>q.cat===c).length}</span></button>`
    ).join('');
    chips.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if(!b) return;
      $$('.chip', chips).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      cat = b.dataset.cat;
      paint();
    });
  }

  function paint(){
    const list = cat === 'الكل' ? BANK : BANK.filter(q => q.cat === cat);
    host.innerHTML = list.map((q, i) => `
      <article class="q" data-i="${i}">
        <div class="q-head">
          <div class="q-n">${i + 1}</div>
          <div>
            <div class="q-txt">${q.q}</div>
            <div style="margin-top:7px">
              <span class="tag ${q.src === 'وزاري' ? 'r' : 'b'}">${q.src}</span>
              <span class="tag">${q.cat}</span>
            </div>
          </div>
        </div>
        <div class="q-opts">
          ${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${'أبتث'[k] || k+1}</span><span>${o}</span></button>`).join('')}
        </div>
        <div class="q-ans"><b>الجواب:</b> ${q.o[q.a]}<br><b>التعليل:</b> ${q.e}</div>
        <div class="q-act">
          <button class="btn btn-ghost btn-sm" data-show>عرض الجواب والتعليل</button>
        </div>
      </article>`).join('');
  }

  host.addEventListener('click', e => {
    const card = e.target.closest('.q'); if(!card) return;
    const data = (cat === 'الكل' ? BANK : BANK.filter(q => q.cat === cat))[+card.dataset.i];
    const opt = e.target.closest('.opt');
    if(opt && data){
      const opts = $$('.opt', card);
      if(opts.some(o => o.classList.contains('locked'))) return;
      opts.forEach(o => o.classList.add('locked'));
      const k = +opt.dataset.k;
      if(k === data.a){ opt.classList.add('correct'); toast('إجابة صحيحة!', '✓'); }
      else { opt.classList.add('wrong'); opts[data.a].classList.add('correct'); }
      $('.q-ans', card).classList.add('show');
      $('[data-show]', card).textContent = 'إخفاء الجواب';
      return;
    }
    if(e.target.closest('[data-show]')){
      const ans = $('.q-ans', card);
      ans.classList.toggle('show');
      e.target.closest('[data-show]').textContent = ans.classList.contains('show') ? 'إخفاء الجواب' : 'عرض الجواب والتعليل';
    }
  });

  paint();
}

/* ==========================================================================
   Quiz engine
   ========================================================================== */
const Quiz = {
  pool: [], idx: 0, answers: [], timer: null, left: 0, perQ: 0, cfg: null,

  start(hostId, cfg){
    const host = document.getElementById(hostId) || this.el;
    if(!host) return;
    const pool = cfg.build();
    if(!pool.length){ host.innerHTML = '<p class="muted">لا توجد أسئلة.</p>'; return; }
    this.pool = pool.sort(() => Math.random() - .5).slice(0, cfg.limit || pool.length);
    this.idx = 0; this.answers = []; this.cfg = cfg; this.el = host;
    this.render(host);
    this.beginTimer();
    setTimeout(() => host.scrollIntoView({behavior:'smooth', block:'center'}), 80);
  },

  beginTimer(){
    clearInterval(this.timer);
    if(!this.cfg.seconds) return;
    this.left = this.cfg.seconds;
    const el = this.el ? this.el.querySelector('#qzTimer') : $('#qzTimer');
    const tick = () => {
      if(!el) return;
      const m = String(Math.floor(this.left / 60)).padStart(2, '0');
      const s = String(this.left % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
      el.style.color = this.left <= 30 ? 'var(--rose)' : '';
      if(this.left <= 0){ clearInterval(this.timer); this.finish(true); return; }
      this.left--;
    };
    tick();
    this.timer = setInterval(tick, 1000);
  },

  render(host){
    const q = this.pool[this.idx];
    const n = this.pool.length;
    host.innerHTML = `
      <div class="quiz-shell">
        <div class="quiz-top">
          <h3>${this.cfg.title}</h3>
          <div class="quiz-meta">
            ${this.cfg.seconds ? `<div class="badge rose">⏱ <span id="qzTimer">--:--</span></div>` : ''}
            <div class="badge">السؤال ${this.idx + 1} / ${n}</div>
            <div class="badge gold">النقاط: <b id="qzScore">0</b></div>
          </div>
        </div>
        <div class="quiz-body">
          <div class="qz-progress"><i id="qzBar"></i></div>
          <div class="qz-q"><span class="qnum">${this.idx + 1}.</span>${q.q}</div>
          <div class="qz-opts" id="qzOpts">
            ${q.o.map((o, k) => `<button class="qz-opt" data-k="${k}"><span class="k">${'أبتث'[k] || k+1}</span><span>${o}</span></button>`).join('')}
          </div>
          <div class="qz-expl" id="qzExpl"><b>التعليل:</b> ${q.e}</div>
          <div class="qz-foot">
            <button class="btn btn-gold btn-sm" id="qzNext" disabled>السؤال التالي →</button>
            <span class="spacer"></span>
            <button class="btn btn-ghost btn-sm" id="qzQuit">إنهاء الامتحان</button>
          </div>
        </div>
      </div>`;
    const root = host;
    root.querySelector('#qzBar').style.width = ((this.idx) / n * 100) + '%';
    root.querySelector('#qzScore').textContent = this.answers.filter(a => a.ok).length * 5;
    this.bind(root);
  },

  bind(root){
    const q = this.pool[this.idx];
    const opts = [...root.querySelectorAll('#qzOpts .qz-opt')];
    const expl = root.querySelector('#qzExpl');
    const next = root.querySelector('#qzNext');
    const scoreEl = root.querySelector('#qzScore');
    let picked = false;
    opts.forEach(btn => {
      btn.addEventListener('click', () => {
        if(picked) return;
        picked = true;
        const k = +btn.dataset.k;
        const ok = k === q.a;
        opts.forEach(b => b.classList.add('dis'));
        btn.classList.add(ok ? 'ok' : 'no');
        if(!ok) opts[q.a].classList.add('ok');
        expl.classList.add('show');
        this.answers.push({ q, k, ok });
        scoreEl.textContent = this.answers.filter(a => a.ok).length * 5;
        next.disabled = false;
        next.textContent = this.idx === this.pool.length - 1 ? 'عرض النتيجة »' : 'السؤال التالي →';
      });
    });
    next.addEventListener('click', () => {
      if(this.idx < this.pool.length - 1){ this.idx++; this.render(root); }
      else this.finish(false);
    });
    root.querySelector('#qzQuit').addEventListener('click', () => this.finish(false));
  },

  finish(timeout){
    clearInterval(this.timer);
    const hostEl = this.el;
    const host = hostEl && hostEl.isConnected ? hostEl : document.getElementById(this.cfg.host);
    if(!host) return;
    this.el = host;
    const total = this.pool.length;
    const right = this.answers.filter(a => a.ok).length;
    const pct = Math.round(right / total * 100);
    const wrong = this.answers.filter(a => !a.ok);
    const skipped = total - this.answers.length;
    const grade = pct >= 90 ? 'ممتاز' : pct >= 80 ? 'جيد جداً' : pct >= 70 ? 'جيد' : pct >= 50 ? 'متوسط' : 'يحتاج مراجعة';
    const circ = 2 * Math.PI * 76;

    host.innerHTML = `
      <div class="quiz-shell">
        <div class="quiz-body">
          <div class="result">
            <div class="ring">
              <svg width="172" height="172">
                <circle cx="86" cy="86" r="76" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="11"/>
                <circle cx="86" cy="86" r="76" fill="none" stroke="url(#gg)" stroke-width="11"
                  stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ - circ * pct / 100}"/>
                <defs><linearGradient id="gg"><stop offset="0" stop-color="#e6b64c"/><stop offset="1" stop-color="#35d0a5"/></linearGradient></defs>
              </svg>
              <div class="val">${pct}%</div>
            </div>
            <h3>${timeout ? 'انتهى الوقت ⏰' : 'نتيجتك: ' + grade}</h3>
            <p>أجبت بشكل صحيح على <b>${right}</b> من <b>${total}</b> سؤالاً.</p>
            <div class="res-grid">
              <div class="res-cell"><b style="color:var(--jade)">${right}</b><span>صحيحة</span></div>
              <div class="res-cell"><b style="color:var(--rose)">${this.answers.length - right}</b><span>خاطئة</span></div>
              <div class="res-cell"><b>${skipped}</b><span>متروكة</span></div>
              <div class="res-cell"><b>${right * 5}</b><span>نقطة</span></div>
            </div>
            ${wrong.length ? `
              <div style="text-align:right;max-width:760px;margin:26px auto 0">
                <h4 style="font-size:16px;margin-bottom:12px;color:var(--gold-soft)">مراجعة الأخطاء</h4>
                ${wrong.map(w => `
                  <div class="q" style="margin-bottom:10px">
                    <div class="q-txt" style="font-size:14.5px;margin-bottom:7px">${w.q.q}</div>
                    <div style="font-size:13.5px;color:var(--jade)">✓ ${w.q.o[w.q.a]}</div>
                    <div style="font-size:13px;color:var(--mute);margin-top:5px">${w.q.e}</div>
                  </div>`).join('')}
              </div>` : `<p style="color:var(--jade);font-weight:800;margin-top:20px">إجابات كاملة! أتقنت هذا المحور.</p>`}
            <div class="qz-foot" style="justify-content:center">
              <button class="btn btn-gold btn-sm" id="qzAgain">إعادة الامتحان ↻</button>
              <a class="btn btn-ghost btn-sm" href="#bank">مراجعة بنك الأسئلة</a>
            </div>
          </div>
        </div>
      </div>`;

    if(pct >= 80) toast('نتيجة ممتازة! ' + pct + '%', '★');
    STORE.set('lastScore_' + this.cfg.id, {pct, right, total, at: Date.now()});
    this.updateDashboard();
    host.querySelector('#qzAgain')?.addEventListener('click', () => this.start(this.cfg.host, this.cfg));
  }
};

/* ---------- fill-in-the-blanks renderer ---------- */
function renderFill(){
  const host = $('#fillList');
  if(!host || !window.FILL) return;
  const FILL = window.FILL;
  host.innerHTML = FILL.map((f, i) => `
    <article class="q">
      <div class="q-head">
        <div class="q-n">${i + 1}</div>
        <div class="q-txt">
          ${f.q.replace('____', `<span class="blank blank-hidden" data-ans="${f.a}">${f.a}</span>`)}
          <div style="margin-top:7px"><span class="tag b">${f.cat}</span></div>
        </div>
      </div>
    </article>`).join('');
  $$('.blank', host).forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('revealed');
    b.classList.toggle('blank-hidden');
  }));
}

/* ---------- site search ---------- */
function initSearch(){
  const inp = $('#searchInput');
  if(!inp) return;
  const idx = [];
  // index headings & paragraphs
  $$('section.block').forEach(sec => {
    $$('h3, h4, .q-txt, .acc-h, p, li', sec).forEach(el => {
      const t = el.textContent.trim();
      if(t.length > 12 && t.length < 400) idx.push({ t, el, sec });
    });
  });
  const out = $('#searchResults');
  let tmr;
  inp.addEventListener('input', () => {
    clearTimeout(tmr);
    tmr = setTimeout(() => {
      const v = inp.value.trim();
      if(v.length < 2){ out.innerHTML = '<p class="muted">اكتب كلمتين على الأقل للبحث في كل أقسام المنصة…</p>'; return; }
      const res = idx.filter(x => x.t.includes(v)).slice(0, 12);
      out.innerHTML = res.length
        ? res.map(r => `
          <a href="#${r.sec.id}" class="search-hit" data-txt="${r.t.slice(0,120)}">
            <b>${r.sec.querySelector('h2')?.textContent || ''}</b>
            <span>${r.t.slice(0, 150)}${r.t.length > 150 ? '…' : ''}</span>
          </a>`).join('')
        : `<p class="muted">لا نتائج لـ «${v}» — جرّب كلمة أخرى مثل: التقرير، كم، أيان، الهمزة.</p>`;
    }, 180);
  });
  out.addEventListener('click', e => {
    const a = e.target.closest('.search-hit');
    if(a) setTimeout(() => out.scrollIntoView({behavior:'smooth', block:'center'}), 60);
  });
}

/* ---------- copy section link ---------- */
function initDeepLinks(){
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const url = location.origin + location.pathname + b.dataset.copy;
    navigator.clipboard?.writeText(url).then(() => toast('تم نسخ رابط القسم', '⧉')).catch(() => toast('تعذّر النسخ', '!'));
  }));
}

/* ---------- reveal on scroll ----------
   Safety-first: content must NEVER stay invisible. Anything already in (or above)
   the viewport is revealed immediately; an observer handles the rest; a scroll
   listener + a final timer guarantee full reveal even if the IO misfires. */
function initReveal(){
  const items = $$('.rv');
  if(!items.length) return;
  // Only enable the hide-then-animate behaviour when we can actually drive it.
  if(!('IntersectionObserver' in window) || !('requestAnimationFrame' in window)){
    document.documentElement.classList.remove('js-anim');
    return;
  }
  document.documentElement.classList.add('js-anim');
  const reveal = el => { if(el && !el.classList.contains('in')) el.classList.add('in'); };
  const inView = el => {
    const r = el.getBoundingClientRect();
    return r.top < (innerHeight || 800) * .92 && r.bottom > -80;
  };
  // 1) reveal everything currently at/above the viewport right away
  items.forEach(el => { if(inView(el)) reveal(el); });
  // 2) observe the rest
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(e => {
      if(e.isIntersecting){ reveal(e.target); io.unobserve(e.target); }
    }), {threshold:0, rootMargin:'0px 0px -8% 0px'});
    items.forEach(el => { if(!el.classList.contains('in')) io.observe(el); });
  }
  // 3) belt & braces: on scroll (throttled) and once after load, reveal in-view items
  let t = 0;
  const sweep = () => { items.forEach(el => { if(inView(el)) reveal(el); }); };
  addEventListener('scroll', () => {
    if(t) return;
    t = requestAnimationFrame(() => { t = 0; sweep(); });
  }, {passive:true});
  addEventListener('resize', sweep, {passive:true});
  setTimeout(sweep, 400);
  setTimeout(() => items.forEach(reveal), 2500);   // absolute guarantee
  // 4) never leave content hidden if printing
  addEventListener('beforeprint', () => items.forEach(reveal));
}

/* ---------- counters ---------- */
function initCounters(){
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count;
    let cur = 0;
    const step = Math.max(1, Math.ceil(end / 40));
    const t = setInterval(() => {
      cur += step;
      if(cur >= end){ cur = end; clearInterval(t); }
      el.textContent = cur;
    }, 26);
  });
}

/* ---------- exam configs (defined per page) ---------- */
window.QUIZ_CFG = {
  hasla: {
    id:'hasla', host:'quizHasla', title:'امتحان: هل والهمزة', limit:12, seconds:300,
    build: () => window.BANK.filter(q => q.cat === 'هل والهمزة')
  },
  manma: {
    id:'manma', host:'quizManMa', title:'امتحان: من وما', limit:12, seconds:300,
    build: () => window.BANK.filter(q => q.cat === 'من وما')
  },
  zaman: {
    id:'zaman', host:'quizZaman', title:'امتحان: الزمان والمكان والحال', limit:12, seconds:300,
    build: () => window.BANK.filter(q => q.cat === 'الزمان والمكان والحال')
  },
  kam: {
    id:'kam', host:'quizKam', title:'امتحان: كم وأي', limit:10, seconds:240,
    build: () => window.BANK.filter(q => q.cat === 'كم وأي')
  },
  balagha: {
    id:'balagha', host:'quizBalagha', title:'امتحان: الأغراض البلاغية', limit:12, seconds:360,
    build: () => window.BANK.filter(q => q.cat === 'الأغراض البلاغية')
  },
  final: {
    id:'final', host:'quizFinal', title:'الامتحان النهائي الشامل', limit:25, seconds:900,
    build: () => window.BANK.slice()
  }
};

/* ---------- results dashboard ---------- */
Quiz.updateDashboard = function(){
  const host = document.querySelector('#progressGrid');
  if(!host) return;
  const keys = [
    ['hasla','هل والهمزة'],['manma','من وما'],['zaman','الزمان والمكان والحال'],
    ['kam','كم وأي'],['balagha','الأغراض البلاغية'],['final','النهائي الشامل']
  ];
  host.innerHTML = keys.map(([k, name]) => {
    const r = STORE.get('lastScore_' + k, null);
    const pct = r && typeof r === 'object' ? r.pct : (typeof r === 'number' ? r : null);
    const ok = pct === null ? null : pct >= 60;
    return `<div class="res-cell" style="text-align:center">
      <b style="color:${pct===null?'var(--mute)':ok?'var(--jade)':'var(--rose)'}">${pct===null?'—':pct+'%'}</b>
      <span>${name}</span>
    </div>`;
  }).join('');
  const done = keys.reduce((n,[k]) => {
    const r = STORE.get('lastScore_' + k, null);
    return n + (r !== null ? 1 : 0);
  }, 0);
  const el = document.querySelector('#progressDone');
  if(el) el.textContent = done + ' / 6';
};

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initReadbar();
  initScrollSpy();
  initDrawer();
  initPrefs();
  initAcc();
  initFlash();
  initBlanks();
  renderBank();
  renderFill();
  initSearch();
  initDeepLinks();
  initReveal();
  initCounters();
  Quiz.updateDashboard();

  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => {
    document.querySelector(b.dataset.scroll)?.scrollIntoView({behavior:'smooth', block:'start'});
  }));

  $$('[data-reset-progress]').forEach(b => b.addEventListener('click', () => {
    ['hasla','manma','zaman','kam','balagha','final'].forEach(k => localStorage.removeItem('istifham_lastScore_' + k));
    Quiz.updateDashboard();
    toast('تم تصفير سجل النتائج', '↺');
  }));

  $$('[data-quiz]').forEach(btn => btn.addEventListener('click', () => {
    const cfg = window.QUIZ_CFG[btn.dataset.quiz];
    if(cfg) Quiz.start(cfg.host, cfg);
  }));

  // number keys select quiz options when a quiz is visible
  addEventListener('keydown', e => {
    if(!/^[1-4]$/.test(e.key)) return;
    const act = document.activeElement;
    if(act && /INPUT|TEXTAREA/.test(act.tagName)) return;
    const shells = [...document.querySelectorAll('.quiz-body')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.top < innerHeight * .7 && r.bottom > 100;
    });
    const shell = shells[0];
    if(!shell) return;
    const opts = shell.querySelectorAll('.qz-opt');
    const o = opts[+e.key - 1];
    if(o) o.click();
  });

  // keyboard shortcuts
  addEventListener('keydown', e => {
    if(e.key === '/' && document.activeElement !== $('#searchInput')){
      const s = $('#searchInput');
      if(s){ e.preventDefault(); s.focus(); s.scrollIntoView({behavior:'smooth', block:'center'}); }
    }
  });

  window.__quiz = Quiz;
});
})();
