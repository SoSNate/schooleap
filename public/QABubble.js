/**
 * QABubble.js — Smart QA Bubble Widget
 * Framework-agnostic Web Component (Custom Element)
 *
 * Usage (HTML):  <script src="QABubble.js"></script>
 * Usage (React): import './QABubble.js'  then  window.QASystem.setContext(route, data)
 *
 * Global API:
 *   window.QASystem.setContext(route, data)  — feed current page/state
 *   window.QASystem.getNotes()               — returns all saved notes
 *   window.QASystem.clearNotes()             — wipe localStorage
 *   window.QASystem.mount(selector?)         — manual mount to element
 */

(function () {
  'use strict';

  // ─── Styles (Shadow DOM — fully isolated) ──────────────────────────────────
  const CSS = `
    :host {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      display: block;
    }

    /* ── Floating Button ── */
    .bubble-btn {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(99, 102, 241, 0.55);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .bubble-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(99, 102, 241, 0.75);
    }
    .bubble-btn svg { fill: white; }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 11px;
      font-weight: 700;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(15,15,30,0.9);
    }
    .badge.visible { display: flex; }

    /* ── Panel ── */
    .panel {
      position: absolute;
      bottom: 66px;
      right: 0;
      width: 360px;
      background: rgba(13, 13, 26, 0.93);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 16px;
      padding: 16px;
      color: #e2e8f0;
      box-shadow: 0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08);
      display: none;
      flex-direction: column;
      gap: 12px;
      max-height: 82vh;
      overflow-y: auto;
    }
    .panel.open {
      display: flex;
      animation: qa-slideUp 0.2s ease;
    }
    @keyframes qa-slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Panel Header ── */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(99,102,241,0.2);
      padding-bottom: 10px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: #a5b4fc;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .close-btn {
      background: none;
      border: none;
      color: #475569;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .close-btn:hover { color: #e2e8f0; }

    /* ── Context Box ── */
    .context-box {
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
    }
    .context-route {
      color: #a5b4fc;
      font-weight: 600;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .context-data {
      color: #475569;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 72px;
      overflow-y: auto;
      line-height: 1.5;
    }

    /* ── Mic Row ── */
    .voice-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mic-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(99,102,241,0.35);
      background: rgba(99,102,241,0.08);
      color: #a5b4fc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .mic-btn:hover  { background: rgba(99,102,241,0.22); border-color: #6366f1; }
    .mic-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .mic-btn.recording {
      background: rgba(239,68,68,0.18);
      border-color: #ef4444;
      color: #ef4444;
      animation: qa-pulse 1.2s infinite;
    }
    @keyframes qa-pulse {
      0%,100% { box-shadow: 0 0 0 0   rgba(239,68,68,0.45); }
      50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0);    }
    }
    .mic-label { font-size: 12px; color: #64748b; }

    /* ── Textarea ── */
    textarea {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 13px;
      padding: 10px;
      resize: vertical;
      min-height: 78px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
      line-height: 1.5;
    }
    textarea:focus   { border-color: #6366f1; }
    textarea::placeholder { color: #334155; }

    /* ── Category Tags ── */
    .categories { display: flex; flex-wrap: wrap; gap: 6px; }
    .cat-btn {
      padding: 4px 11px;
      border-radius: 20px;
      border: 1px solid rgba(99,102,241,0.28);
      background: transparent;
      color: #64748b;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .cat-btn:hover  { border-color: #6366f1; color: #a5b4fc; }
    .cat-btn.active { background: rgba(99,102,241,0.28); border-color: #818cf8; color: #c7d2fe; }

    /* ── Action Buttons ── */
    .actions { display: flex; gap: 8px; }
    .btn-save {
      flex: 1;
      padding: 9px 16px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
    }
    .btn-save:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-export {
      padding: 9px 13px;
      background: transparent;
      border: 1px solid rgba(99,102,241,0.35);
      border-radius: 8px;
      color: #a5b4fc;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .btn-export:hover { background: rgba(99,102,241,0.14); border-color: #6366f1; }

    /* ── Saved Notes List ── */
    .notes-section { border-top: 1px solid rgba(99,102,241,0.12); padding-top: 10px; }
    .notes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .notes-title {
      font-size: 11px;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .btn-clear-all {
      background: none;
      border: 1px solid rgba(239,68,68,0.3);
      color: #ef4444;
      border-radius: 5px;
      font-size: 10px;
      padding: 2px 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-clear-all:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; }
    .note-item {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(99,102,241,0.1);
      border-radius: 7px;
      padding: 8px 10px;
      margin-bottom: 6px;
    }
    .note-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .note-cat  { font-size: 11px; color: #818cf8; }
    .note-time { font-size: 10px; color: #1e293b; }
    .note-text { font-size: 12px; color: #94a3b8; line-height: 1.45; }
    .note-route{ font-size: 10px; color: #1e3a5f; margin-top: 4px; }
    .note-delete {
      background: none;
      border: none;
      color: #334155;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1;
      transition: color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .note-delete:hover { color: #ef4444; background: rgba(239,68,68,0.12); }
    .empty-notes { text-align: center; color: #1e293b; font-size: 12px; padding: 6px 0; }

    /* ── Toast ── */
    .toast {
      position: absolute;
      bottom: 66px;
      right: 0;
      background: rgba(34,197,94,0.92);
      color: white;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: none;
      white-space: nowrap;
    }
    .toast.show { opacity: 1; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar       { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
  `;

  // ─── Category map ──────────────────────────────────────────────────────────
  const CAT_LABELS = {
    bug:     '🐛 Bug',
    content: '📝 Content',
    ui:      '🎨 UI/UX',
    feature: '💡 Feature',
    general: '📌 General',
  };

  // ─── Web Component ─────────────────────────────────────────────────────────
  class QABubble extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._notes            = JSON.parse(localStorage.getItem('qa_bubble_notes') || '[]');
      this._context          = { route: window.location.pathname, data: {} };
      this._isExpanded       = false;
      this._isRecording      = false;
      this._recognition      = null;
      this._selectedCategory = null;
    }

    connectedCallback() {
      this._render();
      this._bindEvents();
      this._initSpeech();
      this._refreshBadge();
    }

    setContext(route, data) {
      this._context = { route: String(route), data: data || {} };
      const sr = this.shadowRoot;
      const routeEl = sr.querySelector('.context-route-text');
      const dataEl  = sr.querySelector('.context-data');
      if (routeEl) routeEl.textContent = this._context.route;
      if (dataEl)  dataEl.textContent  = this._fmtData(this._context.data);
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>${CSS}</style>

        <button class="bubble-btn" id="toggleBtn" title="QA Bubble — פתח/סגור">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/>
          </svg>
          <span class="badge" id="badge"></span>
        </button>

        <div class="panel" id="panel">

          <div class="panel-header">
            <span class="panel-title">🔬 QA Bubble</span>
            <button class="close-btn" id="closeBtn" title="סגור">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="context-box">
            <div class="context-route">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
              </svg>
              <span class="context-route-text">${this._escape(this._context.route)}</span>
            </div>
            <div class="context-data">${this._escape(this._fmtData(this._context.data))}</div>
          </div>

          <div class="voice-row">
            <button class="mic-btn" id="micBtn" title="הקלט הערה קולית בעברית">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            <span class="mic-label" id="micLabel">לחץ להקלטת הערה</span>
          </div>

          <textarea id="noteText" placeholder="כתוב הערת QA כאן... (או השתמש במיקרופון)"></textarea>

          <div class="categories" id="categories">
            <button class="cat-btn" data-cat="bug">🐛 Bug</button>
            <button class="cat-btn" data-cat="content">📝 Content</button>
            <button class="cat-btn" data-cat="ui">🎨 UI/UX</button>
            <button class="cat-btn" data-cat="feature">💡 Feature</button>
          </div>

          <div class="actions">
            <button class="btn-save"   id="saveBtn">💾 שמור הערה</button>
            <button class="btn-export" id="exportBtn">📤 Export .md</button>
          </div>

          <div class="notes-section" id="notesSection"></div>

        </div>

        <div class="toast" id="toast"></div>
      `;

      this._renderNotes();
    }

    _bindEvents() {
      const sr = this.shadowRoot;
      sr.getElementById('toggleBtn').addEventListener('click', () => this._toggle());
      sr.getElementById('closeBtn') .addEventListener('click', () => this._close());
      sr.getElementById('micBtn')   .addEventListener('click', () => this._toggleRecording());
      sr.getElementById('saveBtn')  .addEventListener('click', () => this._saveNote());
      sr.getElementById('exportBtn').addEventListener('click', () => this._exportReport());

      sr.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.dataset.cat;
          if (this._selectedCategory === cat) {
            this._selectedCategory = null;
            btn.classList.remove('active');
          } else {
            this._selectedCategory = cat;
            sr.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        });
      });
    }

    _toggle() { this._isExpanded ? this._close() : this._open(); }
    _open()  { this._isExpanded = true;  this.shadowRoot.getElementById('panel').classList.add('open'); }
    _close() { this._isExpanded = false; this.shadowRoot.getElementById('panel').classList.remove('open'); }

    _initSpeech() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        const btn = this.shadowRoot.getElementById('micBtn');
        const lbl = this.shadowRoot.getElementById('micLabel');
        if (btn) btn.disabled = true;
        if (lbl) lbl.textContent = 'המיקרופון אינו נתמך בדפדפן זה';
        return;
      }

      this._recognition = new SR();
      this._recognition.lang           = 'he-IL';
      this._recognition.continuous     = false;  // תן גבול לחלק — הפעל מחדש בעצמנו
      this._recognition.interimResults = true;
      this._transcriptBase = ''; // טקסט שהושלם מסבבים קודמים
      this._recognitionRetries = 0; // מעקב אחר נסיונות הפעלה מחדש כדי להימנע מ-infinite loops

      this._recognition.onresult = (e) => {
        // חלוקה: תוצאות שהושלמו + interim
        let finalPart = '';
        let interimPart = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = (e.results[i][0].transcript || '').trim();
          if (!transcript) continue; // דלג על טקסטים ריקים
          if (e.results[i].isFinal) {
            finalPart  += (finalPart && transcript ? ' ' : '') + transcript; // הוסף רווח
          } else {
            interimPart += (interimPart && transcript ? ' ' : '') + transcript;
          }
        }
        if (finalPart) {
          this._transcriptBase += (this._transcriptBase && finalPart ? ' ' : '') + finalPart;
        }
        const ta = this.shadowRoot.getElementById('noteText');
        if (ta) {
          // הצג את הטקסט הסופי + interim (ללא דפליקציה)
          ta.value = this._transcriptBase + (interimPart ? (this._transcriptBase ? ' ' : '') + interimPart : '');
        }
      };

      // כשה-recognition נגמר בעצמו (קול הושלם / דפדפן) — הפעל מחדש אם עדיין אמורים להקליט
      this._recognition.onend = () => {
        if (this._isRecording && this._recognitionRetries < 3) {
          this._recognitionRetries++;
          try { this._recognition.start(); } catch (_) { this._isRecording = false; this._updateMicUI(); }
        } else if (this._isRecording && this._recognitionRetries >= 3) {
          // סגור אחרי 3 נסיונות כושלים כדי להמנע מ-infinite loop
          this._isRecording = false;
          this._updateMicUI();
          this._toast('הקלטה התעלמה — אפס את הקלטת קול או בדוק אם המיקרופון פעיל', 'error');
        } else {
          this._recognitionRetries = 0;
          this._updateMicUI();
        }
      };

      this._recognition.onerror = (e) => {
        if (e.error === 'no-speech') return; // התעלם — ימשיך לבד
        if (e.error === 'aborted')   return;
        this._isRecording = false; this._updateMicUI();
        this._toast('שגיאת הקלטה: ' + e.error, 'error');
      };
    }

    _toggleRecording() {
      if (!this._recognition) return;
      if (this._isRecording) {
        this._isRecording = false;
        this._recognition.stop();
        this._updateMicUI();
      } else {
        // אל תאפס את הטקסט הקיים — רק התחל הקלטה חדשה
        // הטקסט ההקלוט יתווסף לטקסט הקיים
        this._recognitionRetries = 0; // אפס את מונה הנסיונות כשהקלטה חדשה מתחילה
        this._isRecording = true;
        this._updateMicUI();
        try { this._recognition.start(); }
        catch (_) { this._isRecording = false; this._updateMicUI(); }
      }
    }

    _updateMicUI() {
      const btn = this.shadowRoot.getElementById('micBtn');
      const lbl = this.shadowRoot.getElementById('micLabel');
      if (this._isRecording) {
        btn?.classList.add('recording');
        if (lbl) lbl.textContent = '🔴 מקליט... לחץ לעצירה';
      } else {
        btn?.classList.remove('recording');
        if (lbl) lbl.textContent = 'לחץ להקלטת הערה';
      }
    }

    _saveNote() {
      const ta   = this.shadowRoot.getElementById('noteText');
      const text = ta?.value.trim();
      if (!text) { this._toast('אנא הכנס טקסט לפני השמירה', 'error'); return; }

      const note = {
        id:        Date.now(),
        text,
        category:  this._selectedCategory || 'general',
        route:     this._context.route,
        data:      this._context.data,
        timestamp: new Date().toISOString(),
      };

      this._notes.unshift(note);
      localStorage.setItem('qa_bubble_notes', JSON.stringify(this._notes));

      if (ta) ta.value = '';
      this._selectedCategory = null;
      this.shadowRoot.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));

      this._refreshBadge();
      this._renderNotes();
      this._toast('✅ הערה נשמרה!');
    }

    _refreshBadge() {
      const badge = this.shadowRoot.getElementById('badge');
      if (!badge) return;
      if (this._notes.length > 0) {
        badge.textContent = this._notes.length > 99 ? '99+' : String(this._notes.length);
        badge.classList.add('visible');
      } else {
        badge.classList.remove('visible');
      }
    }

    _renderNotes() {
      const container = this.shadowRoot.getElementById('notesSection');
      if (!container) return;

      if (this._notes.length === 0) {
        container.innerHTML = '<p class="empty-notes">אין הערות שמורות עדיין</p>';
        return;
      }

      const rows = this._notes.slice(0, 5).map(n => `
        <div class="note-item">
          <div class="note-meta">
            <span class="note-cat">${CAT_LABELS[n.category] || n.category}</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="note-time">${new Date(n.timestamp).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
              <button class="note-delete" data-ts="${n.timestamp}" title="מחק הערה">✕</button>
            </div>
          </div>
          <div class="note-text">${this._escape(n.text)}</div>
          <div class="note-route">📍 ${this._escape(n.route)}</div>
        </div>
      `).join('');

      const overflow = this._notes.length > 5
        ? `<div class="empty-notes">+ עוד ${this._notes.length - 5} הערות בקובץ המיוצא</div>`
        : '';

      container.innerHTML = `
        <div class="notes-header">
          <div class="notes-title">הערות שמורות (${this._notes.length})</div>
          <button class="btn-clear-all" id="clearAllBtn">🗑 מחק הכל</button>
        </div>
        ${rows}${overflow}
      `;

      // Event delegation — delete single note + clear all (attach once to container)
      if (!container._qaDeleteBound) {
        container._qaDeleteBound = true;
        container.addEventListener('click', (e) => {
          // מחיקת הערה בודדת
          const del = e.target.closest('.note-delete');
          if (del) {
            const ts = Number(del.dataset.ts);
            this._notes = this._notes.filter(n => n.timestamp !== ts);
            localStorage.setItem('qa_bubble_notes', JSON.stringify(this._notes));
            this._refreshBadge();
            this._renderNotes();
            return;
          }
          // מחיקת כל ההערות
          if (e.target.closest('#clearAllBtn')) {
            if (!confirm('למחוק את כל ההערות?')) return;
            this._notes = [];
            localStorage.setItem('qa_bubble_notes', '[]');
            this._refreshBadge();
            this._renderNotes();
          }
        });
      }
    }

    _exportReport() {
      if (this._notes.length === 0) { this._toast('אין הערות לייצא', 'error'); return; }

      const date = new Date().toLocaleString('he-IL');
      let md = `# QA Report\n\n`;
      md += `**Generated:** ${date}  \n`;
      md += `**Total Notes:** ${this._notes.length}\n\n`;
      md += `---\n\n`;

      const groups = this._notes.reduce((acc, n) => {
        const cat = n.category || 'general';
        (acc[cat] = acc[cat] || []).push(n);
        return acc;
      }, {});

      for (const [cat, notes] of Object.entries(groups)) {
        md += `## ${CAT_LABELS[cat] || cat}\n\n`;
        notes.forEach((n, i) => {
          md += `### ${i + 1}. \`${n.route}\`\n`;
          md += `**Time:** ${new Date(n.timestamp).toLocaleString('he-IL')}  \n\n`;
          md += `**Note:**\n> ${n.text.replace(/\n/g, '\n> ')}\n\n`;
          if (n.data && Object.keys(n.data).length > 0) {
            md += `**Context Snapshot:**\n\`\`\`json\n${JSON.stringify(n.data, null, 2)}\n\`\`\`\n\n`;
          }
          md += `---\n\n`;
        });
      }

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `QA_Report_${new Date().toISOString().slice(0, 10)}.md` });
      a.click();
      URL.revokeObjectURL(url);
      this._toast('📤 דוח יוצא בהצלחה!');
    }

    _toast(msg, type = 'success') {
      const t = this.shadowRoot.getElementById('toast');
      if (!t) return;
      t.textContent      = msg;
      t.style.background = type === 'error' ? 'rgba(239,68,68,0.92)' : 'rgba(34,197,94,0.92)';
      t.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    _escape(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    _fmtData(data) {
      if (!data || Object.keys(data).length === 0) return '— no context data —';
      return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    }
  }

  if (!customElements.get('qa-bubble')) {
    customElements.define('qa-bubble', QABubble);
  }

  window.QASystem = {
    setContext(route, data) { this._getOrCreate().setContext(route, data); },
    getNotes()  { return JSON.parse(localStorage.getItem('qa_bubble_notes') || '[]'); },
    clearNotes() {
      localStorage.removeItem('qa_bubble_notes');
      const el = document.querySelector('qa-bubble');
      if (el) { el._notes = []; el._refreshBadge(); el._renderNotes(); }
    },
    mount(target) {
      const container = target
        ? (typeof target === 'string' ? document.querySelector(target) : target)
        : document.body;
      const el = document.createElement('qa-bubble');
      (container || document.body).appendChild(el);
      return el;
    },
    _getOrCreate() {
      let el = document.querySelector('qa-bubble');
      if (!el) { el = document.createElement('qa-bubble'); document.body.appendChild(el); }
      return el;
    },
  };

  function autoMount() {
    if (!document.querySelector('qa-bubble')) {
      document.body.appendChild(document.createElement('qa-bubble'));
    }
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', autoMount)
    : autoMount();

})();
