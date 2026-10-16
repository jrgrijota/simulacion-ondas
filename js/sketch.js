// ═══════════════════════════════════════════════════════════════════
//  SIMULACIÓN: ONDAS TRANSVERSALES Y LONGITUDINALES
//  Física y Química para Secundaria y Bachillerato
//  La física está en wave.js; aquí se dibuja y se conectan los controles.
// ═══════════════════════════════════════════════════════════════════

// Números con coma decimal, como se escriben en clase (punto en inglés).
function fmt(x, d) { return i18n.num(x, d); }
function fmtSigned(x, d) { return (x >= 0 ? '+' : '−') + fmt(Math.abs(x), d); }

// Valores de referencia para la energía relativa (los iniciales).
const A_REF = 0.20, F_REF = 1.00;

// --- MODELO ---
const wave = new Wave();
let mode = 'transversal';          // 'transversal' | 'longitudinal' | 'comparar'
let playing = true;
let speed = 1;
let showLabels = true;
let bach = false;
let xP = 0.5;                      // posición de equilibrio de la partícula marcada (m)
let dxPQ = 0.75;                   // distancia de P a Q (m), nivel Bachillerato
let THEME = {};

// --- LAYOUT DEL CANVAS ---
const CV_W = 1050, CV_H = 700;
const SCENE = { x: 16, y: 16, w: 1018, h: 430 };
const LOWER = { x: 16, y: 462, w: 1018, h: 222 };
const X0 = SCENE.x + 150;          // posición del foco (x = 0) en píxeles
const PX = 215;                    // píxeles por metro, en horizontal y en vertical
const XP = (x) => X0 + x * PX;
const STEP_T = 0.1;                // separación entre partículas de la cuerda (m)
const STEP_L = 0.1;                // separación entre columnas del muelle (m)
const ROWS_L = 7;                  // filas de partículas del muelle

// --- DOM ---
let sliderA, sliderF, sliderV, sliderDx, kindSelect, pauseBtn;
let panelTimer = 0;

// ─────────────────────────────────────────────────────────────────
function setup() {
    const canvas = createCanvas(CV_W, CV_H);
    canvas.parent('canvas-container');
    canvas.elt.setAttribute('aria-label', i18n.t('Simulación de ondas: un foco hace vibrar una cuerda o un muelle y la onda avanza hacia la derecha. Los cambios importantes se leen en voz alta.'));
    frameRate(60);
    textFont('monospace');

    sliderA  = select('#slider-a');
    sliderF  = select('#slider-f');
    sliderV  = select('#slider-v');
    sliderDx = select('#slider-dx');
    kindSelect = select('#wave-kind');
    pauseBtn = document.getElementById('btn-pausa');

    [sliderA, sliderF, sliderV, sliderDx].forEach(s => s.input(readControls));
    kindSelect.changed(() => {
        wave.kind = kindSelect.value();
        document.body.classList.toggle('kind-pulso', wave.kind === 'pulso');
        wave.reset();
        if (wave.kind === 'pulso') wave.emitPulse();
        refresh();
    });

    select('#mode-transversal').mousePressed(() => setMode('transversal'));
    select('#mode-longitudinal').mousePressed(() => setMode('longitudinal'));
    select('#mode-comparar').mousePressed(() => setMode('comparar'));

    document.getElementById('btn-pulse').addEventListener('click', () => {
        wave.emitPulse();
        if (!playing) togglePlay();
        anunciar(i18n.t('Pulso emitido.'));
    });
    pauseBtn.addEventListener('click', togglePlay);
    document.getElementById('btn-reiniciar').addEventListener('click', () => {
        wave.reset();
        if (wave.kind === 'pulso') wave.emitPulse();
        refresh();
    });
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            speed = parseFloat(btn.dataset.speed);
            document.querySelectorAll('.speed-btn').forEach(b => {
                b.classList.toggle('active', b === btn);
                b.setAttribute('aria-checked', String(b === btn));
            });
        });
    });
    document.getElementById('check-rotulos').addEventListener('change', (e) => { showLabels = e.target.checked; });
    document.getElementById('check-bach').addEventListener('change', (e) => {
        bach = e.target.checked;
        document.body.classList.toggle('nivel-bach', bach);
        refresh();
        anunciar(bach ? i18n.t('Nivel Bachillerato: abajo se ven las gráficas de elongación frente a la posición y frente al tiempo.')
                      : i18n.t('Nivel ESO: abajo se ven las magnitudes de la onda y la energía que transporta.'));
    });
    document.querySelectorAll('.dx-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = parseFloat(btn.dataset.frac) * wave.lambda;
            const max = parseFloat(sliderDx.elt.max);
            dxPQ = Math.min(max, d);
            sliderDx.value(dxPQ);
            refresh();
        });
    });

    setupThemePanel();
    readControls();
    fitCanvas();
}

function setupThemePanel() {
    const themeBtn   = document.getElementById('theme-btn');
    const themePanel = document.getElementById('theme-panel');
    const themeOpts  = document.querySelectorAll('.theme-opt');

    const close = () => {
        themePanel.classList.remove('open');
        themeBtn.classList.remove('active');
        themeBtn.setAttribute('aria-expanded', 'false');
        themePanel.setAttribute('aria-hidden', 'true');
    };

    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = themePanel.classList.toggle('open');
        themeBtn.classList.toggle('active', isOpen);
        themeBtn.setAttribute('aria-expanded', String(isOpen));
        themePanel.setAttribute('aria-hidden', String(!isOpen));
    });
    document.addEventListener('click', (e) => {
        if (!themeBtn.contains(e.target) && !themePanel.contains(e.target)) close();
    });
    themeOpts.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.classList.remove('theme-light', 'theme-contrast');
            if (theme !== 'dark') document.body.classList.add('theme-' + theme);
            themeOpts.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            close();
        });
    });
}

// ─────────────────────────────────────────────────────────────────
//  ESTADO Y CONTROLES
// ─────────────────────────────────────────────────────────────────
function setMode(m) {
    mode = m;
    ['transversal', 'longitudinal', 'comparar'].forEach(k => {
        document.body.classList.toggle('mode-' + k, k === m);
        const btn = document.getElementById('mode-' + k);
        btn.classList.toggle('active', k === m);
        btn.setAttribute('aria-selected', String(k === m));
    });
    refresh();
    anunciar({
        transversal: i18n.t('Onda transversal: las partículas de la cuerda vibran arriba y abajo mientras la onda avanza hacia la derecha.'),
        longitudinal: i18n.t('Onda longitudinal: las partículas del muelle vibran adelante y atrás, en la dirección en que avanza la onda, y forman compresiones y enrarecimientos.'),
        comparar: i18n.t('Comparación: arriba la onda transversal y abajo la longitudinal, con el mismo foco y el mismo medio.'),
    }[m]);
}

function togglePlay() {
    playing = !playing;
    pauseBtn.textContent = i18n.t(playing ? '⏸ Pausar' : '▶ Reanudar');
    pauseBtn.setAttribute('aria-pressed', String(!playing));
}

function readControls() {
    wave.A = parseFloat(sliderA.value());
    wave.f = parseFloat(sliderF.value());
    wave.v = parseFloat(sliderV.value());
    dxPQ   = parseFloat(sliderDx.value());
    refresh();
}

function refresh() {
    select('#val-a').html(`${fmt(wave.A, 2)} m`);
    select('#val-f').html(`${fmt(wave.f, 2)} Hz`);
    select('#val-v').html(`${fmt(wave.v, 2)} m/s`);
    select('#val-dx').html(`${fmt(dxPQ, 2)} m`);
    [[sliderA, A_MIN, A_MAX], [sliderF, F_MIN, F_MAX], [sliderV, V_MIN, V_MAX],
     [sliderDx, 0, parseFloat(sliderDx.elt.max)]].forEach(([s, a, b]) => setSliderFill(s, a, b));
    updatePanel();
}

function setSliderFill(slider, minV, maxV) {
    const pct = ((parseFloat(slider.value()) - minV) / (maxV - minV)) * 100;
    slider.elt.style.setProperty('--fill', pct.toFixed(1) + '%');
}

// ─────────────────────────────────────────────────────────────────
function draw() {
    updateTheme();
    background(THEME.canvasBg);
    const dt = Math.min(deltaTime / 1000, 1 / 20);
    if (playing) {
        const before = wave.frontX();
        wave.step(dt * speed);
        if (before != null && before < L_MEDIO && wave.frontX() >= L_MEDIO) {
            anunciar(i18n.t('La onda ha llegado al final del tramo dibujado: ahora todo el medio vibra.'));
        }
    }

    drawScene();
    drawBottomPanel();
    cursor(laneAt(mouseX, mouseY) ? HAND : ARROW);

    panelTimer += dt;
    if (panelTimer > 0.15) { panelTimer = 0; updateLiveNotes(); }
}

// ═══════════════════════════════════════════════════════════════════
//  TAMAÑO DEL CANVAS Y ACCESIBILIDAD
// ═══════════════════════════════════════════════════════════════════

// Ajusta el canvas al hueco disponible sin deformarlo (proporción 3:2).
// En pantallas estrechas la simulación va arriba y el canvas ocupa todo el ancho.
function fitCanvas() {
    const cont = document.getElementById('canvas-container');
    const cv = cont.querySelector('canvas');
    if (!cv) return;
    const cs = getComputedStyle(cont);
    const w = cont.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const apilado = window.matchMedia('(max-width: 1100px)').matches;
    const h = apilado ? Infinity : cont.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.max(0.1, Math.min(w / CV_W, h / CV_H));
    cv.style.width  = Math.floor(CV_W * s) + 'px';
    cv.style.height = Math.floor(CV_H * s) + 'px';
}

function windowResized() { fitCanvas(); }

// Los lectores de pantalla leen los cambios importantes (no cada fotograma).
let ultimoAnuncio = '';
function anunciar(msg) {
    if (msg === ultimoAnuncio) return;
    ultimoAnuncio = msg;
    document.getElementById('anuncio').textContent = msg;
}

// ═══════════════════════════════════════════════════════════════════
//  TEMAS DEL LIENZO
// ═══════════════════════════════════════════════════════════════════
function updateTheme() {
    const isLight    = document.body.classList.contains('theme-light');
    const isContrast = document.body.classList.contains('theme-contrast');
    if (isLight) {
        THEME = {
            canvasBg: '#ccd6e8', sceneBg: '#e4ecf6', panelBg: '#b8c8dc', panelBorder: '#6888a0',
            text: '#0d1520', textDim: '#3a4a5a', textFaint: '#5a6a7a', grid: color(30, 50, 80, 40),
            rope: '#3a4858', bead: '#475569', particle: '#334155', axis: color(30, 50, 80, 110),
            device: '#64748b', deviceFill: '#f4f7fb',
            a: '#b91c1c', f: '#7e22ce', t: '#15803d', l: '#0369a1', v: '#a16207', e: '#c2410c',
            p: '#dc2626', q: '#7c3aed', crest: '#0369a1', comp: color(3, 105, 161, 60), rare: color(194, 65, 12, 45),
            front: '#a16207', msgBg: color(255, 255, 255, 220), warn: '#c02020',
        };
    } else if (isContrast) {
        THEME = {
            canvasBg: '#000000', sceneBg: '#000000', panelBg: '#000000', panelBorder: '#ffff00',
            text: '#ffffff', textDim: '#ffff00', textFaint: '#cccccc', grid: color(255, 255, 0, 60),
            rope: '#ffffff', bead: '#ffffff', particle: '#ffffff', axis: color(255, 255, 0, 140),
            device: '#ffff00', deviceFill: '#000000',
            a: '#ff6666', f: '#ff66ff', t: '#00ff66', l: '#00ffff', v: '#ffff00', e: '#ff9900',
            p: '#ff3333', q: '#ff66ff', crest: '#00ffff', comp: color(0, 255, 255, 50), rare: color(255, 153, 0, 40),
            front: '#ffff00', msgBg: color(0, 0, 0, 235), warn: '#ff4444',
        };
    } else {
        THEME = {
            canvasBg: '#141414', sceneBg: '#151c24', panelBg: '#141c24', panelBorder: '#22303c',
            text: '#e0e8f0', textDim: '#8a9aaa', textFaint: '#5a6a7a', grid: color(255, 255, 255, 22),
            rope: '#9aa8b8', bead: '#cbd5e1', particle: '#cbd5e1', axis: color(255, 255, 255, 60),
            device: '#8a9aaa', deviceFill: '#1c2530',
            a: '#f87171', f: '#c084fc', t: '#4ade80', l: '#38bdf8', v: '#facc15', e: '#fb923c',
            p: '#f87171', q: '#c084fc', crest: '#38bdf8', comp: color(56, 189, 248, 70), rare: color(251, 146, 60, 45),
            front: '#facc15', msgBg: color(10, 16, 24, 225), warn: '#ff6b6b',
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ESCENA
// ═══════════════════════════════════════════════════════════════════
function lanes() {
    if (mode === 'comparar') {
        return [
            { kind: 'transversal',  cy: SCENE.y + 118, h: 200, top: SCENE.y + 6 },
            { kind: 'longitudinal', cy: SCENE.y + 322, h: 200, top: SCENE.y + 222 },
        ];
    }
    return [{ kind: mode, cy: SCENE.y + 240, h: 400, top: SCENE.y + 8 }];
}

function drawScene() {
    fill(THEME.sceneBg);
    stroke(THEME.panelBorder);
    strokeWeight(1);
    rect(SCENE.x, SCENE.y, SCENE.w, SCENE.h, 10);

    const L = lanes();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(SCENE.x + 1, SCENE.y + 1, SCENE.w - 2, SCENE.h - 2);
    drawingContext.clip();
    if (mode === 'comparar') {
        stroke(THEME.panelBorder);
        line(SCENE.x + 12, SCENE.y + 216, SCENE.x + SCENE.w - 12, SCENE.y + 216);
    }
    L.forEach(lane => {
        if (lane.kind === 'transversal') drawTransversal(lane);
        else drawLongitudinal(lane);
    });
    drawingContext.restore();
    drawClock();
}

function drawLaneTitle(lane) {
    const title = lane.kind === 'transversal' ? i18n.t('ONDA TRANSVERSAL EN UNA CUERDA') : i18n.t('ONDA LONGITUDINAL EN UN MUELLE');
    const sub = lane.kind === 'transversal'
        ? i18n.t('Las partículas vibran en dirección perpendicular a la propagación')
        : i18n.t('Las partículas vibran en la misma dirección en que se propaga la onda');
    noStroke();
    fill(THEME.textDim);
    textSize(11);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    text(title, SCENE.x + 16, lane.top + 6);
    textStyle(NORMAL);
    if (mode === 'comparar') return;
    fill(THEME.textFaint);
    textSize(10);
    text(sub, SCENE.x + 16, lane.top + 21);
}

// Flecha de la dirección de propagación, arriba a la derecha de cada carril.
function drawPropagation(lane) {
    const xe = SCENE.x + SCENE.w - 110, ay = lane.top + 13;
    arrow(xe - 120, ay, xe, ay, THEME.v, 2, 8);
    noStroke();
    fill(THEME.v);
    textSize(10.5);
    textAlign(RIGHT, CENTER);
    text(i18n.t('propagación'), xe - 128, ay);
}

function drawClock() {
    noStroke();
    textSize(11);
    textAlign(RIGHT, TOP);
    fill(THEME.textDim);
    const tx = SCENE.x + SCENE.w - 16;
    text(`t = ${fmt(wave.t, 1)} s`, tx, SCENE.y + 14);
    if (!playing) {
        fill(THEME.warn);
        text(i18n.t('EN PAUSA'), tx, SCENE.y + 30);
    } else if (speed !== 1) {
        fill(THEME.textFaint);
        text(i18n.t('cámara lenta × {s}', { s: fmt(speed, 2).replace(/0$/, '') }), tx, SCENE.y + 30);
    }
}

// Flecha con punta en (x2, y2).
function arrow(x1, y1, x2, y2, col, w = 1.6, head = 7) {
    stroke(col);
    strokeWeight(w);
    line(x1, y1, x2, y2);
    const a = Math.atan2(y2 - y1, x2 - x1);
    noStroke();
    fill(col);
    triangle(x2, y2,
             x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4),
             x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
}
function dblArrow(x1, y1, x2, y2, col, w = 1.6, head = 6) {
    arrow((x1 + x2) / 2, (y1 + y2) / 2, x2, y2, col, w, head);
    arrow((x1 + x2) / 2, (y1 + y2) / 2, x1, y1, col, w, head);
}

// Cota horizontal con extremos verticales y rótulo centrado encima.
function hDimension(xa, xb, y, col, label) {
    stroke(col);
    strokeWeight(1.3);
    line(xa, y - 6, xa, y + 6);
    line(xb, y - 6, xb, y + 6);
    dblArrow(xa + 1, y, xb - 1, y, col, 1.3, 6);
    noStroke();
    fill(THEME.sceneBg);
    textSize(11);
    textStyle(BOLD);
    const w = textWidth(label) + 10;
    rect((xa + xb) / 2 - w / 2, y - 8, w, 16, 4);
    fill(col);
    textAlign(CENTER, CENTER);
    text(label, (xa + xb) / 2, y);
    textStyle(NORMAL);
}

function chip(x, y, label, col, alignX = CENTER) {
    noStroke();
    textSize(10.5);
    const w = textWidth(label) + 10;
    const left = alignX === CENTER ? x - w / 2 : alignX === LEFT ? x : x - w;
    fill(THEME.msgBg);
    rect(left, y - 8, w, 16, 4);
    fill(col);
    textAlign(CENTER, CENTER);
    text(label, left + w / 2, y);
}

// Máximos y mínimos locales de una función muestreada en [0, xEnd].
// Dos extremos del mismo tipo más cerca de un cuarto de longitud de onda son
// el mismo (pasa en tramos casi planos): se queda el mayor.
function extrema(fn, xEnd, minAbs) {
    const h = 0.01, out = { max: [], min: [] };
    const minGap = wave.lambda / 4;
    const push = (list, x, val, better) => {
        const last = list[list.length - 1];
        if (last && x - last.x < minGap) { if (better(val, last.v)) list[list.length - 1] = { x, v: val }; }
        else list.push({ x, v: val });
    };
    let a = fn(0), b = fn(h);
    for (let x = 2 * h; x <= xEnd + 1e-9; x += h) {
        const c = fn(x);
        if (b > a && b >= c && b > minAbs) push(out.max, x - h, b, (u, w) => u > w);
        if (b < a && b <= c && b < -minAbs) push(out.min, x - h, b, (u, w) => u < w);
        a = b; b = c;
    }
    return { max: out.max.map(e => e.x), min: out.min.map(e => e.x) };
}

function visibleEnd() {
    const fr = wave.frontX();
    return fr == null ? L_MEDIO : fr;
}

// ── Cuerda ──
function drawTransversal(lane) {
    drawLaneTitle(lane);
    const cy = lane.cy;
    const Y = (y) => cy - y * PX;

    // Línea de equilibrio
    stroke(THEME.axis);
    strokeWeight(1);
    drawingContext.setLineDash([4, 6]);
    line(X0, cy, XP(L_MEDIO), cy);
    drawingContext.setLineDash([]);

    // Foco: un vibrador que mueve el extremo de la cuerda
    const ys = wave.y(0);
    drawVibrator(X0 - 46, cy, ys, 'vertical');

    // Cuerda
    noFill();
    stroke(THEME.rope);
    strokeWeight(2);
    beginShape();
    for (let px = X0; px <= XP(L_MEDIO); px += 3) vertex(px, Y(wave.y((px - X0) / PX)));
    endShape();

    // Partículas de la cuerda
    noStroke();
    fill(THEME.bead);
    for (let x = 0; x <= L_MEDIO + 1e-9; x += STEP_T) circle(XP(x), Y(wave.y(x)), 6);

    // Frente de la onda continua
    const fr = wave.frontX();
    if (fr != null && fr < L_MEDIO - 0.02) {
        stroke(THEME.front);
        strokeWeight(1);
        drawingContext.setLineDash([2, 4]);
        line(XP(fr), cy - 70, XP(fr), cy + 70);
        drawingContext.setLineDash([]);
        chip(XP(fr), cy - 80, i18n.t('frente'), THEME.front);
    }

    // Cotas: λ, A, crestas y valles
    if (showLabels) {
        const xEnd = visibleEnd();
        const ex = extrema(x => wave.y(x), xEnd, 0.01);
        const compact = mode === 'comparar';
        const top = cy - wave.A * PX - (compact ? 14 : 66);
        if (!compact) {
            ex.max.slice(0, 2).forEach(x => chip(XP(x), Y(wave.y(x)) - 16, i18n.t('cresta'), THEME.crest));
            ex.min.slice(0, 2).forEach(x => chip(XP(x), Y(wave.y(x)) + 16, i18n.t('valle'), THEME.crest));
        }
        if (wave.kind === 'continua' && ex.max.length >= 2) {
            const [x1, x2] = ex.max;
            stroke(THEME.l);
            strokeWeight(1);
            drawingContext.setLineDash([2, 3]);
            line(XP(x1), Y(wave.y(x1)) - (compact ? 6 : 26), XP(x1), top);
            line(XP(x2), Y(wave.y(x2)) - (compact ? 6 : 26), XP(x2), top);
            drawingContext.setLineDash([]);
            hDimension(XP(x1), XP(x2), top, THEME.l, `λ = ${fmt(x2 - x1, 2)} m`);
        }
        if (ex.max.length >= 1) {
            const x1 = ex.max[ex.max.length > 1 ? 1 : 0];
            const xa = XP(x1) + 22;
            const ya = Y(wave.y(x1));
            stroke(THEME.a);
            strokeWeight(1);
            drawingContext.setLineDash([2, 3]);
            line(XP(x1) + 4, ya, xa + 6, ya);
            drawingContext.setLineDash([]);
            if (cy - ya > 12) dblArrow(xa, cy, xa, ya, THEME.a, 1.5, 6);
            noStroke();
            fill(THEME.a);
            textSize(11);
            textStyle(BOLD);
            textAlign(LEFT, CENTER);
            text('A', xa + 6, (cy + ya) / 2);
            textStyle(NORMAL);
        }
    }

    drawPropagation(lane);

    drawMarked(lane, Y, 'transversal');
}

// ── Muelle (partículas en columnas) ──
// Para que las partículas no se crucen, el desplazamiento se dibuja a escala
// reducida cuando A · k es grande.
function longScale() {
    return Math.min(1, 0.6 / (wave.A * wave.k));
}

function drawLongitudinal(lane) {
    drawLaneTitle(lane);
    const cy = lane.cy;
    const s = longScale();
    const span = mode === 'comparar' ? 54 : 84;
    const rowsY = [];
    for (let r = 0; r < ROWS_L; r++) rowsY.push(cy - span + (2 * span * r) / (ROWS_L - 1));

    const xs = (x) => XP(x + s * wave.y(x));   // posición dibujada de la columna x

    // Sombreado de compresiones y enrarecimientos
    const xEnd = visibleEnd();
    // −∂ξ/∂x = v_y / v (> 0: compresión). Sale de la velocidad de vibración, sin derivar a mano.
    const strain = (x) => wave.vy(x) / wave.v;
    noStroke();
    for (let x = 0; x < L_MEDIO; x += 0.05) {
        const c = s * strain(x);
        if (Math.abs(c) < 0.05) continue;
        const col = c > 0 ? THEME.comp : THEME.rare;
        const k = Math.min(1, (Math.abs(c) / 0.6) ** 2);
        const cc = color(col);
        cc.setAlpha(k * alphaOf(col));
        fill(cc);
        rect(xs(x), cy - span - 12, xs(x + 0.05) - xs(x) + 0.5, 2 * span + 24);
    }

    // Foco: un pistón que empuja el muelle
    drawVibrator(X0 - 30, cy, wave.y(0) * s, 'horizontal', span);

    // Partículas
    noStroke();
    fill(THEME.particle);
    for (let x = 0; x <= L_MEDIO + 1e-9; x += STEP_L) {
        const px = xs(x);
        for (const ry of rowsY) circle(px, ry, 5);
    }

    if (showLabels) {
        const ex = extrema(strain, xEnd, 0.05 / s);
        const compact = mode === 'comparar';
        const labY = cy - span - 22;
        if (!compact) {
            ex.max.slice(0, 2).forEach(x => chip(xs(x), labY, i18n.t('compresión'), THEME.crest));
            ex.min.slice(0, 2).forEach(x => chip(xs(x), labY, i18n.t('enrarecimiento'), THEME.e));
        }
        if (wave.kind === 'continua' && ex.max.length >= 2) {
            const [x1, x2] = ex.max;
            hDimension(xs(x1), xs(x2), compact ? cy - span - 14 : labY - 22, THEME.l, `λ = ${fmt(x2 - x1, 2)} m`);
        }
    }

    drawPropagation(lane);

    if (s < 0.999) {
        noStroke();
        fill(THEME.textFaint);
        textSize(9.5);
        textAlign(LEFT, BOTTOM);
        text(i18n.t('Desplazamientos dibujados a escala × {s} para que las partículas no se crucen', { s: fmt(s, 2) }),
             SCENE.x + 16, mode === 'comparar' ? SCENE.y + SCENE.h - 6 : lane.top + lane.h - 2);
    }

    drawMarked(lane, null, 'longitudinal', { s, rowsY, span });
}

function alphaOf(c) {
    const cc = color(c);
    return alpha(cc);
}

// Vibrador del foco: un bloque fijo y una varilla que se mueve con el foco.
function drawVibrator(x, cy, disp, dir, span = 60) {
    stroke(THEME.device);
    strokeWeight(1.4);
    fill(THEME.deviceFill);
    if (dir === 'vertical') {
        rect(x - 26, cy - 22, 34, 44, 5);
        const yy = cy - disp * PX;
        stroke(THEME.device);
        strokeWeight(3);
        line(x + 8, yy, X0, yy);
        noStroke();
        fill(THEME.device);
        rect(x - 4, yy - 4, 14, 8, 2);
        dblArrow(x - 9, cy - 14, x - 9, cy + 14, THEME.textFaint, 1.2, 4);
    } else {
        rect(x - 104, cy - 22, 30, 44, 5);
        const xx = x + disp * PX;
        stroke(THEME.device);
        strokeWeight(3);
        line(x - 74, cy, xx, cy);
        strokeWeight(5);
        line(xx, cy - span - 6, xx, cy + span + 6);
        dblArrow(x - 99, cy, x - 79, cy, THEME.textFaint, 1.2, 4);
    }
    noStroke();
    fill(THEME.textFaint);
    textSize(9.5);
    textAlign(CENTER, TOP);
    if (dir === 'vertical') {
        textAlign(CENTER, BOTTOM);
        text(i18n.t('foco'), x - 9, cy - 28);
    } else {
        textAlign(CENTER, TOP);
        text(i18n.t('foco'), x - 89, cy + 28);
    }
}

// Partícula marcada P (y Q en Bachillerato) con su recorrido de vibración.
function drawMarked(lane, Y, kind, L) {
    const pts = [{ x: xP, col: THEME.p, name: 'P' }];
    if (bach && xP + dxPQ <= L_MEDIO + 1e-9) pts.push({ x: xP + dxPQ, col: THEME.q, name: 'Q' });
    pts.forEach(pt => {
        const yv = wave.y(pt.x);
        if (kind === 'transversal') {
            const px = XP(pt.x), cy = lane.cy;
            stroke(pt.col);
            strokeWeight(1);
            drawingContext.setLineDash([2, 3]);
            line(px, cy - wave.A * PX - 4, px, cy + wave.A * PX + 4);
            drawingContext.setLineDash([]);
            noStroke();
            fill(pt.col);
            circle(px, Y(yv), 12);
            fill(THEME.sceneBg);
            circle(px, Y(yv), 4);
            fill(pt.col);
            textSize(12);
            textStyle(BOLD);
            textAlign(LEFT, CENTER);
            text(pt.name, px + 9, Y(yv) + (yv >= 0 ? 12 : -12));
            textStyle(NORMAL);
        } else {
            const mid = L.rowsY[(ROWS_L - 1) / 2];
            const px = XP(pt.x + L.s * yv);
            const x0 = XP(pt.x);
            const r = L.s * wave.A * PX;
            stroke(pt.col);
            strokeWeight(1);
            line(x0 - r, L.rowsY[ROWS_L - 1] + 14, x0 + r, L.rowsY[ROWS_L - 1] + 14);
            line(x0, L.rowsY[ROWS_L - 1] + 10, x0, L.rowsY[ROWS_L - 1] + 18);
            noStroke();
            fill(pt.col);
            for (const ry of L.rowsY) circle(px, ry, ry === mid ? 12 : 6);
            fill(THEME.sceneBg);
            circle(px, mid, 4);
            fill(pt.col);
            textSize(11);
            textStyle(BOLD);
            textAlign(CENTER, TOP);
            text(pt.name, x0, L.rowsY[ROWS_L - 1] + 20);
            textStyle(NORMAL);
        }
    });

    // Flecha de vibración junto a P
    const px = XP(xP);
    if (kind === 'transversal') {
        const yy = lane.cy - wave.A * PX - (mode === 'comparar' ? 18 : 40);
        noStroke();
        fill(THEME.p);
        textSize(10);
        textAlign(LEFT, CENTER);
        dblArrow(px - 18, yy - 12, px - 18, yy + 12, THEME.p, 1.4, 5);
        if (mode !== 'comparar') text(i18n.t('vibración'), px - 10, yy);
    } else {
        const yy = mode === 'comparar' ? L.rowsY[0] - 10 : L.rowsY[ROWS_L - 1] + 44;
        dblArrow(px - 16, yy, px + 16, yy, THEME.p, 1.4, 5);
        noStroke();
        fill(THEME.p);
        textSize(10);
        textAlign(LEFT, CENTER);
        if (mode !== 'comparar') text(i18n.t('vibración'), px + 22, yy);
    }
}

// Carril bajo el ratón (para marcar una partícula).
function laneAt(mx, my) {
    if (mx < X0 - 8 || mx > XP(L_MEDIO) + 8) return null;
    return lanes().find(l => my >= l.top + 30 && my <= l.top + l.h) || null;
}

function mousePressed() {
    const lane = laneAt(mouseX, mouseY);
    if (!lane) return;
    xP = Math.max(0, Math.min(L_MEDIO, Math.round((mouseX - X0) / PX / STEP_T) * STEP_T));
    refresh();
    return false;
}

// ═══════════════════════════════════════════════════════════════════
//  PANEL INFERIOR
// ═══════════════════════════════════════════════════════════════════
function drawBottomPanel() {
    const w = (LOWER.w - 16) / 2;
    const left = { x: LOWER.x, y: LOWER.y, w, h: LOWER.h };
    const right = { x: LOWER.x + w + 16, y: LOWER.y, w, h: LOWER.h };
    if (bach) {
        drawGraphX(left);
        drawGraphT(right);
    } else {
        drawMagnitudes(left);
        drawEnergy(right);
    }
}

function drawPanelBox(P, title) {
    fill(THEME.panelBg);
    stroke(THEME.panelBorder);
    strokeWeight(1);
    rect(P.x, P.y, P.w, P.h, 8);
    noStroke();
    fill(THEME.textDim);
    textSize(11);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    text(title, P.x + 14, P.y + 10);
    textStyle(NORMAL);
}

// ── ESO: magnitudes de la onda ──
function drawMagnitudes(P) {
    drawPanelBox(P, i18n.t('MAGNITUDES DE LA ONDA'));
    const items = [
        { s: 'A', v: fmt(wave.A, 2), u: 'm', c: THEME.a, n: i18n.t('amplitud') },
        { s: 'λ', v: fmt(wave.lambda, 2), u: 'm', c: THEME.l, n: i18n.t('long. de onda') },
        { s: 'T', v: fmt(wave.T, 2), u: 's', c: THEME.t, n: i18n.t('período') },
        { s: 'f', v: fmt(wave.f, 2), u: 'Hz', c: THEME.f, n: i18n.t('frecuencia') },
        { s: 'v', v: fmt(wave.v, 2), u: 'm/s', c: THEME.v, n: i18n.t('velocidad') },
    ];
    const cw = (P.w - 28) / items.length;
    items.forEach((it, k) => {
        const cx = P.x + 14 + cw * k + cw / 2;
        noStroke();
        fill(it.c);
        textAlign(CENTER, TOP);
        textSize(20);
        textStyle(BOLD);
        text(it.s, cx, P.y + 36);
        textSize(15);
        text(`${it.v} ${it.u}`, cx, P.y + 64);
        textStyle(NORMAL);
        textSize(10);
        fill(THEME.textDim);
        text(it.n, cx, P.y + 86);
    });

    // Comprobación de las relaciones
    const lines = [
        [i18n.t('Período:'), `T = 1 / f = 1 / ${fmt(wave.f, 2)} Hz = ${fmt(wave.T, 2)} s`],
        [i18n.t('Longitud de onda:'), `λ = v / f = ${fmt(wave.v, 2)} m/s / ${fmt(wave.f, 2)} Hz = ${fmt(wave.lambda, 2)} m`],
        [i18n.t('Comprobación:'), `v = λ · f = ${fmt(wave.lambda, 2)} m · ${fmt(wave.f, 2)} Hz = ${fmt(wave.v, 2)} m/s`],
    ];
    textSize(11);
    lines.forEach(([a, b], k) => {
        const y = P.y + 122 + k * 26;
        fill(THEME.textFaint);
        textAlign(LEFT, CENTER);
        text(a, P.x + 18, y);
        fill(THEME.text);
        text(b, P.x + 150, y);
    });
}

// ── ESO: energía y materia ──
function drawEnergy(P) {
    drawPanelBox(P, i18n.t('ENERGÍA, SÍ; MATERIA, NO'));
    const E = (wave.A / A_REF) ** 2 * (wave.f / F_REF) ** 2;
    const Emax = (A_MAX / A_REF) ** 2 * (F_MAX / F_REF) ** 2;

    noStroke();
    fill(THEME.textFaint);
    textSize(10.5);
    textAlign(LEFT, TOP);
    text(i18n.t('Energía que transporta la onda (E ∝ A² · f²)'), P.x + 18, P.y + 36);
    const bx = P.x + 18, by = P.y + 56, bw = P.w - 120, bh = 16;
    fill(THEME.sceneBg);
    stroke(THEME.panelBorder);
    rect(bx, by, bw, bh, 4);
    noStroke();
    fill(THEME.e);
    rect(bx, by, Math.max(2, bw * Math.sqrt(E / Emax)), bh, 4);
    fill(THEME.e);
    textSize(13);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(`× ${fmt(E, E < 10 ? 2 : 1)}`, bx + bw + 10, by + bh / 2);
    textStyle(NORMAL);
    fill(THEME.textFaint);
    textSize(9.5);
    textAlign(LEFT, TOP);
    text(i18n.t('respecto a A = 0,20 m y f = 1,00 Hz (barra en escala de raíz cuadrada)'), bx, by + bh + 4);

    // Lo que avanza la onda frente a lo que avanza la partícula P
    const fr = wave.frontX();
    const rows = [];
    if (fr != null) {
        rows.push([THEME.front, i18n.t('La onda ha avanzado:'),
                   fr >= L_MEDIO - 1e-6 ? i18n.t('todo el tramo ({d} m)', { d: fmt(L_MEDIO, 0) }) : `${fmt(fr, 2)} m`]);
    } else {
        rows.push([THEME.front, i18n.t('Pulsos emitidos:'), String(wave.pulses)]);
    }
    rows.push([THEME.p, i18n.t('La partícula P se ha desplazado:'), i18n.t('{y} m (vuelve siempre a su sitio)', { y: fmtSigned(wave.y(xP), 2) })]);
    rows.push([THEME.p, i18n.t('P oscila entre:'), i18n.t('−{a} m y +{a} m', { a: fmt(wave.A, 2) })]);
    textSize(11);
    rows.forEach(([c, a, b], k) => {
        const y = P.y + 122 + k * 26;
        fill(c);
        circle(P.x + 22, y, 7);
        fill(THEME.textFaint);
        textAlign(LEFT, CENTER);
        text(a, P.x + 32, y);
        fill(THEME.text);
        text(b, P.x + 32 + textWidth(a) + 8, y);
    });
}

// Ejes de una gráfica con rejilla. Devuelve las funciones de escala.
function graphAxes(G, xMin, xMax, xStep, xLabel, yMax, yLabel, xDigits) {
    const L = G.x + 56, R = G.x + G.w - 16, T = G.y + 34, B = G.y + G.h - 30;
    const X = (v) => map(v, xMin, xMax, L, R);
    const Yf = (v) => map(v, -yMax, yMax, B, T);
    textSize(9.5);
    for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax + 1e-9; v += xStep) {
        stroke(THEME.grid);
        strokeWeight(1);
        line(X(v), T, X(v), B);
        noStroke();
        fill(THEME.textFaint);
        textAlign(CENTER, TOP);
        text(fmt(v, xDigits), X(v), B + 5);
    }
    for (const v of [-yMax, -yMax / 2, 0, yMax / 2, yMax]) {
        stroke(v === 0 ? THEME.axis : THEME.grid);
        strokeWeight(1);
        line(L, Yf(v), R, Yf(v));
        noStroke();
        fill(THEME.textFaint);
        textAlign(RIGHT, CENTER);
        text(fmt(v, 2), L - 6, Yf(v));
    }
    textAlign(RIGHT, TOP);
    text(xLabel, R, B + 17);
    textAlign(LEFT, TOP);
    text(yLabel, L + 6, T + 2);
    return { X, Y: Yf, L, R, T, B };
}

// ── Bachillerato: y(x) en el instante actual ──
function drawGraphX(G) {
    const longi = mode === 'longitudinal';
    drawPanelBox(G, longi ? i18n.t('DESPLAZAMIENTO – POSICIÓN (FOTO EN t = {t} s)', { t: fmt(wave.t, 1) })
                          : i18n.t('ELONGACIÓN – POSICIÓN (FOTO EN t = {t} s)', { t: fmt(wave.t, 1) }));
    const ax = graphAxes(G, 0, L_MEDIO, 1, 'x (m)', A_MAX, longi ? i18n.t('ξ (m)') : 'y (m)', 0);
    noFill();
    stroke(THEME.l);
    strokeWeight(2);
    beginShape();
    for (let x = 0; x <= L_MEDIO + 1e-9; x += 0.02) vertex(ax.X(x), ax.Y(wave.y(x)));
    endShape();

    if (wave.kind === 'continua') {
        const ex = extrema(x => wave.y(x), visibleEnd(), 0.01);
        if (ex.max.length >= 2) {
            const [x1, x2] = ex.max;
            hDimension(ax.X(x1), ax.X(x2), ax.T + 6, THEME.l, 'λ');
        }
    }
    const pts = [{ x: xP, c: THEME.p, n: 'P' }];
    if (xP + dxPQ <= L_MEDIO + 1e-9) pts.push({ x: xP + dxPQ, c: THEME.q, n: 'Q' });
    pts.forEach(p => {
        noStroke();
        fill(p.c);
        circle(ax.X(p.x), ax.Y(wave.y(p.x)), 9);
        textSize(10);
        textStyle(BOLD);
        textAlign(CENTER, BOTTOM);
        text(p.n, ax.X(p.x), ax.Y(wave.y(p.x)) - 6);
        textStyle(NORMAL);
    });
}

// ── Bachillerato: y(t) de P y de Q ──
const T_WIN = 8;
function drawGraphT(G) {
    drawPanelBox(G, i18n.t('ELONGACIÓN – TIEMPO DE P Y Q'));
    const t1 = Math.max(T_WIN, wave.t), t0 = t1 - T_WIN;
    const longi = mode === 'longitudinal';
    const ax = graphAxes(G, t0, t1, 1, 't (s)', A_MAX, longi ? i18n.t('ξ (m)') : 'y (m)', 0);
    const yAt = (x, tt) => wave.sourceAt(tt - x / wave.v).y;

    const series = [{ x: xP, c: THEME.p, n: 'P' }, { x: xP + dxPQ, c: THEME.q, n: 'Q' }];
    series.forEach(sr => {
        noFill();
        stroke(sr.c);
        strokeWeight(sr.n === 'P' ? 2 : 1.6);
        beginShape();
        for (let tt = t0; tt <= Math.min(t1, wave.t) + 1e-9; tt += 0.02) vertex(ax.X(tt), ax.Y(yAt(sr.x, tt)));
        endShape();
    });

    // Período: entre dos máximos consecutivos de P
    if (wave.kind === 'continua') {
        const maxima = [];
        const h = 0.01;
        let a = yAt(xP, wave.t), b = yAt(xP, wave.t - h);
        for (let tt = wave.t - 2 * h; tt >= t0; tt -= h) {
            const c = yAt(xP, tt);
            if (b > a && b >= c && b > 0.01) maxima.push(tt + h);
            a = b; b = c;
            if (maxima.length >= 2) break;
        }
        if (maxima.length >= 2) hDimension(ax.X(maxima[1]), ax.X(maxima[0]), ax.T + 6, THEME.t, 'T');
    }

    // Leyenda
    textSize(10.5);
    let lx = ax.R - 175;
    series.forEach(sr => {
        stroke(sr.c);
        strokeWeight(3);
        line(lx, G.y + 17, lx + 16, G.y + 17);
        noStroke();
        fill(sr.c);
        textAlign(LEFT, CENTER);
        text(sr.n === 'P' ? 'P' : `Q (Δx = ${fmt(dxPQ, 2)} m)`, lx + 21, G.y + 17);
        lx += 40;
    });
}

// ═══════════════════════════════════════════════════════════════════
//  PANEL HTML
// ═══════════════════════════════════════════════════════════════════
function updatePanel() {
    select('#metric-a').html(fmt(wave.A, 2));
    select('#metric-f').html(fmt(wave.f, 2));
    select('#metric-t').html(fmt(wave.T, 2));
    select('#metric-l').html(fmt(wave.lambda, 2));
    select('#metric-v').html(fmt(wave.v, 2));
    const E = (wave.A / A_REF) ** 2 * (wave.f / F_REF) ** 2;
    select('#metric-e').html(fmt(E, E < 10 ? 2 : 1));

    const note = wave.kind === 'continua'
        ? i18n.t('λ = v / f = {v} m/s / {f} Hz = <b>{l} m</b>. Si duplicas la frecuencia, la longitud de onda se reduce a la mitad; si duplicas la amplitud, la energía se multiplica por cuatro.',
                 { v: fmt(wave.v, 2), f: fmt(wave.f, 2), l: fmt(wave.lambda, 2) })
        : i18n.t('Cada pulso dura un período (<b>T = {T} s</b>) y ocupa <b>{l} m</b> del medio mientras avanza a {v} m/s.',
                 { T: fmt(wave.T, 2), l: fmt(wave.lambda, 2), v: fmt(wave.v, 2) });
    select('#wave-note').html(note);

    // Bachillerato
    const w = wave.omega, k = wave.k;
    select('#bach-eq').html(`y(x, t) = ${fmt(wave.A, 2)} · ${i18n.t('sen')}(${fmt(w, 2)} t − ${fmt(k, 2)} x) <span class="label-hint">(SI)</span>`);
    updateLiveNotes();
}

// Valores que cambian con el tiempo (se refrescan unas veces por segundo).
function updateLiveNotes() {
    if (!bach) return;
    const w = wave.omega, k = wave.k;
    const dphi = wave.phaseDiff(dxPQ);
    const rows = [
        [i18n.t('Pulsación'), `ω = 2π f = ${fmt(w, 2)} rad/s`],
        [i18n.t('Número de onda'), `k = 2π / λ = ${fmt(k, 2)} rad/m`],
        [i18n.t('Velocidad de propagación'), `v = ω / k = ${fmt(wave.v, 2)} m/s`],
        [i18n.t('Velocidad máx. de vibración'), `A ω = ${fmt(wave.A * w, 2)} m/s`],
        [i18n.t('P ahora'), `y = ${fmtSigned(wave.y(xP), 3)} m ; v<sub>y</sub> = ${fmtSigned(wave.vy(xP), 2)} m/s`],
        [i18n.t('Desfase P–Q'), `Δφ = k Δx = ${fmt(dphi, 2)} rad`],
    ];
    select('#bach-table').html(rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join(''));

    const tol = 0.06;
    let pn;
    if (dxPQ < 1e-6) pn = i18n.t('P y Q son el mismo punto.');
    else if (dphi < tol || dphi > 2 * Math.PI - tol) pn = i18n.t('P y Q vibran <b>en fase</b>: Δx es un número entero de longitudes de onda.');
    else if (Math.abs(dphi - Math.PI) < tol) pn = i18n.t('P y Q vibran <b>en oposición de fase</b>: Δx es un número impar de medias longitudes de onda.');
    else pn = i18n.t('Q repite lo que hace P con un retraso de Δx / v = <b>{d} s</b>.', { d: fmt(dxPQ / wave.v, 2) });
    if (xP + dxPQ > L_MEDIO + 1e-9) pn += ' ' + i18n.t('Q queda fuera del tramo dibujado: acerca P al foco.');
    if (wave.kind === 'pulso') pn += ' ' + i18n.t('La ecuación describe la onda continua; con pulsos solo vale mientras pasa el pulso.');
    select('#phase-note').html(pn);
}
