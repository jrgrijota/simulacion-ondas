// ═══════════════════════════════════════════════════════════════════
//  FÍSICA DE LA ONDA
//  Un foco en x = 0 vibra con y = A · sen(φ) y el medio repite, en cada
//  punto x, lo que hizo el foco un tiempo x / v antes. Se guarda la
//  historia del foco, así que un cambio de amplitud o de frecuencia solo
//  afecta a la onda que sale después y se ve avanzar por el medio.
//  Cambiar la velocidad es cambiar el medio: afecta a todo a la vez.
// ═══════════════════════════════════════════════════════════════════

const L_MEDIO = 4;            // longitud visible del medio (m)
const HIST_DT = 1 / 120;      // separación entre muestras de la historia (s)
const HIST_MAX = 30;          // segundos de historia que se guardan

class Wave {
    constructor() {
        this.A = 0.20;        // amplitud (m)
        this.f = 1.00;        // frecuencia (Hz)
        this.v = 1.50;        // velocidad de propagación (m/s)
        this.kind = 'continua';   // 'continua' | 'pulso'
        this.reset();
    }

    get T()      { return 1 / this.f; }
    get lambda() { return this.v / this.f; }
    get omega()  { return 2 * Math.PI * this.f; }
    get k()      { return 2 * Math.PI / this.lambda; }

    // Vuelve a dejar el medio en reposo y el reloj a cero.
    reset() {
        this.t = 0;
        this.phase = 0;           // fase acumulada del foco (rad)
        this.pulseLeft = 0;       // fase que le queda al pulso en curso (rad)
        this.hist = [];           // { t, y, vy } del foco
        this.pulses = 0;
        this.record();
    }

    emitPulse() {
        if (this.kind !== 'pulso') return;
        this.pulseLeft = 2 * Math.PI;
        this.pulses++;
    }

    // Estado del foco ahora: elongación y velocidad de vibración.
    sourceNow() {
        if (this.kind === 'continua') {
            return { y: this.A * Math.sin(this.phase), vy: this.A * this.omega * Math.cos(this.phase) };
        }
        if (this.pulseLeft > 0) {
            const ph = 2 * Math.PI - this.pulseLeft;
            return { y: this.A * Math.sin(ph), vy: this.A * this.omega * Math.cos(ph) };
        }
        return { y: 0, vy: 0 };
    }

    record() {
        const s = this.sourceNow();
        this.hist.push({ t: this.t, y: s.y, vy: s.vy });
        const tMin = this.t - HIST_MAX;
        let cut = 0;
        while (cut < this.hist.length - 2 && this.hist[cut + 1].t < tMin) cut++;
        if (cut > 0) this.hist.splice(0, cut);
    }

    step(dt) {
        // Pasos pequeños para que la historia quede bien muestreada
        let left = dt;
        while (left > 1e-9) {
            const h = Math.min(HIST_DT, left);
            this.t += h;
            if (this.kind === 'continua') {
                this.phase = (this.phase + this.omega * h) % (2 * Math.PI);
            } else if (this.pulseLeft > 0) {
                this.pulseLeft = Math.max(0, this.pulseLeft - this.omega * h);
            }
            this.record();
            left -= h;
        }
    }

    // Lo que hacía el foco en el instante ts (interpolado en la historia).
    sourceAt(ts) {
        const H = this.hist;
        if (!H.length || ts < H[0].t) return { y: 0, vy: 0 };
        if (ts >= H[H.length - 1].t) return H[H.length - 1];
        let lo = 0, hi = H.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (H[mid].t <= ts) lo = mid; else hi = mid;
        }
        const a = H[lo], b = H[hi];
        const u = (ts - a.t) / (b.t - a.t || 1);
        return { y: a.y + (b.y - a.y) * u, vy: a.vy + (b.vy - a.vy) * u };
    }

    // Elongación del punto x del medio en el instante actual.
    y(x)  { return this.sourceAt(this.t - x / this.v).y; }
    // Velocidad de vibración del punto x.
    vy(x) { return this.sourceAt(this.t - x / this.v).vy; }

    // Hasta dónde ha llegado la onda continua (null en modo pulso).
    frontX() {
        if (this.kind !== 'continua') return null;
        return Math.min(L_MEDIO, this.v * this.t);
    }

    // Diferencia de fase entre dos puntos separados dx, reducida a [0, 2π).
    phaseDiff(dx) {
        const d = (this.k * dx) % (2 * Math.PI);
        return d < 0 ? d + 2 * Math.PI : d;
    }

    // Energía transportada relativa al máximo de los controles: E ∝ A² · f².
    energyRel() {
        return (this.A * this.A * this.f * this.f) / (A_MAX * A_MAX * F_MAX * F_MAX);
    }
}

const A_MIN = 0.05, A_MAX = 0.30;
const F_MIN = 0.25, F_MAX = 2.00;
const V_MIN = 0.50, V_MAX = 3.00;
