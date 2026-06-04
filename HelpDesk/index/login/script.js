
const WEBHOOK_URL = 'http://localhost:5678/webhook/login-tecnico';

const PANEL_URL = '../Panel_tecnico/panel_tecnico.html';

const bgImages = [
    '../estadistica/img/1.jpg',
    '../estadistica/img/2.jpg',
    '../estadistica/img/1.jpg',
    '../estadistica/img/2.jpg'
];

const SLIDE_INTERVAL_MS = 6000;

/* INICIALIZAR SLIDESHOW  */
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


/* LIMPIAR SESIon ANTERIOR AL LLEGAR AL LOGIN  */
localStorage.removeItem('usuario_nombre');
localStorage.removeItem('usuario_id');

/* ── MOSTRAR / OCULTAR CONTRASEÑA ── */
const togglePassBtn  = document.getElementById('toggle-pass');
const passwordInput  = document.getElementById('password');
const iconEyeOpen    = document.getElementById('icon-eye-open');
const iconEyeClosed  = document.getElementById('icon-eye-closed');

togglePassBtn.addEventListener('click', () => {
    const visible = passwordInput.type === 'text';
    passwordInput.type      = visible ? 'password' : 'text';
    iconEyeOpen.style.display   = visible ? 'block' : 'none';
    iconEyeClosed.style.display = visible ? 'none'  : 'block';
    togglePassBtn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});


/* ── VALIDACIon EN TIEMPO REAL DEL CAMPO USUARIO ── */
const inputUsuario = document.getElementById('username');

inputUsuario.addEventListener('blur', () => {
    validarCampo('group-usuario', inputUsuario.value.trim());
});

inputUsuario.addEventListener('input', () => {
    if (inputUsuario.value.trim()) {
        validarCampo('group-usuario', inputUsuario.value.trim());
    } else {
        limpiarCampo('group-usuario');
    }
});

/**
 * Marca un campo como válido o inválido.
 * @param {string} groupId  — id del div.input-group
 * @param {string} valor    — valor del input
 * @returns {boolean}
 */
function validarCampo(groupId, valor) {
    const group = document.getElementById(groupId);
    const esValido = valor.length > 0;
    group.classList.toggle('field-ok',    esValido);
    group.classList.toggle('field-error', !esValido);
    return esValido;
}

function limpiarCampo(groupId) {
    const group = document.getElementById(groupId);
    group.classList.remove('field-ok', 'field-error');
}


/* ENViO DEL FORMULARIO ── */
const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuarioInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    // Ocultar error previo
    errorEl.style.display = 'none';
    errorEl.className = 'login-msg error';

    // Validar campos vacíos
    const usuarioOk  = validarCampo('group-usuario', usuarioInput);
    const passwordOk = passwordInput.length > 0;

    if (!passwordOk) {
        document.getElementById('group-password').classList.add('field-error');
        document.getElementById('group-password').classList.remove('field-ok');
    } else {
        document.getElementById('group-password').classList.remove('field-error');
    }

    if (!usuarioOk || !passwordOk) {
        mostrarError(errorEl, '⚠️ Completa todos los campos para continuar.');
        return;
    }

    // Estado de carga
    const btn = document.getElementById('submit-btn');
    setBotonCargando(btn, true);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario:  usuarioInput,
                password: passwordInput
            })
        });

        const data = await response.json();

        if (data.autenticado === true) {
            // Guardar en localStorage
            localStorage.setItem('usuario_nombre', data.usuario);
            localStorage.setItem('usuario_id',     data.id);

            // Mostrar mensaje de éxito brevemente antes de redirigir
            errorEl.className = 'login-msg success';
            errorEl.style.display = 'block';
            errorEl.innerText = `✅ ¡Bienvenido, ${data.usuario}! Redirigiendo...`;

            setTimeout(() => {
                // Pasamos los datos por URL como respaldo para file:// origins
                const params = new URLSearchParams({
                    nombre: data.usuario,
                    id:     data.id || ''
                });
                window.location.href = PANEL_URL + '?' + params.toString();
            }, 1200);

        } else {
            mostrarError(errorEl, '❌ ' + (data.mensaje || 'Usuario o contraseña incorrectos.'));
            // Sacudir la tarjeta visualmente
            sacudirTarjeta();
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarError(errorEl, '❌ No se pudo conectar con n8n. Verifica que esté en ejecución.');
    } finally {
        setBotonCargando(btn, false);
    }
});


/* ── HELPERS ── */

function mostrarError(el, texto) {
    el.className = 'login-msg error';
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
            Verificando...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `
            Entrar al Sistema
            <svg viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
            </svg>`;
    }
}

/**
 * Animación de "shake" cuando las credenciales son incorrectas.
 */
function sacudirTarjeta() {
    const card = document.querySelector('.login-card');
    card.style.animation = 'none';
    card.offsetHeight; // reflow
    card.style.animation = 'shake 0.4s ease';
    card.addEventListener('animationend', () => {
        card.style.animation = '';
    }, { once: true });
}

// Agregar keyframe de shake dinámicamente
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%       { transform: translateX(-8px); }
        40%       { transform: translateX(8px); }
        60%       { transform: translateX(-5px); }
        80%       { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);