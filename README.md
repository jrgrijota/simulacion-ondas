# Ondas — Simulación Interactiva

Simulación para **Física y Química de 4.º ESO** y **Física de 2.º de Bachillerato** sobre ondas
mecánicas: la diferencia entre ondas transversales y longitudinales, las magnitudes que las
describen (amplitud, longitud de onda, período, frecuencia y velocidad de propagación) y la idea
de que una onda transporta energía, pero no materia.

## Modos

- **Transversal:** un vibrador hace oscilar el extremo de una cuerda. Las partículas suben y bajan
  mientras la onda avanza hacia la derecha.
- **Longitudinal:** un pistón empuja un muelle dibujado como columnas de partículas. Las partículas
  van y vienen en la dirección de propagación y forman compresiones y enrarecimientos.
- **Comparar:** las dos a la vez, con el mismo foco y el mismo medio.

En los tres modos se elige la **amplitud** (0,05–0,30 m) y la **frecuencia** (0,25–2 Hz) del foco,
y la **velocidad de propagación** del medio (0,5–3 m/s). Un cambio en el foco sale del foco y
avanza por el medio, así que se ve cómo cambia la longitud de onda; un cambio de velocidad afecta
a todo el medio a la vez. El foco puede emitir una **onda continua** o **pulsos** sueltos.

El lienzo muestra la cota de la **longitud de onda** medida entre dos crestas (o dos compresiones),
la **amplitud**, las crestas y los valles, el frente de la onda y una **partícula marcada P** (se
elige pulsando el medio) con su recorrido de vibración. Debajo, las magnitudes con las relaciones
T = 1 / f y v = λ · f, y la **energía** que transporta la onda (E ∝ A² · f²) frente a lo que se
desplaza la partícula P.

La casilla **Bachillerato** cambia el panel inferior por la gráfica de la elongación frente a la
posición (una foto de la onda) y frente al tiempo para dos puntos P y Q, y añade la ecuación
y(x, t) = A · sen(ωt − kx) con sus valores, la pulsación, el número de onda, la velocidad de
vibración y la diferencia de fase entre P y Q (con botones para Δx = λ/4, λ/2 y λ).

## Uso

Abre `index.html` en un navegador (con `?lang=en`, la interfaz se muestra en inglés, con
`?lang=ca`, en catalán, con `?lang=eu`, en euskera, y con `?lang=gl`, en gallego). No necesita
instalación ni conexión: incluye [p5.js](https://p5js.org/) en `js/vendor/`. Tiene temas oscuro,
claro y alto contraste (botón del engranaje).

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Panel de controles, medidas y fórmulas |
| `css/style.css` | Estilos y temas |
| `js/wave.js` | Física de la onda: historia del foco, elongación y velocidad de vibración de cada punto, fase |
| `js/sketch.js` | Dibujo de la cuerda, del muelle, de las cotas y de las gráficas; controles |
| `js/i18n.js`, `js/i18n-en.js`, `js/i18n-ca.js`, `js/i18n-eu.js`, `js/i18n-gl.js` | Idioma de la interfaz (`?lang=en`, `?lang=ca`, `?lang=eu`, `?lang=gl`) y traducciones al inglés, al catalán, al euskera y al gallego |
| `js/estadisticas.js` | Recuento anónimo de visitas (GoatCounter, sin cookies) |
| `js/sello.js` | Sello «simulaciencia.es» en la esquina de la simulación |

## Licencia

Código bajo licencia MIT (`LICENSE`); contenidos didácticos bajo CC BY-SA 4.0
(`LICENSE-CONTENT.md`). Forma parte de [SimulaCiencia](https://simulaciencia.es).
