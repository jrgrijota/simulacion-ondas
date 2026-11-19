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
const CV_W = 1050;
let CV_H = 700;
// En el estilo SimulaCiencia (temas Pizarra y Día) hay una franja arriba para la
// mascota y su bocadillo: el lienzo crece hacia abajo y la escena baja con él.
const FRANJA = 58;
const BANNER = { x: 16, y: 14, w: 1018, h: 46 };
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
    if (document.fonts) document.fonts.load('600 12px Fredoka');
    // Doble resolución: en la pizarra digital el lienzo se amplía sin verse borroso
    pixelDensity(Math.max(2, displayDensity()));
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

    // Simulación ya preparada desde la dirección (js/parametros.js),
    // p. ej. ?modo=longitudinal&f=0.5&v=2 o ?onda=pulso&bach=si
    aplicarParametrosUrl({
        modo:      (v) => { if (['transversal', 'longitudinal', 'comparar'].includes(v)) setMode(v); },
        onda:      urlParam.select('wave-kind'),                              // continua | pulso
        amplitud:  urlParam.range('slider-a'),                                // m
        f:         urlParam.range('slider-f'),                                // Hz
        v:         urlParam.range('slider-v'),                                // m/s
        ritmo:     (v) => {
            const b = document.querySelector(`.speed-btn[data-speed="${{ '1': '1', '0.5': '0.5', '0,5': '0.5', '0.25': '0.25', '0,25': '0.25' }[v]}"]`);
            if (b) b.click();
        },
        rotulos:   urlParam.toggle('check-rotulos', (el) => el.checked),
        bach:      urlParam.toggle('check-bach', (el) => el.checked),
        dx:        urlParam.range('slider-dx'),                               // m
    });
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
    aplicarLayout();
    if (THEME.fun) {
        // El marco exterior se dibuja dentro del lienzo: así encoge con él y nunca
        // choca con los tableros (en el móvil el lienzo se reduce mucho).
        clear();
        stroke(THEME.panelBorder); strokeWeight(2); fill(THEME.canvasBg);
        rect(1, 1, CV_W - 2, CV_H - 2, 34);
        textFont('Fredoka');
    } else {
        background(THEME.canvasBg);
        textFont('monospace');
    }
    const dt = Math.min(deltaTime / 1000, 1 / 20);
    if (playing) {
        const before = wave.frontX();
        wave.step(dt * speed);
        if (before != null && before < L_MEDIO && wave.frontX() >= L_MEDIO) {
            anunciar(i18n.t('La onda ha llegado al final del tramo dibujado: ahora todo el medio vibra.'));
        }
    }

    if (THEME.fun) drawBocadillo();
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

// Coloca la escena y el panel inferior según haya o no franja de la mascota.
function aplicarLayout() {
    const off = THEME.fun ? FRANJA : 0;
    SCENE.y = 16 + off;
    LOWER.y = 462 + off;
    if (CV_H !== 700 + off) {
        CV_H = 700 + off;
        resizeCanvas(CV_W, CV_H);
        fitCanvas();
    }
}

// Los lectores de pantalla leen los cambios importantes (no cada fotograma).
let ultimoAnuncio = '';
function anunciar(msg) {
    if (msg === ultimoAnuncio) return;
    ultimoAnuncio = msg;
    document.getElementById('anuncio').textContent = msg;
}

// ═══════════════════════════════════════════════════════════════════
//  ESTILO SIMULACIENCIA: TARJETAS, MASCOTA Y CHISPAS
//  (el mismo que en Cambios de estado y Densidad; solo en Pizarra y Día)
// ═══════════════════════════════════════════════════════════════════
const MOV_REDUCIDO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FUENTE_TEXTO = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
let claveMascota = '', desdeMascota = -1e9, chispas = [];
let notaFase = { clave: '', txt: '' };   // lo que dice la mascota en Bachillerato

// Títulos en tipo frase («Onda transversal en una cuerda»); P y Q siguen en mayúscula.
function frase(t) {
    if (!THEME.fun) return t;
    const l = t.toLocaleLowerCase().replace(/(^|[^\p{L}])([pq])(?![\p{L}])/gu, (m, a, b) => a + b.toUpperCase());
    return l.charAt(0).toLocaleUpperCase() + l.slice(1);
}

// Tamaño de letra (≤ base) para que todos los textos quepan en el ancho dado.
function ajustar(textos, ancho, base) {
    textSize(base);
    const w = Math.max(...textos.map(t => textWidth(t)));
    return w > ancho ? Math.max(9, base * ancho / w) : base;
}

// Tarjeta redondeada con borde y sombra sólida de tinta
function tarjeta(x, y, w, h, r, relleno) {
    noStroke(); fill(THEME.ink); rect(x, y + 4, w, h, r);
    stroke(THEME.panelBorder); strokeWeight(2); fill(relleno);
    rect(x, y, w, h, r);
    noStroke();
}

function salto(t0) {
    if (MOV_REDUCIDO) return 1;
    const e = (millis() - t0) / 450;
    if (e >= 1) return 1;
    return 1 + 0.35 * sin(e * PI) * (1 - e);
}

function lanzarChispas(x, y, col, n) {
    if (MOV_REDUCIDO) return;
    for (let i = 0; i < n; i++) {
        const a = random(TWO_PI), v = random(1.5, 4);
        chispas.push({ x, y, vx: cos(a) * v, vy: sin(a) * v - 1, vida: 1, col, r: random(3, 6), estrella: random() < 0.5 });
    }
}

function drawChispas() {
    // Las chispas no salen de la zona de la mascota: nunca tapan texto
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(BANNER.x, BANNER.y - 6, 120, BANNER.h + 12);
    drawingContext.clip();
    for (let i = chispas.length - 1; i >= 0; i--) {
        const c = chispas[i];
        c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.vida -= 0.04;
        if (c.vida <= 0) { chispas.splice(i, 1); continue; }
        const col = color(c.col); col.setAlpha(255 * c.vida);
        noStroke(); fill(col);
        if (c.estrella) estrella(c.x, c.y, c.r * 1.3, c.r * 0.5);
        else circle(c.x, c.y, c.r * 2 * c.vida);
    }
    drawingContext.restore();
}

function estrella(x, y, r1, r2) {
    beginShape();
    for (let i = 0; i < 10; i++) {
        const a = -HALF_PI + i * PI / 5, r = i % 2 ? r2 : r1;
        vertex(x + cos(a) * r, y + sin(a) * r);
    }
    endShape(CLOSE);
}

// Mascota: una partícula sonriente que dice el mensaje en un bocadillo.
function drawMascota(cx, cy, r, col) {
    const bote = MOV_REDUCIDO ? 0 : sin(millis() / 260) * 1.5;
    const parpadeo = millis() % 4200 > 4050;
    push();
    translate(cx, cy + bote);
    const s = salto(desdeMascota);
    scale(s, 2 - s);
    noStroke(); fill(0, 0, 0, 45); ellipse(0, r + 3 - bote, r * 1.5, 5);
    stroke(THEME.ink); strokeWeight(2.5); fill(col);
    circle(0, 0, r * 2);
    noStroke(); fill(255, 255, 255, 150);
    ellipse(-r * 0.42, -r * 0.45, r * 0.55, r * 0.35);
    fill(THEME.ink);
    if (parpadeo) { stroke(THEME.ink); strokeWeight(2); line(-r * 0.42, -r * 0.05, -r * 0.18, -r * 0.05); line(r * 0.18, -r * 0.05, r * 0.42, -r * 0.05); }
    else { ellipse(-r * 0.3, -r * 0.08, r * 0.2, r * 0.3); ellipse(r * 0.3, -r * 0.08, r * 0.2, r * 0.3); }
    noFill(); stroke(THEME.ink); strokeWeight(2.2);
    arc(0, r * 0.18, r * 0.6, r * 0.45, 0.15 * PI, 0.85 * PI);
    noStroke(); fill(255, 120, 150, 120);
    circle(-r * 0.58, r * 0.22, r * 0.3); circle(r * 0.58, r * 0.22, r * 0.3);
    pop();
}

// Lo que dice la mascota: qué vibra y hacia dónde en cada modo y, en
// Bachillerato, cómo vibran P y Q (los mismos textos que ya tenía la simulación).
function mensajeMascota() {
    const tag = i18n.t({ transversal: 'Transversal', longitudinal: 'Longitudinal', comparar: 'Comparar' }[mode]);
    const col = { transversal: THEME.l, longitudinal: THEME.e, comparar: THEME.v }[mode];
    if (bach && notaFase.txt) return { clave: mode + '|' + notaFase.clave, tag, txt: notaFase.txt, col: THEME.q };
    let txt;
    if (mode === 'transversal') txt = i18n.t('Las partículas vibran en dirección perpendicular a la propagación');
    else if (mode === 'longitudinal') txt = i18n.t('Las partículas vibran en la misma dirección en que se propaga la onda');
    else {
        txt = i18n.t('Comparación: arriba la onda transversal y abajo la longitudinal, con el mismo foco y el mismo medio.');
        const dosPuntos = txt.indexOf(': ');
        if (dosPuntos > 0 && dosPuntos < 20) txt = txt.slice(dosPuntos + 2);
        txt = txt.charAt(0).toLocaleUpperCase() + txt.slice(1);
    }
    return { clave: mode, tag, txt, col };
}

// Franja superior: mascota + bocadillo con etiqueta y mensaje
function drawBocadillo() {
    const m = mensajeMascota();
    const { x, y, w, h } = BANNER;
    if (m.clave !== claveMascota) {
        if (claveMascota) lanzarChispas(x + 24, y + h / 2, m.col, 12);
        claveMascota = m.clave; desdeMascota = millis();
    }
    // En el tema Día los colores son oscuros (para leerse): la mascota, más clara
    const cm = lightness(color(m.col)) > 55 ? color(m.col) : lerpColor(color(m.col), color(255), 0.45);
    drawMascota(x + 24, y + h / 2, 20, cm);

    const bx = x + 56, my = y + h / 2;
    noStroke(); fill(THEME.ink); rect(bx, y + 3, w - 56, h, 16);
    stroke(THEME.panelBorder); strokeWeight(2); fill(THEME.panelBg);
    triangle(bx - 10, my, bx + 4, my - 8, bx + 4, my + 8);
    rect(bx, y, w - 56, h, 16);
    noStroke(); fill(THEME.panelBg);
    triangle(bx - 7, my, bx + 3, my - 6, bx + 3, my + 6);

    textStyle(BOLD); textSize(16);
    const tw = textWidth(m.tag) + 26;
    push();
    translate(bx + 12 + tw / 2, my);
    scale(salto(desdeMascota));
    noStroke(); fill(THEME.ink); rect(-tw / 2, -12, tw, 28, 14);
    fill(m.col); rect(-tw / 2, -14, tw, 28, 14);
    fill(lightness(color(m.col)) > 55 ? THEME.ink : '#ffffff'); textAlign(CENTER, CENTER);
    text(m.tag, 0, -1);
    pop();
    textStyle(NORMAL);

    textFont(FUENTE_TEXTO);
    const tx = bx + 12 + tw + 14, ancho = x + w - tx - 14;
    fill(THEME.text); textAlign(LEFT, CENTER); textLeading(19);
    // Una línea a 17 px si cabe; si no, dos líneas a 15 px
    textSize(17);
    if (textWidth(m.txt) > ancho) textSize(15);
    text(m.txt, tx, y + 2, ancho, h - 4);
    textFont('Fredoka');
    drawChispas();
}

// ═══════════════════════════════════════════════════════════════════
//  TEMAS DEL LIENZO
// ═══════════════════════════════════════════════════════════════════
function updateTheme() {
    const isLight    = document.body.classList.contains('theme-light');
    const isContrast = document.body.classList.contains('theme-contrast');
    if (isLight) {
        // Día: claro sin llegar a blanco, con el azul de SimulaCiencia
        THEME = {
            canvasBg: '#eef5fb', sceneBg: '#f7fbff', panelBg: '#f7fbff', panelBorder: '#a9c6de',
            text: '#13304a', textDim: '#3f5f7a', textFaint: '#4d6b85', grid: color(19, 48, 74, 30),
            rope: '#13304a', bead: '#ffffff', particle: '#ffffff', axis: color(19, 48, 74, 110),
            device: '#13304a', deviceFill: '#bfe3f7',
            a: '#b91c1c', f: '#7e22ce', t: '#11703a', l: '#0369a1', v: '#8a5300', e: '#b23c0a',
            p: '#c81e1e', q: '#6d28d9', crest: '#0369a1', comp: color(3, 105, 161, 75), rare: color(194, 65, 12, 55),
            front: '#8a5300', msgBg: color(255, 255, 255, 235), warn: '#c0402a',
            title: '#0b2236', ink: '#13304a', hundido: '#dbe8f3', fun: true,
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
        // Pizarra: azules de SimulaCiencia, oscuro de tono medio para la pizarra digital
        THEME = {
            canvasBg: '#11314f', sceneBg: '#0f2d49', panelBg: '#15395a', panelBorder: '#2d6996',
            text: '#eef7ff', textDim: '#b5d3ec', textFaint: '#9cc0de', grid: color(255, 255, 255, 26),
            rope: '#e6f4ff', bead: '#f4fbff', particle: '#f4fbff', axis: color(255, 255, 255, 80),
            device: '#b5d3ec', deviceFill: '#2d6996',
            a: '#ff8f8f', f: '#d9a8ff', t: '#5ee89a', l: '#5ccfff', v: '#ffd84a', e: '#ffa25a',
            p: '#ff8f8f', q: '#d9a8ff', crest: '#5ccfff', comp: color(92, 207, 255, 110), rare: color(255, 162, 90, 80),
            front: '#ffd84a', msgBg: color(11, 34, 54, 235), warn: '#ff8a6a',
            title: '#ffffff', ink: '#071a2b', hundido: '#0b2236', fun: true,
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
    if (THEME.fun) tarjeta(SCENE.x, SCENE.y, SCENE.w, SCENE.h, 20, THEME.sceneBg);
    else {
        fill(THEME.sceneBg);
        stroke(THEME.panelBorder);
        strokeWeight(1);
        rect(SCENE.x, SCENE.y, SCENE.w, SCENE.h, 10);
    }

    const L = lanes();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(SCENE.x + 1, SCENE.y + 1, SCENE.w - 2, SCENE.h - 2);
    drawingContext.clip();
    if (mode === 'comparar') {
        stroke(THEME.panelBorder);
        if (THEME.fun) { strokeWeight(2); drawingContext.setLineDash([6, 6]); }
        line(SCENE.x + 12, SCENE.y + 216, SCENE.x + SCENE.w - 12, SCENE.y + 216);
        drawingContext.setLineDash([]);
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
    if (THEME.fun) {
        // En tipo frase; la explicación la dice la mascota en su bocadillo
        fill(THEME.textDim); circle(SCENE.x + 22, lane.top + 14, 8);
        fill(THEME.title); textSize(15); textStyle(BOLD); textAlign(LEFT, CENTER);
        text(frase(title), SCENE.x + 34, lane.top + 14);
        textStyle(NORMAL);
        return;
    }
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
    const g = THEME.fun;
    const xe = SCENE.x + SCENE.w - (g ? 124 : 110), ay = lane.top + (g ? 14 : 13);
    arrow(xe - 120, ay, xe, ay, THEME.v, g ? 3 : 2, g ? 11 : 8);
    noStroke();
    fill(THEME.v);
    textSize(g ? 14 : 10.5);
    textAlign(RIGHT, CENTER);
    text(i18n.t('propagación'), xe - 128, ay);
}

function drawClock() {
    noStroke();
    const g = THEME.fun;
    textSize(g ? 17 : 11);
    textAlign(RIGHT, TOP);
    fill(g ? THEME.title : THEME.textDim);
    if (g) textStyle(BOLD);
    const tx = SCENE.x + SCENE.w - 16;
    text(`t = ${fmt(wave.t, 1)} s`, tx, SCENE.y + (g ? 8 : 14));
    textStyle(NORMAL);
    if (g) textSize(13);
    if (!playing) {
        fill(THEME.warn);
        if (g) textStyle(BOLD);
        text(g ? frase(i18n.t('EN PAUSA')) : i18n.t('EN PAUSA'), tx, SCENE.y + (g ? 30 : 30));
        textStyle(NORMAL);
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
function hDimension(xa, xb, y, col, label, grande = true) {
    const g = THEME.fun;
    stroke(col);
    strokeWeight(g ? 2 : 1.3);
    line(xa, y - 6, xa, y + 6);
    line(xb, y - 6, xb, y + 6);
    dblArrow(xa + 1, y, xb - 1, y, col, g ? 2 : 1.3, g ? 8 : 6);
    noStroke();
    textStyle(BOLD);
    if (g) {
        // λ es lo que se mide en clase: en grande, en una pastilla
        textSize(grande ? 17 : 13);
        const w = textWidth(label) + 18, h = grande ? 26 : 20;
        fill(THEME.ink); rect((xa + xb) / 2 - w / 2, y - h / 2 + 2, w, h, h / 2);
        stroke(col); strokeWeight(2); fill(THEME.sceneBg);
        rect((xa + xb) / 2 - w / 2, y - h / 2, w, h, h / 2);
        noStroke(); fill(col); textAlign(CENTER, CENTER);
        text(label, (xa + xb) / 2, y - 1);
        textStyle(NORMAL);
        return;
    }
    fill(THEME.sceneBg);
    textSize(11);
    const w = textWidth(label) + 10;
    rect((xa + xb) / 2 - w / 2, y - 8, w, 16, 4);
    fill(col);
    textAlign(CENTER, CENTER);
    text(label, (xa + xb) / 2, y);
    textStyle(NORMAL);
}

function chip(x, y, label, col, alignX = CENTER) {
    noStroke();
    const g = THEME.fun;
    textSize(g ? 13 : 10.5);
    const w = textWidth(label) + (g ? 16 : 10);
    const left = alignX === CENTER ? x - w / 2 : alignX === LEFT ? x : x - w;
    fill(THEME.msgBg);
    if (g) { stroke(col); strokeWeight(1.5); rect(left, y - 10, w, 20, 10); noStroke(); }
    else rect(left, y - 8, w, 16, 4);
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

    // Cuerda (en el estilo SimulaCiencia, con contorno de tinta)
    noFill();
    strokeJoin(ROUND); strokeCap(ROUND);
    const capas = THEME.fun ? [[THEME.ink, 7], [THEME.rope, 3.5]] : [[THEME.rope, 2]];
    for (const [col, peso] of capas) {
        stroke(col);
        strokeWeight(peso);
        beginShape();
        for (let px = X0; px <= XP(L_MEDIO); px += 3) vertex(px, Y(wave.y((px - X0) / PX)));
        endShape();
    }

    // Partículas de la cuerda
    if (THEME.fun) { stroke(THEME.ink); strokeWeight(2); } else noStroke();
    fill(THEME.bead);
    const dB = THEME.fun ? 10 : 6;
    for (let x = 0; x <= L_MEDIO + 1e-9; x += STEP_T) circle(XP(x), Y(wave.y(x)), dB);
    noStroke();

    // Frente de la onda continua
    const fr = wave.frontX();
    if (fr != null && fr < L_MEDIO - 0.02) {
        stroke(THEME.front);
        strokeWeight(THEME.fun ? 2 : 1);
        drawingContext.setLineDash(THEME.fun ? [4, 5] : [2, 4]);
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
            if (cy - ya > 12) dblArrow(xa, cy, xa, ya, THEME.a, THEME.fun ? 2.2 : 1.5, THEME.fun ? 8 : 6);
            noStroke();
            fill(THEME.a);
            textSize(THEME.fun ? 20 : 11);
            textStyle(BOLD);
            textAlign(LEFT, CENTER);
            text('A', xa + (THEME.fun ? 8 : 6), (cy + ya) / 2);
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
    if (THEME.fun) { stroke(THEME.ink); strokeWeight(1.6); } else noStroke();
    fill(THEME.particle);
    const dP = THEME.fun ? 8 : 5;
    for (let x = 0; x <= L_MEDIO + 1e-9; x += STEP_L) {
        const px = xs(x);
        for (const ry of rowsY) circle(px, ry, dP);
    }
    noStroke();

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
        textSize(THEME.fun ? 11 : 9.5);
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
    const g = THEME.fun;
    stroke(g ? THEME.ink : THEME.device);
    strokeWeight(g ? 2.5 : 1.4);
    fill(THEME.deviceFill);
    strokeCap(ROUND);
    if (dir === 'vertical') {
        rect(x - 26, cy - 22, 34, 44, g ? 9 : 5);
        if (g) { noStroke(); fill(255, 255, 255, 110); rect(x - 21, cy - 17, 6, 22, 3); }
        const yy = cy - disp * PX;
        if (g) { stroke(THEME.ink); strokeWeight(7); line(x + 8, yy, X0, yy); }
        stroke(THEME.device);
        strokeWeight(3);
        line(x + 8, yy, X0, yy);
        if (g) { stroke(THEME.ink); strokeWeight(2); } else noStroke();
        fill(THEME.device);
        rect(x - 4, yy - 4, 14, 8, 2);
        dblArrow(x - 9, cy - 14, x - 9, cy + 14, g ? THEME.ink : THEME.textFaint, 1.2, 4);
    } else {
        rect(x - 104, cy - 22, 30, 44, g ? 9 : 5);
        if (g) { noStroke(); fill(255, 255, 255, 110); rect(x - 99, cy - 17, 6, 22, 3); }
        const xx = x + disp * PX;
        if (g) { stroke(THEME.ink); strokeWeight(7); line(x - 74, cy, xx, cy); strokeWeight(9); line(xx, cy - span - 6, xx, cy + span + 6); }
        stroke(THEME.device);
        strokeWeight(3);
        line(x - 74, cy, xx, cy);
        strokeWeight(5);
        line(xx, cy - span - 6, xx, cy + span + 6);
        dblArrow(x - 99, cy, x - 79, cy, g ? THEME.ink : THEME.textFaint, 1.2, 4);
    }
    noStroke();
    fill(THEME.textFaint);
    textSize(g ? 13 : 9.5);
    textAlign(CENTER, TOP);
    if (dir === 'vertical' && g) {
        // Debajo del vibrador: arriba lo tapaba la varilla al subir
        textAlign(CENTER, TOP);
        text(i18n.t('foco'), x - 9, cy + 28);
    } else if (dir === 'vertical') {
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
            if (THEME.fun) { stroke(THEME.ink); strokeWeight(2.5); } else noStroke();
            fill(pt.col);
            circle(px, Y(yv), THEME.fun ? 18 : 12);
            noStroke();
            if (THEME.fun) { fill(255, 255, 255, 170); circle(px - 3, Y(yv) - 3, 5); }
            else { fill(THEME.sceneBg); circle(px, Y(yv), 4); }
            fill(pt.col);
            textSize(THEME.fun ? 18 : 12);
            textStyle(BOLD);
            textAlign(LEFT, CENTER);
            text(pt.name, px + (THEME.fun ? 12 : 9), Y(yv) + (yv >= 0 ? 14 : -14));
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
            if (THEME.fun) { stroke(THEME.ink); strokeWeight(2); } else noStroke();
            fill(pt.col);
            for (const ry of L.rowsY) circle(px, ry, ry === mid ? (THEME.fun ? 17 : 12) : (THEME.fun ? 9 : 6));
            noStroke();
            if (THEME.fun) { fill(255, 255, 255, 170); circle(px - 3, mid - 3, 5); }
            else { fill(THEME.sceneBg); circle(px, mid, 4); }
            fill(pt.col);
            textSize(THEME.fun ? 18 : 11);
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
        textSize(THEME.fun ? 13 : 10);
        textAlign(LEFT, CENTER);
        dblArrow(px - 18, yy - 12, px - 18, yy + 12, THEME.p, THEME.fun ? 2.2 : 1.4, THEME.fun ? 7 : 5);
        if (mode !== 'comparar') text(i18n.t('vibración'), px - 10, yy);
    } else {
        const yy = mode === 'comparar' ? L.rowsY[0] - 10 : L.rowsY[ROWS_L - 1] + 44;
        dblArrow(px - 16, yy, px + 16, yy, THEME.p, THEME.fun ? 2.2 : 1.4, THEME.fun ? 7 : 5);
        noStroke();
        fill(THEME.p);
        textSize(THEME.fun ? 13 : 10);
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
    if (THEME.fun) {
        tarjeta(P.x, P.y, P.w, P.h, 18, THEME.panelBg);
        fill(THEME.textDim); circle(P.x + 20, P.y + 19, 8);
        fill(THEME.title); textSize(15); textStyle(BOLD); textAlign(LEFT, CENTER);
        text(frase(title), P.x + 32, P.y + 19);
        textStyle(NORMAL);
        return;
    }
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
        const g = THEME.fun;
        fill(it.c);
        textAlign(CENTER, TOP);
        textSize(g ? 26 : 20);
        textStyle(BOLD);
        text(it.s, cx, P.y + (g ? 32 : 36));
        // Las cifras clave, grandes para leerse desde el fondo de la clase
        if (g) fill(THEME.title);
        textSize(g ? 20 : 15);
        text(`${it.v} ${it.u}`, cx, P.y + (g ? 64 : 64));
        textStyle(NORMAL);
        textSize(g ? 12 : 10);
        fill(THEME.textDim);
        text(it.n, cx, P.y + (g ? 90 : 86));
    });

    // Comprobación de las relaciones
    const lines = [
        [i18n.t('Período:'), `T = 1 / f = 1 / ${fmt(wave.f, 2)} Hz = ${fmt(wave.T, 2)} s`],
        [i18n.t('Longitud de onda:'), `λ = v / f = ${fmt(wave.v, 2)} m/s / ${fmt(wave.f, 2)} Hz = ${fmt(wave.lambda, 2)} m`],
        [i18n.t('Comprobación:'), `v = λ · f = ${fmt(wave.lambda, 2)} m · ${fmt(wave.f, 2)} Hz = ${fmt(wave.v, 2)} m/s`],
    ];
    textSize(11);
    let col2 = P.x + 150;
    if (THEME.fun) {
        textSize(13);
        col2 = P.x + 18 + Math.max(...lines.map(([a]) => textWidth(a))) + 12;
        textSize(ajustar(lines.map(([, b]) => b), P.x + P.w - 14 - col2, 13));
    }
    lines.forEach(([a, b], k) => {
        const y = P.y + 122 + k * (THEME.fun ? 28 : 26);
        fill(THEME.textFaint);
        textAlign(LEFT, CENTER);
        text(a, P.x + 18, y);
        fill(THEME.text);
        text(b, col2, y);
    });
}

// ── ESO: energía y materia ──
function drawEnergy(P) {
    drawPanelBox(P, i18n.t('ENERGÍA, SÍ; MATERIA, NO'));
    const E = (wave.A / A_REF) ** 2 * (wave.f / F_REF) ** 2;
    const Emax = (A_MAX / A_REF) ** 2 * (F_MAX / F_REF) ** 2;

    const g = THEME.fun;
    noStroke();
    fill(THEME.textFaint);
    textSize(g ? 13 : 10.5);
    textAlign(LEFT, TOP);
    text(i18n.t('Energía que transporta la onda (E ∝ A² · f²)'), P.x + 18, P.y + (g ? 38 : 36));
    const bx = P.x + 18, by = P.y + (g ? 60 : 56), bw = P.w - (g ? 130 : 120), bh = g ? 20 : 16;
    if (g) {
        // Barra gruesa con contorno de tinta y brillo
        noStroke(); fill(THEME.hundido); rect(bx, by, bw, bh, bh / 2);
        fill(THEME.e); rect(bx, by, Math.max(bh, bw * Math.sqrt(E / Emax)), bh, bh / 2);
        fill(255, 255, 255, 90); rect(bx + 6, by + 4, Math.max(4, bw * Math.sqrt(E / Emax) - 12), 4, 2);
        noFill(); stroke(THEME.ink); strokeWeight(2.5); rect(bx, by, bw, bh, bh / 2);
        noStroke();
    } else {
        fill(THEME.sceneBg);
        stroke(THEME.panelBorder);
        rect(bx, by, bw, bh, 4);
        noStroke();
        fill(THEME.e);
        rect(bx, by, Math.max(2, bw * Math.sqrt(E / Emax)), bh, 4);
    }
    fill(g ? THEME.title : THEME.e);
    textSize(g ? 22 : 13);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(`× ${fmt(E, E < 10 ? 2 : 1)}`, bx + bw + 10, by + bh / 2);
    textStyle(NORMAL);
    fill(THEME.textFaint);
    textSize(g ? 11 : 9.5);
    textAlign(LEFT, TOP);
    text(i18n.t('respecto a A = 0,20 m y f = 1,00 Hz (barra en escala de raíz cuadrada)'), bx, by + bh + (g ? 6 : 4));

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
    if (THEME.fun) textSize(ajustar(rows.map(([, a, b]) => a + '  ' + b), P.w - 46, 13));
    rows.forEach(([c, a, b], k) => {
        const y = P.y + 122 + k * (THEME.fun ? 28 : 26);
        fill(c);
        if (THEME.fun) { stroke(THEME.ink); strokeWeight(1.5); }
        circle(P.x + 22, y, THEME.fun ? 10 : 7);
        noStroke();
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
    textSize(THEME.fun ? 11 : 9.5);
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
    strokeWeight(THEME.fun ? 3.5 : 2);
    strokeJoin(ROUND);
    beginShape();
    for (let x = 0; x <= L_MEDIO + 1e-9; x += 0.02) vertex(ax.X(x), ax.Y(wave.y(x)));
    endShape();

    if (wave.kind === 'continua') {
        const ex = extrema(x => wave.y(x), visibleEnd(), 0.01);
        if (ex.max.length >= 2) {
            const [x1, x2] = ex.max;
            hDimension(ax.X(x1), ax.X(x2), ax.T + 6, THEME.l, 'λ', false);
        }
    }
    const pts = [{ x: xP, c: THEME.p, n: 'P' }];
    if (xP + dxPQ <= L_MEDIO + 1e-9) pts.push({ x: xP + dxPQ, c: THEME.q, n: 'Q' });
    pts.forEach(p => {
        if (THEME.fun) { stroke(THEME.ink); strokeWeight(2); } else noStroke();
        fill(p.c);
        circle(ax.X(p.x), ax.Y(wave.y(p.x)), THEME.fun ? 12 : 9);
        noStroke();
        textSize(THEME.fun ? 13 : 10);
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
        strokeWeight((sr.n === 'P' ? 2 : 1.6) * (THEME.fun ? 1.6 : 1));
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
        if (maxima.length >= 2) hDimension(ax.X(maxima[1]), ax.X(maxima[0]), ax.T + 6, THEME.t, 'T', false);
    }

    // Leyenda
    textSize(THEME.fun ? 12 : 10.5);
    let lx = ax.R - (THEME.fun ? 190 : 175);
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
    // La mascota dice la frase principal, sin los avisos añadidos
    const clave = dxPQ < 1e-6 ? 'mismo' : (dphi < tol || dphi > 2 * Math.PI - tol) ? 'fase'
                : Math.abs(dphi - Math.PI) < tol ? 'oposicion' : 'retraso';
    const div = document.createElement('div');
    div.innerHTML = { mismo: i18n.t('P y Q son el mismo punto.'),
                      fase: i18n.t('P y Q vibran <b>en fase</b>: Δx es un número entero de longitudes de onda.'),
                      oposicion: i18n.t('P y Q vibran <b>en oposición de fase</b>: Δx es un número impar de medias longitudes de onda.'),
                      retraso: i18n.t('Q repite lo que hace P con un retraso de Δx / v = <b>{d} s</b>.', { d: fmt(dxPQ / wave.v, 2) }) }[clave];
    notaFase = { clave, txt: div.textContent };
}
