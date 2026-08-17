// ============ DATOS ============
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const NUMEROS = [1, 2, 3, 4, 5];

// Líneas: nombre, bloqueada, valor fijo
const LINEAS = [
    { nombre: '745', bloqueada: true, fijo: 1 },
    { nombre: 'Carga', bloqueada: true, fijo: 2 },
    { nombre: '758', bloqueada: false, fijo: 3 },
    { nombre: '759', bloqueada: false, fijo: 4 },
    { nombre: '761', bloqueada: false, fijo: 5 },
    { nombre: '726', bloqueada: false, fijo: 1 },
    { nombre: '714', bloqueada: false, fijo: 2 },
    { nombre: '712', bloqueada: false, fijo: 3 },
    { nombre: '763', bloqueada: false, fijo: 4 }
];

let asignaciones = {}; // {día: {línea: número}}

// ============ INICIO ============
document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    configurarAños();
    configurarMeses();
    cargarDatos();
    actualizarSemanas();
    dibujarTabla();
}

function configurarAños() {
    const select = document.getElementById('anio');
    const añoActual = new Date().getFullYear();
    
    for (let año = añoActual - 1; año <= añoActual + 5; año++) {
        select.innerHTML += `<option value="${año}">${año}</option>`;
    }
    select.value = añoActual;
}

function configurarMeses() {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const select = document.getElementById('mes');
    
    select.innerHTML = meses.map((mes, i) => 
        `<option value="${i}">${mes}</option>`
    ).join('');
    
    select.value = new Date().getMonth();
}

function cargarDatos() {
    const guardado = localStorage.getItem('horarios');
    if (guardado) {
        const datos = JSON.parse(guardado);
        asignaciones = datos.asignaciones || {};
        
        if (datos.anio) document.getElementById('anio').value = datos.anio;
        if (datos.mes !== undefined) document.getElementById('mes').value = datos.mes;
        if (datos.turno) document.getElementById('turno').value = datos.turno;
        if (datos.lineas) {
            datos.lineas.forEach((linea, i) => {
                if (LINEAS[i]) LINEAS[i].bloqueada = linea.bloqueada;
                if (LINEAS[i]) LINEAS[i].fijo = linea.fijo;
            });
        }
    }
}

// ============ SEMANAS ============
function actualizarSemanas() {
    const año = +document.getElementById('anio').value;
    const mes = +document.getElementById('mes').value;
    const select = document.getElementById('semana');
    
    select.innerHTML = '';
    
    // Primer lunes del mes
    const primerDia = new Date(año, mes, 1);
    const diaSemana = primerDia.getDay();
    const ajuste = diaSemana === 0 ? -6 : 1 - diaSemana;
    const primerLunes = new Date(año, mes, 1 + ajuste);
    
    let numero = 1;
    
    for (let i = 0; i < 6; i++) {
        const lunes = new Date(primerLunes);
        lunes.setDate(primerLunes.getDate() + i * 7);
        
        const sabado = new Date(lunes);
        sabado.setDate(lunes.getDate() + 5);
        
        if (lunes.getMonth() === mes || sabado.getMonth() === mes) {
            const opcion = `Semana ${numero}: ${formatearFecha(lunes)} - ${formatearFecha(sabado)}`;
            select.innerHTML += `<option>${opcion}</option>`;
            numero++;
        }
    }
    
    actualizarTitulo();
    guardar();
}

function formatearFecha(fecha) {
    return `${fecha.getDate()} ${fecha.toLocaleDateString('es', {month: 'short'})}`;
}

function actualizarTitulo() {
    const semana = document.getElementById('semana').value || '';
    const turno = document.getElementById('turno').value;
    document.getElementById('titulo').textContent = 
        `Horarios de Comedor | ${semana} | ${turno}`;
}

// ============ TABLA ============
function dibujarTabla() {
    dibujarCabecera();
    dibujarCuerpo();
}

function dibujarCabecera() {
    const cabecera = document.getElementById('cabecera');
    cabecera.innerHTML = '<th class="p-2 bg-gray-200">DÍA</th>';
    
    LINEAS.forEach((linea, i) => {
        cabecera.innerHTML += `
            <th class="p-2 bg-gray-100 ${linea.bloqueada ? 'bloqueada' : ''}">
                <div class="font-bold text-lg">${linea.nombre}</div>
                <div class="no-print mt-1">
                    <button onclick="toggleBloqueo(${i})" class="btn-accion">${linea.bloqueada ? '🔒' : '🔓'}</button>
                    ${linea.bloqueada ? `
                        <select onchange="cambiarFijo(${i}, this.value)" class="text-xs border rounded p-1 bg-red-100">
                            ${NUMEROS.map(n => `<option ${linea.fijo === n ? 'selected' : ''}>${n}</option>`).join('')}
                        </select>
                    ` : `
                        <button onclick="barajarLinea(${i})" class="btn-accion">🔄</button>
                    `}
                </div>
            </th>
        `;
    });
}

function dibujarCuerpo() {
    const cuerpo = document.getElementById('cuerpo');
    cuerpo.innerHTML = '';
    
    DIAS.forEach((dia, d) => {
        let fila = `<tr><td class="p-2 font-bold bg-gray-100">${dia}</td>`;
        
        LINEAS.forEach((linea, l) => {
            const valor = obtenerValor(d, l);
            fila += `
                <td class="${linea.bloqueada ? 'bloqueada' : ''}">
                    <select class="celda-select" onchange="cambiarAsignacion(${d}, ${l}, this.value)">
                        ${NUMEROS.map(n => `<option ${valor === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </td>
            `;
        });
        
        fila += '</tr>';
        cuerpo.innerHTML += fila;
    });
}

function obtenerValor(dia, linea) {
    // Valor guardado
    if (asignaciones[dia] && asignaciones[dia][linea]) {
        return asignaciones[dia][linea];
    }
    
    // Línea bloqueada
    if (LINEAS[linea].bloqueada) {
        return LINEAS[linea].fijo;
    }
    
    return 1;
}

// ============ ACCIONES ============
function cambiarAsignacion(dia, linea, valor) {
    if (!asignaciones[dia]) asignaciones[dia] = {};
    asignaciones[dia][linea] = +valor;
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
    
    guardar();
    dibujarTabla();
}

function cambiarFijo(linea, valor) {
    LINEAS[linea].fijo = +valor;
    
    DIAS.forEach((_, dia) => {
        if (!asignaciones[dia]) asignaciones[dia] = {};
        asignaciones[dia][linea] = +valor;
    });
    
    guardar();
    dibujarTabla();
}

function generarAleatorio() {
    DIAS.forEach((_, dia) => {
        if (!asignaciones[dia]) asignaciones[dia] = {};
        
        let disponibles = [...NUMEROS, ...NUMEROS];
        
        // Quitar valores de líneas bloqueadas
        LINEAS.forEach((linea, l) => {
            if (linea.bloqueada) {
                asignaciones[dia][l] = linea.fijo;
                const index = disponibles.indexOf(linea.fijo);
                if (index > -1) disponibles.splice(index, 1);
            }
        });
        
        // Mezclar
        disponibles.sort(() => Math.random() - 0.5);
        
        // Asignar a líneas libres
        LINEAS.forEach((linea, l) => {
            if (!linea.bloqueada) {
                asignaciones[dia][l] = disponibles.pop() || 1;
            }
        });
    });
    
    guardar();
    dibujarTabla();
}

function barajarLinea(linea) {
    if (LINEAS[linea].bloqueada) return;
    
    let numeros = [1, 2, 3, 4, 5, Math.floor(Math.random() * 5) + 1];
    numeros.sort(() => Math.random() - 0.5);
    
    DIAS.forEach((_, dia) => {
        if (!asignaciones[dia]) asignaciones[dia] = {};
        asignaciones[dia][linea] = numeros[dia];
    });
    
    guardar();
    dibujarTabla();
}

// ============ EXPORTAR ============
async function exportarPDF() {
    try {
        document.body.classList.add('is-exporting');
        
        const canvas = await html2canvas(document.getElementById('zona-impresion'), {
            scale: 2,
            backgroundColor: '#ffffff'
        });
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'letter');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const ancho = 270;
        const alto = (canvas.height * ancho) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 5, 5, ancho, alto);
        pdf.save(`horarios_${Date.now()}.pdf`);
        
        document.body.classList.remove('is-exporting');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar PDF');
        document.body.classList.remove('is-exporting');
    }
}

async function exportarImagen() {
    try {
        document.body.classList.add('is-exporting');
        
        const canvas = await html2canvas(document.getElementById('zona-impresion'), {
            scale: 2,
            backgroundColor: '#ffffff'
        });
        
        const link = document.createElement('a');
        link.download = `horarios_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        document.body.classList.remove('is-exporting');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar imagen');
        document.body.classList.remove('is-exporting');
    }
}

// ============ GUARDAR ============
function guardar() {
    const datos = {
        anio: document.getElementById('anio').value,
        mes: document.getElementById('mes').value,
        semana: document.getElementById('semana').value,
        turno: document.getElementById('turno').value,
        lineas: LINEAS.map(l => ({ bloqueada: l.bloqueada, fijo: l.fijo })),
        asignaciones: asignaciones
    };
    
    localStorage.setItem('horarios', JSON.stringify(datos));
}

// Event listeners para guardar automáticamente
document.getElementById('anio').addEventListener('change', () => {
    actualizarSemanas();
    guardar();
});

document.getElementById('mes').addEventListener('change', () => {
    actualizarSemanas();
    guardar();
});

document.getElementById('semana').addEventListener('change', () => {
    actualizarTitulo();
    guardar();
});

document.getElementById('turno').addEventListener('change', () => {
    actualizarTitulo();
    guardar();
});