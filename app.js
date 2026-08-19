// ============ DATOS ============
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const NUMEROS = [1, 2, 3, 4, 5, 6];

const HORARIOS = {
    "1er Turno": [
        "09:10 - 09:40",
        "09:45 - 10:15",
        "10:20 - 10:50",
        "10:55 - 11:25",
        "11:30 - 12:00",
        "12:05 - 12:35"
    ],
    "2do Turno": [
        "17:10 - 17:40",
        "17:45 - 18:15",
        "18:20 - 18:50",
        "18:55 - 19:25",
        "19:30 - 20:00",
        "20:05 - 20:35"
    ],
    "3er Turno": [
        "00:10 - 00:40",
        "00:45 - 01:15",
        "01:20 - 01:50",
        "01:55 - 02:25",
        "02:30 - 03:00",
        "03:05 - 03:35"
    ]
};

const LINEAS = [
    { nombre: "745", bloqueada: true, fijo: 1 },
    { nombre: "Carga", bloqueada: true, fijo: 2 },
    { nombre: "758", bloqueada: false, fijo: 3 },
    { nombre: "759", bloqueada: false, fijo: 4 },
    { nombre: "761", bloqueada: false, fijo: 5 },
    { nombre: "726", bloqueada: false, fijo: 1 },
    { nombre: "714", bloqueada: false, fijo: 2 },
    { nombre: "712", bloqueada: false, fijo: 3 },
    { nombre: "763", bloqueada: false, fijo: 4 }
];

const STORAGE_KEY = "horarios";
const STORAGE_VERSION = 4;

let asignaciones = {};
let periodos = {};
let datosGuardado = {};
let inicializando = true;
let hayDatosGuardados = false;

// ============ INICIO ============
document.addEventListener("DOMContentLoaded", iniciar);

function iniciar() {
    cargarDatos();
    configurarAños();
    configurarMeses();

    // La fecha inicial siempre corresponde al día en que se abre la página.
    seleccionarFechaActual();

    // Si este navegador ya tiene información guardada para la semana actual,
    // se recupera exactamente esa información. Un navegador nuevo empieza vacío.
    cargarPeriodoActual();

    if (hayDatosGuardados && datosGuardado.turno) {
        const turno = document.getElementById("turno");
        if (Array.from(turno.options).some(op => op.value === datosGuardado.turno)) {
            turno.value = datosGuardado.turno;
        }
    } else {
        document.getElementById("turno").value = "";
    }

    actualizarTitulo();
    actualizarHorarioTurno();
    dibujarTabla();
    configurarEventos();

    inicializando = false;
}

function configurarAños() {
    const select = document.getElementById("anio");
    const añoActual = new Date().getFullYear();

    select.innerHTML = "";
    for (let año = añoActual - 1; año <= añoActual + 5; año++) {
        select.add(new Option(String(año), String(año)));
    }
    select.value = String(añoActual);
}

function configurarMeses() {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const select = document.getElementById("mes");
    select.innerHTML = "";
    meses.forEach((mes, i) => select.add(new Option(mes, String(i))));
    select.value = String(new Date().getMonth());
}

function seleccionarFechaActual() {
    const hoy = new Date();
    document.getElementById("anio").value = String(hoy.getFullYear());
    document.getElementById("mes").value = String(hoy.getMonth());

    actualizarSemanas();

    const opciones = Array.from(document.getElementById("semana").options);
    const objetivo = opciones.find(opcion => {
        const rango = obtenerRangoSemanaPorIndice(
            hoy.getFullYear(),
            hoy.getMonth(),
            Number(opcion.value)
        );
        return hoy >= rango.lunes && hoy <= rango.sabado;
    });

    if (objetivo) {
        document.getElementById("semana").value = objetivo.value;
    }
}

// ============ PERSISTENCIA ============
function cargarDatos() {
    datosGuardado = {};
    periodos = {};
    asignaciones = {};
    hayDatosGuardados = false;

    try {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (!guardado) return;

        const datos = JSON.parse(guardado);
        if (!datos || typeof datos !== "object") return;

        // Se acepta la estructura actual y también la estructura anterior
        // para no perder horarios que el usuario ya tenía guardados.
        datosGuardado = datos;
        periodos = datos.periodos && typeof datos.periodos === "object"
            ? datos.periodos
            : {};

        if (Object.keys(periodos).length === 0 && datos.asignaciones) {
            const anio = datos.anio ?? new Date().getFullYear();
            const mes = datos.mes ?? new Date().getMonth();
            const semanaIndice = Number.isInteger(datos.semanaIndice) ? datos.semanaIndice : 0;
            periodos[crearClavePeriodo(anio, mes, semanaIndice)] = {
                asignaciones: copiarAsignaciones(datos.asignaciones || {})
            };
        }

        if (Array.isArray(datos.lineas)) {
            datos.lineas.forEach((guardada, i) => {
                if (!LINEAS[i] || !guardada) return;
                if (typeof guardada.bloqueada === "boolean") {
                    LINEAS[i].bloqueada = guardada.bloqueada;
                }
                if (Number.isInteger(guardada.fijo) && NUMEROS.includes(guardada.fijo)) {
                    LINEAS[i].fijo = guardada.fijo;
                }
            });
        }

        hayDatosGuardados = Object.keys(periodos).length > 0 || !!datos.turno;
    } catch (error) {
        console.error("Error al cargar datos:", error);
        datosGuardado = {};
        periodos = {};
        asignaciones = {};
        hayDatosGuardados = false;
    }
}

function guardar() {
    try {
        const selectSemana = document.getElementById("semana");
        const datos = {
            version: STORAGE_VERSION,
            anio: document.getElementById("anio").value,
            mes: document.getElementById("mes").value,
            semanaIndice: Number(selectSemana.value || 0),
            turno: document.getElementById("turno").value,
            periodos,
            lineas: LINEAS.map(linea => ({
                nombre: linea.nombre,
                bloqueada: linea.bloqueada,
                fijo: linea.fijo
            }))
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
        datosGuardado = datos;
        hayDatosGuardados = true;
    } catch (error) {
        console.error("No se pudo guardar en localStorage:", error);
    }
}

function crearClavePeriodo(anio, mes, semanaIndice) {
    return `${anio}-${String(mes).padStart(2, "0")}-${semanaIndice}`;
}

function obtenerClavePeriodoActual() {
    return crearClavePeriodo(
        Number(document.getElementById("anio").value),
        Number(document.getElementById("mes").value),
        Number(document.getElementById("semana").value || 0)
    );
}

function cargarPeriodoActual() {
    const periodo = periodos[obtenerClavePeriodoActual()];
    asignaciones = copiarAsignaciones(periodo?.asignaciones || {});
}

function guardarPeriodoActual() {
    periodos[obtenerClavePeriodoActual()] = {
        asignaciones: copiarAsignaciones(asignaciones)
    };
}

function copiarAsignaciones(origen) {
    return JSON.parse(JSON.stringify(origen || {}));
}
// ============ EVENTOS ============
function configurarEventos() {
    document.getElementById("anio").addEventListener("change", () => {
        actualizarSemanas();
        cargarPeriodoActual();
        actualizarTitulo();
        actualizarHorarioTurno();
        dibujarTabla();
        guardar();
    });

    document.getElementById("mes").addEventListener("change", () => {
        actualizarSemanas();
        cargarPeriodoActual();
        actualizarTitulo();
        actualizarHorarioTurno();
        dibujarTabla();
        guardar();
    });

    document.getElementById("semana").addEventListener("change", () => {
        cargarPeriodoActual();
        actualizarTitulo();
        actualizarHorarioTurno();
        guardar();
        dibujarTabla();
    });

    document.getElementById("turno").addEventListener("change", () => {
        actualizarTitulo();
        actualizarHorarioTurno();
        guardar();
    });
}

// ============ SEMANAS ============
function actualizarSemanas() {
    const año = parseInt(document.getElementById("anio").value, 10);
    const mes = parseInt(document.getElementById("mes").value, 10);
    const select = document.getElementById("semana");

    const valorAnterior = Number(select.value || 0);
    select.innerHTML = "";

    const primerLunes = obtenerPrimerLunesDelMes(año, mes);
    let numero = 1;

    for (let i = 0; i < 6; i++) {
        const lunes = new Date(primerLunes);
        lunes.setDate(primerLunes.getDate() + i * 7);

        const sabado = new Date(lunes);
        sabado.setDate(lunes.getDate() + 5);

        if (lunes.getMonth() === mes || sabado.getMonth() === mes) {
            const texto = `Semana ${numero}: ${formatearFecha(lunes)} - ${formatearFecha(sabado)}`;
            select.add(new Option(texto, String(i)));
            numero++;
        }
    }

    const opcionValida = Array.from(select.options).some(op => Number(op.value) === valorAnterior);
    select.value = opcionValida ? String(valorAnterior) : (select.options[0]?.value || "0");
}

function obtenerPrimerLunesDelMes(año, mes) {
    const primerDia = new Date(año, mes, 1);
    const diaSemana = primerDia.getDay();
    const ajuste = diaSemana === 0 ? -6 : 1 - diaSemana;
    return new Date(año, mes, 1 + ajuste);
}

function obtenerRangoSemanaPorIndice(año, mes, indice) {
    const primerLunes = obtenerPrimerLunesDelMes(año, mes);
    const lunes = new Date(primerLunes);
    lunes.setDate(primerLunes.getDate() + indice * 7);

    const sabado = new Date(lunes);
    sabado.setDate(lunes.getDate() + 5);

    lunes.setHours(0, 0, 0, 0);
    sabado.setHours(23, 59, 59, 999);

    return { lunes, sabado };
}

function formatearFecha(fecha) {
    return `${fecha.getDate()} ${fecha.toLocaleDateString("es-MX", { month: "short" })}`;
}

function obtenerTextoSemana() {
    return document.getElementById("semana").selectedOptions[0]?.textContent || "Semana";
}

function actualizarTitulo() {
    const semana = obtenerTextoSemana();
    const turno = document.getElementById("turno").value;
    document.getElementById("titulo").textContent =
        `Horarios de Comedor | ${semana} | ${turno || "Selecciona el turno"}`;
}

function actualizarHorarioTurno() {
    const turno = document.getElementById("turno").value;
    const horarios = HORARIOS[turno] || [];
    const contenedor = document.getElementById("horarios-turno");

    if (!turno) {
        contenedor.innerHTML = "";
        return;
    }

    contenedor.innerHTML = `
        <div class="horarios-turno-titulo">Horarios del ${escapeHtml(turno)}</div>
        <div class="horarios-turno-grid">
            ${horarios.map((hora, i) => `
                <div class="horario-chip">
                    <div class="horario-chip-numero">Horario ${i + 1}</div>
                    <div class="horario-chip-hora">${escapeHtml(hora)}</div>
                    <div class="horario-chip-limpieza">Limpieza 5 min</div>
                </div>
            `).join("")}
        </div>
    `;
}

// ============ TABLA ============
function dibujarTabla() {
    dibujarCabecera();
    dibujarCuerpo();
}

function dibujarCabecera() {
    const cabecera = document.getElementById("cabecera");
    cabecera.innerHTML = "<th>DÍA</th>";

    LINEAS.forEach((linea, i) => {
        cabecera.innerHTML += `
            <th class="${linea.bloqueada ? "bloqueada" : ""}">
                <div style="font-weight:bold; font-size:18px;">${escapeHtml(linea.nombre)}</div>
                <div style="margin-top:5px;">
                    <button type="button" onclick="toggleBloqueo(${i})"
                        class="btn-accion" title="${linea.bloqueada ? "Desbloquear" : "Bloquear"}"
                        aria-label="${linea.bloqueada ? "Desbloquear" : "Bloquear"}">
                        ${linea.bloqueada ? "🔒" : "🔓"}
                    </button>

                    ${linea.bloqueada ? `
                        <select onchange="cambiarFijo(${i}, this.value)"
                            class="control-no-exportar"
                            style="width:60px; height:30px; border:1px solid #d1d5db; border-radius:4px; text-align:center; background:#fee2e2; font-weight:bold;">
                            ${NUMEROS.map(n => `<option value="${n}" ${linea.fijo === n ? "selected" : ""}>${n}</option>`).join("")}
                        </select>
                    ` : `
                        <button type="button" onclick="barajarLinea(${i})"
                            class="btn-accion control-no-exportar" title="Barajar línea"
                            aria-label="Barajar línea">🔄</button>
                    `}
                </div>
            </th>
        `;
    });
}

function dibujarCuerpo() {
    const cuerpo = document.getElementById("cuerpo");
    cuerpo.innerHTML = "";

    DIAS.forEach((dia, d) => {
        let fila = `<tr><td style="font-weight:bold; background:#f9fafb;">${dia}</td>`;

        LINEAS.forEach((linea, l) => {
            const valor = obtenerValor(d, l);

            fila += `
                <td class="${linea.bloqueada ? "bloqueada" : ""}">
                    <select class="select-horario"
                        aria-label="${dia}, línea ${escapeHtml(linea.nombre)}"
                        onchange="cambiarAsignacion(${d}, ${l}, this.value)">
                        <option value="" ${valor === "" ? "selected" : ""}>—</option>
                        ${NUMEROS.map(n =>
                            `<option value="${n}" ${valor === n ? "selected" : ""}>${n}</option>`
                        ).join("")}
                    </select>
                </td>
            `;
        });

        fila += "</tr>";
        cuerpo.insertAdjacentHTML("beforeend", fila);
    });
}

function obtenerValor(dia, linea) {
    const guardado = asignaciones?.[dia]?.[linea];

    if (Number.isInteger(guardado) && NUMEROS.includes(guardado)) {
        return guardado;
    }

    if (LINEAS[linea].bloqueada) {
        return LINEAS[linea].fijo;
    }

    return "";
}

// ============ ACCIONES ============
function cambiarAsignacion(dia, linea, valor) {
    if (!asignaciones[dia]) asignaciones[dia] = {};

    if (valor === "") {
        delete asignaciones[dia][linea];

        if (Object.keys(asignaciones[dia]).length === 0) {
            delete asignaciones[dia];
        }
    } else {
        asignaciones[dia][linea] = parseInt(valor, 10);
    }

    guardarPeriodoActual();
    guardar();
}

function toggleBloqueo(linea) {
    LINEAS[linea].bloqueada = !LINEAS[linea].bloqueada;

    if (LINEAS[linea].bloqueada) {
        DIAS.forEach((_, dia) => {
            if (!asignaciones[dia]) asignaciones[dia] = {};
            asignaciones[dia][linea] = LINEAS[linea].fijo;
        });
    }

    guardarPeriodoActual();
    guardar();
    dibujarTabla();
}

function cambiarFijo(linea, valor) {
    LINEAS[linea].fijo = parseInt(valor, 10);

    if (LINEAS[linea].bloqueada) {
        DIAS.forEach((_, dia) => {
            if (!asignaciones[dia]) asignaciones[dia] = {};
            asignaciones[dia][linea] = LINEAS[linea].fijo;
        });
    }

    guardarPeriodoActual();
    guardar();
    dibujarTabla();
}

function barajarArray(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function crearDistribucionAleatoria(cantidad) {
    if (cantidad <= 0) return [];

    // Reparte primero cada horario al menos una vez y usa repeticiones
    // adicionales para completar las líneas restantes.
    const base = [];
    while (base.length < cantidad) {
        base.push(...barajarArray(NUMEROS));
    }

    return barajarArray(base.slice(0, cantidad));
}

function generarAleatorio() {
    DIAS.forEach((_, dia) => {
        if (!asignaciones[dia]) asignaciones[dia] = {};

        const desbloqueadas = LINEAS
            .map((linea, l) => ({ linea, l }))
            .filter(item => !item.linea.bloqueada);

        LINEAS.forEach((linea, l) => {
            if (linea.bloqueada) {
                asignaciones[dia][l] = linea.fijo;
            }
        });

        const disponibles = crearDistribucionAleatoria(desbloqueadas.length);

        desbloqueadas.forEach(({ l }, indice) => {
            asignaciones[dia][l] = disponibles[indice] ?? NUMEROS[0];
        });
    });

    guardarPeriodoActual();
    guardar();
    dibujarTabla();
}

function barajarLinea(linea) {
    if (LINEAS[linea].bloqueada) return;

    const numeros = crearDistribucionAleatoria(DIAS.length);

    DIAS.forEach((_, dia) => {
        if (!asignaciones[dia]) asignaciones[dia] = {};
        asignaciones[dia][linea] = numeros[dia] ?? NUMEROS[0];
    });

    guardarPeriodoActual();
    guardar();
    dibujarTabla();
}

// ============ EXPORTACIÓN ============
function setLoading(visible, texto = "Generando imagen...") {
    const loading = document.getElementById("loading");
    loading.style.display = visible ? "flex" : "none";
    loading.setAttribute("aria-hidden", visible ? "false" : "true");
    const text = loading.querySelector(".loading-text");
    if (text) text.textContent = texto;
}

function prepararNodoExportacion() {
    const original = document.getElementById("zona-horario");
    const clon = original.cloneNode(true);

    // NO exportar la tabla "Referencia de Horarios"
    const referencia = clon.querySelector(".referencia");
    if (referencia) {
        referencia.remove();
    }
    
    clon.classList.add("exportando");
    clon.querySelectorAll(".btn-accion, .control-no-exportar").forEach(el => el.remove());

    // Los <select> pueden renderizarse mal en Safari/iOS al convertirlos a imagen.
    // Los reemplazamos por texto plano con el valor seleccionado.
    clon.querySelectorAll("select").forEach(select => {
        const texto = select.selectedOptions[0]?.textContent?.trim() || select.value || "";
        const span = document.createElement("span");
        span.className = "select-como-texto";
        span.textContent = texto;
        select.replaceWith(span);
    });

    const tablas = Array.from(clon.querySelectorAll("table"));

    // Medimos y fijamos un ancho real para cada tabla. Esto evita tanto
    // el recorte horizontal como los canvas completamente blancos que
    // pueden aparecer en Safari/iOS cuando el nodo exportado está fuera
    // del área renderizada o detrás del documento con z-index negativo.
    tablas.forEach(tabla => {
        const ancho = Math.max(tabla.scrollWidth || 0, tabla.offsetWidth || 0, 800);
        tabla.style.width = `${ancho}px`;
        tabla.style.minWidth = `${ancho}px`;
        tabla.style.maxWidth = "none";
        tabla.style.tableLayout = "auto";
    });

    const anchoTabla = Math.max(...tablas.map(tabla => tabla.scrollWidth || tabla.offsetWidth || 800), 800);

    clon.style.width = `${anchoTabla + 44}px`;
    clon.style.maxWidth = "none";
    clon.style.background = "#ffffff";
    clon.style.padding = "22px";
    clon.style.margin = "0";
    clon.style.boxSizing = "border-box";
    clon.style.overflow = "visible";
    clon.style.height = "auto";
    clon.style.minHeight = "0";
    clon.style.contain = "none";

    clon.querySelectorAll(".tabla-scroll").forEach(wrapper => {
        wrapper.style.overflow = "visible";
        wrapper.style.width = "auto";
        wrapper.style.maxWidth = "none";
        wrapper.style.height = "auto";
    });

    // MUY IMPORTANTE: el nodo debe permanecer dentro del viewport y
    // realmente renderizado mientras html-to-image lo rasteriza.
    // En iOS/Safari, left:-100000px o z-index:-1 puede producir un PNG blanco.
    // El overlay de carga ya cubre temporalmente este nodo al usuario.
    clon.style.position = "fixed";
    clon.style.left = "0";
    clon.style.top = "0";
    clon.style.zIndex = "9998";
    clon.style.pointerEvents = "none";

    document.body.appendChild(clon);
    return clon;
}

async function generarImagenBlob() {
    if (!window.htmlToImage) {
        throw new Error("No se cargó html-to-image.");
    }

    const clon = prepararNodoExportacion();

    try {
        await esperarFuentes();

        const ancho = Math.ceil(clon.scrollWidth);
        const alto = Math.ceil(clon.scrollHeight);

        const dataUrl = await htmlToImage.toPng(clon, {
            backgroundColor: "#ffffff",
            // Esta página usa únicamente fuentes del sistema.
            // Evitamos que html-to-image intente leer cssRules de hojas
            // CSS remotas y provoque errores CORS/SecurityError en consola.
            fontEmbedCSS: "",
            pixelRatio: Math.min(Math.max(window.devicePixelRatio || 2, 2), 3),
            cacheBust: true,
            width: ancho,
            height: alto,
            canvasWidth: ancho * Math.min(Math.max(window.devicePixelRatio || 2, 2), 3),
            canvasHeight: alto * Math.min(Math.max(window.devicePixelRatio || 2, 2), 3)
        });

        const respuesta = await fetch(dataUrl);
        if (!respuesta.ok) throw new Error("No se pudo convertir la imagen.");
        return await respuesta.blob();
    } finally {
        clon.remove();
    }
}

function esperarFuentes() {
    if (document.fonts?.ready) {
        return document.fonts.ready.catch(() => {});
    }
    return Promise.resolve();
}

function crearArchivoImagen(blob) {
    const semana = sanitizarNombre(obtenerTextoSemana());
    const turno = sanitizarNombre(document.getElementById("turno").value || "turno");
    const nombre = `horarios_${semana}_${turno}.png`;
    return new File([blob], nombre, { type: "image/png" });
}

async function descargarImagen() {
    if (!document.getElementById("turno").value) {
        alert("Primero selecciona el TURNO para generar la imagen.");
        return;
    }

    // Guardar el estado antes de generar el archivo para que pueda recuperarse
    // incluso después de cerrar la página.
    guardarPeriodoActual();
    guardar();

    setLoading(true, "Generando imagen...");
    let objectUrl = null;

    try {
        const blob = await generarImagenBlob();
        const archivo = crearArchivoImagen(blob);
        objectUrl = URL.createObjectURL(blob);

        const enlace = document.createElement("a");
        enlace.href = objectUrl;
        enlace.download = archivo.name;
        enlace.rel = "noopener";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        if (esSafariIOS()) {
            setTimeout(() => {
                try {
                    window.open(objectUrl, "_blank", "noopener,noreferrer");
                } catch (_) {}
            }, 300);
        }
    } catch (error) {
        console.error("Error al descargar imagen:", error);
        alert("No se pudo descargar la imagen. Intenta de nuevo.");
    } finally {
        setLoading(false);
        if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    }
}

async function compartirImagen() {
    if (!document.getElementById("turno").value) {
        alert("Primero selecciona el TURNO para generar la imagen.");
        return;
    }

    // El acto de compartir confirma que el usuario ya terminó de preparar
    // este horario; se deja guardado para recuperarlo posteriormente.
    guardarPeriodoActual();
    guardar();

    setLoading(true, "Preparando imagen para compartir...");
    let objectUrl = null;

    try {
        const blob = await generarImagenBlob();
        const archivo = crearArchivoImagen(blob);

        if (navigator.share && navigator.canShare) {
            let puedeCompartirArchivo = false;
            try {
                puedeCompartirArchivo = navigator.canShare({ files: [archivo] });
            } catch (_) {
                puedeCompartirArchivo = false;
            }

            if (puedeCompartirArchivo) {
                await navigator.share({
                    files: [archivo],
                    title: "Horarios de Comedor",
                    text: `${obtenerTextoSemana()} - ${document.getElementById("turno").value}`
                });
                return;
            }
        }

        // WhatsApp no ofrece desde una página web una API estándar para
        // adjuntar automáticamente un PNG a un chat. Como alternativa:
        // 1) descargamos la imagen, 2) abrimos WhatsApp con el texto listo.
        objectUrl = URL.createObjectURL(blob);

        const enlace = document.createElement("a");
        enlace.href = objectUrl;
        enlace.download = archivo.name;
        enlace.rel = "noopener";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        const mensaje = encodeURIComponent(
            `Horarios de Comedor - ${obtenerTextoSemana()} - ${document.getElementById("turno").value}`
        );

        setTimeout(() => {
            try {
                window.open(`https://wa.me/?text=${mensaje}`, "_blank", "noopener,noreferrer");
            } catch (_) {}
        }, 300);

        alert("La imagen fue descargada. WhatsApp se abrirá con el texto listo; adjunta la imagen descargada al chat.");
    } catch (error) {
        if (error?.name === "AbortError") return;

        console.error("Error al compartir imagen:", error);
        alert("No se pudo compartir la imagen. Usa «Descargar imagen».");
    } finally {
        setLoading(false);
        if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    }
}

// ============ EXPORTAR PDF ============
async function exportarPDF() {
    if (!document.getElementById("turno").value) {
        alert("Primero selecciona el TURNO para generar el PDF.");
        return;
    }

    guardarPeriodoActual();
    guardar();

    setLoading(true, "Generando PDF...");
    try {
        if (!window.jspdf?.jsPDF) {
            throw new Error("No se cargó jsPDF.");
        }

        const blob = await generarImagenBlob();
        const dataUrl = await blobToDataUrl(blob);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("landscape", "mm", "letter");

        const img = new Image();
        img.src = dataUrl;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const margen = 5;
        const anchoMaximo = 270;
        const altoMaximo = 200;

        let ancho = anchoMaximo;
        let alto = (img.height * ancho) / img.width;

        if (alto > altoMaximo) {
            alto = altoMaximo;
            ancho = (img.width * alto) / img.height;
        }

        pdf.addImage(
            dataUrl,
            "PNG",
            margen,
            margen,
            ancho,
            alto,
            undefined,
            "FAST"
        );

        pdf.save(`horarios_${Date.now()}.pdf`);
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Error al generar PDF. Intenta de nuevo.");
    } finally {
        setLoading(false);
    }
}

// ============ UTILIDADES ============
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function sanitizarNombre(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function esSafariIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !window.MSStream &&
        /Safari/i.test(navigator.userAgent);
}

function escapeHtml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}