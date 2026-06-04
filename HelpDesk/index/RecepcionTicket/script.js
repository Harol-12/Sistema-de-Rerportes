const WEBHOOK_URL    = 'http://localhost:5678/webhook/crear-ticket';
const SLIDE_INTERVAL_MS = 6000;

const SERVICIOS = [
    "Admisión",
    "Archivo Clínico",
    "Banco de Sangre",
    "Banco de Leche",
    "Almacen General",
    "Cirugía Pediátrica",
    "Consulta Externa",
    "Nutrición",
    "Emergencia Medicina Interna",
    "Emergencia Medicina General",
    "Emergencia Ginecologia",
    "Emergencia Traumatologia",
    "Emergencia Pediatría",
    "Emergencia Enfermeria",
    "Cirugía de Hombres",
    "Traumatologia de Hombres",
    "Cirugía de Mujeres",
    "Traumatologia de Mujeres",
    "Endoscopía",
    "Esterilización",
    "Farmacia",
    "Fisioterapia",
    "Gerencia",
    "Ecocardiograma",
    "Informatica",
    "Informatica Bodega",
    "Laboratorio Clínico",
    "Lavandería",
    "Maternidad",
    "Medicina General",
    "Medicina Interna",
    "Neonatología",
    "Nefrología",
    "Neumología",
    "Neurología",
    "Odontología",
    "Oftalmología",
    "Oncología",
    "Patología",
    "Pediatría",
    "Pediatría UCIP",
    "Pediatría Neumología",
    "Pediatría Nefrología",
    "Psicología",
    "Clinica 1",
    "Clinica del personal",
    "Rayos X",
    "Recursos Humanos",
    "Sub Direccion Tecnica",
    "Sub Direccion de Enfermeria",
    "Sub Direccion Medica",
    "Sub Dirreccion de Servicios Generales",
    "Gerencia",
    "Compras",
    "Secretaria Direccion",
    "Trabajo Social",
    "Morgue",
    "Mantenimiento",
    "Patrimonio",
    "Capacitacion",

    "Atencion al Usuario",
    "Cocina"
].sort();

const bgImages = [
    '../estadistica/img/1.jpg',
    '../estadistica/img/2.jpg',
    '../estadistica/img/1.jpg',
    '../estadistica/img/2.jpg'
];

const slides       = document.querySelectorAll('.bg-slide');
const indicatorsEl = document.getElementById('indicators');
let current = 0;

slides.forEach((slide, i) => {
    if (bgImages[i]) slide.style.backgroundImage = `url('${bgImages[i]}')`;
});

bgImages.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'indicator' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Imagen ${i + 1}`);
    dot.onclick = () => goToSlide(i);
    indicatorsEl.appendChild(dot);
});

function goToSlide(n) {
    slides[current].classList.remove('active');
    document.querySelectorAll('.indicator')[current].classList.remove('active');
    current = n;
    slides[current].classList.add('active');
    document.querySelectorAll('.indicator')[current].classList.add('active');
}

setInterval(() => goToSlide((current + 1) % slides.length), SLIDE_INTERVAL_MS);

const inputServicio   = document.getElementById('departamento-input');
const hiddenServicio  = document.getElementById('departamento');
const listaAuto       = document.getElementById('autocomplete-list');
const badge           = document.getElementById('servicio-badge');
const badgeText       = document.getElementById('servicio-badge-text');
let selectedIndex     = -1;

// Resaltar coincidencia 
function resaltarCoincidencia(texto, query) {
    if (!query) return texto;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return texto.replace(regex, '<mark>$1</mark>');
}

// Mostrar coincidencia
function mostrarSugerencias(query) {
    listaAuto.innerHTML = '';
    selectedIndex = -1;

    if (!query || query.length < 1) {
        listaAuto.classList.remove('open');
        return;
    }

    const coincidencias = SERVICIOS.filter(s =>
        s.toLowerCase().includes(query.toLowerCase())
    );

    if (coincidencias.length === 0) {
        listaAuto.innerHTML = `<div class="autocomplete-empty">Sin coincidencias para "${query}"</div>`;
        listaAuto.classList.add('open');
        return;
    }

    coincidencias.forEach((servicio, i) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = ` ${resaltarCoincidencia(servicio, query)}`;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // evitar que el blur cierre antes de click
            seleccionarServicio(servicio);
        });
        listaAuto.appendChild(item);
    });

    listaAuto.classList.add('open');
}

//servicio de la lista
function seleccionarServicio(servicio) {
    hiddenServicio.value       = servicio;
    inputServicio.value        = '';
    inputServicio.style.display = 'none';
    badgeText.textContent      = servicio;
    badge.classList.add('visible');
    listaAuto.classList.remove('open');

    document.getElementById('group-departamento').classList.remove('field-error');
}

// Limpiar selección 
function limpiarServicio() {
    hiddenServicio.value        = '';
    inputServicio.value         = '';
    inputServicio.style.display = '';
    badge.classList.remove('visible');
    inputServicio.focus();
}

// Eventos del input
inputServicio.addEventListener('input', () => {
    mostrarSugerencias(inputServicio.value.trim());
});

inputServicio.addEventListener('keydown', (e) => {
    const items = listaAuto.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        items[selectedIndex].dispatchEvent(new MouseEvent('mousedown'));
        return;
    } else if (e.key === 'Escape') {
        listaAuto.classList.remove('open');
        return;
    }

    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
    if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
});

// Cerrar lista al perder foco
inputServicio.addEventListener('blur', () => {
    setTimeout(() => listaAuto.classList.remove('open'), 150);
});

// Cerrar lista al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
        listaAuto.classList.remove('open');
    }
});


/*  VALIDACION DE CORREO */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validarCorreo(valor) {
    const group = document.getElementById('group-correo');
    if (!valor) {
        group.classList.remove('field-ok', 'field-error');
        return false;
    }
    const esValido = EMAIL_REGEX.test(valor);
    group.classList.toggle('field-ok',    esValido);
    group.classList.toggle('field-error', !esValido);
    return esValido;
}

const inputCorreo = document.getElementById('correo');
let correoTimer;

inputCorreo.addEventListener('input', () => {
    clearTimeout(correoTimer);
    if (inputCorreo.value === '') {
        document.getElementById('group-correo').classList.remove('field-ok', 'field-error');
        return;
    }
    correoTimer = setTimeout(() => validarCorreo(inputCorreo.value.trim()), 400);
});

inputCorreo.addEventListener('blur', () => {
    clearTimeout(correoTimer);
    validarCorreo(inputCorreo.value.trim());
});


/*  ENVIO DE TICKET*/
async function enviarTicket() {
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('mensaje-respuesta');

    msg.className = '';
    msg.style.display = 'none';

    const datos = {
        nombre:       document.getElementById('nombre').value.trim(),
        correo:       document.getElementById('correo').value.trim(),
        departamento: document.getElementById('departamento').value.trim(), // valor validado
        categoria:    document.getElementById('categoria').value,
        prioridad:    document.getElementById('prioridad').value,
        descripcion:  document.getElementById('descripcion').value.trim()
    };

    // Validar campos 
    if (!datos.nombre || !datos.correo || !datos.descripcion) {
        mostrarMensaje(msg, 'error', '⚠️ Por favor completa todos los campos obligatorios.');
        return;
    }

    // Validar que se haya seleccionado un servicio 
    if (!datos.departamento) {
        document.getElementById('group-departamento').classList.add('field-error');
        mostrarMensaje(msg, 'error', '⚠️ Selecciona un servicio válido de la lista.');
        inputServicio.focus();
        return;
    }

    // Validar correo
    if (!validarCorreo(datos.correo)) {
        mostrarMensaje(msg, 'error', '⚠️ El correo electrónico no tiene un formato válido.');
        document.getElementById('correo').focus();
        return;
    }

    setBotonCargando(btn, true);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            mostrarMensaje(msg, 'success', '✅ ¡Ticket enviado con éxito! El equipo GIH se pondrá en contacto.');
            document.getElementById('ticket-form').reset();
            document.getElementById('group-correo').classList.remove('field-ok', 'field-error');
            limpiarServicio(); // limpiar autocomplete también
        } else {
            throw new Error('HTTP ' + response.status);
        }
    } catch (error) {
        mostrarMensaje(msg, 'error', '❌ Error al enviar. Verifica que n8n esté en ejecución.');
    } finally {
        setBotonCargando(btn, false);
    }
}


/* HELPERS*/
function mostrarMensaje(el, tipo, texto) {
    el.className = tipo;
    el.style.display = 'block';
    el.innerText = texto;
}

function setBotonCargando(btn, cargando) {
    if (cargando) {
        btn.disabled = true;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" style="animation:spin 0.8s linear infinite;stroke:white;fill:none;width:18px;height:18px;stroke-width:2;stroke-linecap:round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Enviando...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `
            Enviar Ticket
            <svg viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
            </svg>`;
    }
}