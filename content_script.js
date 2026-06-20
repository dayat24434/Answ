let overlay = null;
let selectionBox = null;
let startX = 0, startY = 0;
let isSelecting = false;
let answerBox = null;

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (overlay) {
    removeOverlay();
  } else if (answerBox) {
    closeAnswer();
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'START_SELECTION') {
    if (overlay) {
      removeOverlay();
    } else {
      createOverlay();
    }
  }
});

function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'stealth-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    z-index: 2147483646; cursor: crosshair;
  `;

  selectionBox = document.createElement('div');
  selectionBox.id = 'stealth-selection';
  selectionBox.style.cssText = `
    position: absolute; border: 2px dashed #00ff88;
    background: rgba(0, 255, 136, 0.05); display: none; pointer-events: none;
  `;
  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
}

function removeOverlay() {
  if (overlay) {
    overlay.removeEventListener('mousedown', onMouseDown);
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('mouseup', onMouseUp);
    overlay.remove();
    overlay = null;
    selectionBox = null;
  }
}

function onMouseDown(e) {
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  selectionBox.style.display = 'block';
  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
}

function onMouseMove(e) {
  if (!isSelecting) return;
  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  selectionBox.style.left = x + 'px';
  selectionBox.style.top = y + 'px';
  selectionBox.style.width = w + 'px';
  selectionBox.style.height = h + 'px';
}

function isDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function onMouseUp(e) {
  isSelecting = false;
  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);

  if (w < 10 || h < 10) {
    removeOverlay();
    return;
  }

  removeOverlay();

  chrome.runtime.sendMessage(
    { type: 'CAPTURE_AND_SOLVE', coords: { x, y, width: w, height: h } },
    (response) => {
      if (response?.success) {
        showAnswer(response.answer);
      } else {
        showAnswer('Error: ' + (response?.error || 'Gagal mendapatkan jawaban.'));
      }
    }
  );
}

function renderMath(text) {
  const escapeMap = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  text = text.replace(/[&<>"']/g, c => escapeMap[c]);

  text = text.replace(/\$\$(.+?)\$\$/gs, (_, m) => renderLatex(m));
  text = text.replace(/\$(.+?)\$/g, (_, m) => renderLatex(m));
  text = text.replace(/\\\((.+?)\\\)/g, (_, m) => renderLatex(m));
  text = text.replace(/\\\[(.+?)\\\]/gs, (_, m) => renderLatex(m));

  return text.replace(/\n/g, '<br>');
}

function renderLatex(expr) {
  let s = expr.trim();

  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;font-size:0.85em"><span style="border-bottom:1px solid currentColor;padding:0 4px 2px">$1</span><span style="padding:2px 4px 0">$2</span></span>');

  s = s.replace(/\\sqrt(?:\[([^}]*)\])?\{([^}]*)\}/g, (_, n, r) =>
    `<span style="display:inline-flex;align-items:center;vertical-align:middle"><span style="border-top:1px solid currentColor;padding:0 4px;font-size:0.9em;margin-right:2px">${n ? n + '&#x221A;' : '&#x221A;'}</span><span style="border-top:1px solid currentColor;padding:0 4px;min-width:18px">${r}</span></span>`
  );

  s = s.replace(/\\binom\{([^}]*)\}\{([^}]*)\}/g, '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="padding:0 4px 2px">$1</span><span style="padding:2px 4px 0">$2</span></span>');

  s = s.replace(/\\text\{([^}]*)\}/g, '$1');
  s = s.replace(/\\displaystyle/g, '');
  s = s.replace(/\\left/g, '');
  s = s.replace(/\\right/g, '');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\!/g, '');
  s = s.replace(/\\;/g, ' ');
  s = s.replace(/\\:/g, ' ');

  const sym = {
    alpha: '&#x3B1;', beta: '&#x3B2;', gamma: '&#x3B3;', delta: '&#x3B4;',
    epsilon: '&#x3B5;', varepsilon: '&#x3B5;', zeta: '&#x3B6;', eta: '&#x3B7;',
    theta: '&#x3B8;', vartheta: '&#x3B8;', iota: '&#x3B9;', kappa: '&#x3BA;',
    lambda: '&#x3BB;', mu: '&#x3BC;', nu: '&#x3BD;', xi: '&#x3BE;',
    pi: '&#x3C0;', varpi: '&#x3D6;', rho: '&#x3C1;', sigma: '&#x3C3;',
    varsigma: '&#x3C2;', tau: '&#x3C4;', upsilon: '&#x3C5;', phi: '&#x3C6;',
    varphi: '&#x3C6;', chi: '&#x3C7;', psi: '&#x3C8;', omega: '&#x3C9;',
    Gamma: '&#x393;', Delta: '&#x394;', Theta: '&#x398;', Lambda: '&#x39B;',
    Xi: '&#x39E;', Pi: '&#x3A0;', Sigma: '&#x3A3;', Phi: '&#x3A6;',
    Psi: '&#x3A8;', Omega: '&#x3A9;',
    infty: '&#x221E;', pm: '&#xB1;', mp: '&#x2213;', times: '&#xD7;',
    div: '&#xF7;', cdot: '&#xB7;', cdots: '&#x2026;', ldots: '&#x2026;',
    vdots: '&#x22EE;', ddots: '&#x22F1;', neq: '&#x2260;', leq: '&#x2264;',
    geq: '&#x2265;', ll: '&#x226A;', gg: '&#x226B;', approx: '&#x2248;',
    equiv: '&#x2261;', sim: '&#x223C;', simeq: '&#x2243;', cong: '&#x2245;',
    subset: '&#x2282;', supset: '&#x2283;', subseteq: '&#x2286;', supseteq: '&#x2287;',
    cap: '&#x2229;', cup: '&#x222A;', in: '&#x2208;', notin: '&#x2209;',
    forall: '&#x2200;', exists: '&#x2203;', emptyset: '&#x2205;',
    partial: '&#x2202;', nabla: '&#x2207;', perp: '&#x22A5;',
    angle: '&#x2220;', triangle: '&#x25B3;', degrees: '&#xB0;',
    rightarrow: '&#x2192;', leftarrow: '&#x2190;', Rightarrow: '&#x21D2;',
    Leftarrow: '&#x21D0;', leftrightarrow: '&#x2194;', Rightleftharpoons: '&#x21C4;',
    to: '&#x2192;', mapsto: '&#x21A6;', implies: '&#x21D2;',
    gets: '&#x21D0;', wedge: '&#x2227;', vee: '&#x2228;',
    oplus: '&#x2295;', otimes: '&#x2297;', ominus: '&#x2296;',
    int: '&#x222B;', iint: '&#x222C;', iiint: '&#x222D;', oint: '&#x222E;',
    sum: '&#x2211;', prod: '&#x220F;', coprod: '&#x2210;',
    mid: '|', parallel: '&#x2225;', backslash: '\\',
    ast: '*', star: '&#x2605;', circ: '&#x2218;', bullet: '&#x2022;',
    ge: '&#x2265;', le: '&#x2264;', ne: '&#x2260;'
  };

  s = s.replace(/\\([a-zA-Z]+)/g, (_, name) => sym[name] || `\\${name}`);

  s = s.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');
  s = s.replace(/\_\{([^}]*)\}/g, '<sub>$1</sub>');
  s = s.replace(/\_([a-zA-Z0-9])/g, '<sub>$1</sub>');

  s = s.replace(/\\([{}])/g, '$1');
  s = s.replace(/[{}]/g, '');

  return s;
}

function showAnswer(text) {
  const dark = isDarkMode();
  closeAnswer();
  answerBox = document.createElement('div');
  answerBox.id = 'stealth-answer';
  answerBox.innerHTML = `<span id="stealth-answer-text">${renderMath(text)}</span>`;
  answerBox.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 2147483647;
    max-width: 400px; padding: 16px 20px; border-radius: 12px;
    background: ${dark ? 'rgba(30,30,50,0.92)' : 'rgba(255,255,255,0.92)'};
    border: 1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'};
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    color: ${dark ? '#e0e0e0' : '#1a1a2e'};
    font-family: system-ui, sans-serif;
    font-size: 14px; line-height: 1.5; cursor: move;
    user-select: none;
  `;

  document.body.appendChild(answerBox);
  makeDraggable(answerBox);
  document.addEventListener('click', closeAnswerOnClickOutside);
}

function closeAnswer() {
  if (answerBox) {
    answerBox.remove();
    answerBox = null;
  }
  document.removeEventListener('click', closeAnswerOnClickOutside);
}

function closeAnswerOnClickOutside(e) {
  if (answerBox && !answerBox.contains(e.target)) {
    closeAnswer();
  }
}

function makeDraggable(el) {
  let offsetX, offsetY, mouseX, mouseY;
  let isDragging = false;

  el.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = el.offsetLeft;
    offsetY = el.offsetTop;
    mouseX = e.clientX;
    mouseY = e.clientY;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    el.style.left = (offsetX + e.clientX - mouseX) + 'px';
    el.style.top = (offsetY + e.clientY - mouseY) + 'px';
    el.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
