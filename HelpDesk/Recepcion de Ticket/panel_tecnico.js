/* ============================================
   PANEL TÉCNICO — GIH · HRC
   panel_tecnico.js
   ============================================ */

/* ──────────────────────────────────────────
   CONFIGURACIÓN — ajusta las URLs según
   tu entorno Docker.
────────────────────────────────────────── */
const WEBHOOK_OBTENER  = 'http://localhost:5678/webhook/obtener-tickets-pendientes';
const WEBHOOK_ATENDER  = 'http://localhost:5678/webhook/atender-ticket';
const PANEL_URL        = '../Panel_tecnico/panel_tecnico.html';

/* ── NOMBRE DEL TÉCNICO DESDE localStorage ── */
window.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('usuario_nombre');
    if (nombre) {
        document.getElementById('nav-usuario').textContent = '👤 ' + nombre;
    }
    cargarTickets();
});


/* ──────────────────────────────────────────
   CARGAR TICKETS PENDIENTES
────────────────────────────────────────── */
async function cargarTickets() {
    const tbody     = document.getElementById('cuerpo-tabla');
    const countEl   = document.getElementById('ticket-count');
    const btnRefresh = document.getElementById('btn-refresh');

    // Estado de carga
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="table-loading">
                <div class="spinner"></div>
                Actualizando lista...
            </td>
        </tr>`;
    countEl.textContent = 'Cargando...';
    btnRefresh.classList.add('loading');
    btnRefresh.disabled = true;

    try {
        // Cache-buster para que n8n siempre devuelva datos frescos
        const response = await fetch(WEBHOOK_OBTENER + '?t=' + Date.now());
        const tickets  = await response.json();

        // Filtrar solo pendientes (igual que antes)
        const pendientes = tickets.filter(t =>
            t.estado && t.estado.toString().trim().toLowerCase() === 'pendiente'
        );

        tbody.innerHTML = '';

        if (pendientes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        <span class="empty-icon">📋</span>
                        No hay tickets pendientes por ahora.
                    </td>
                </tr>`;
            countEl.textContent = '0 tickets pendientes';
            return;
        }

        countEl.textContent = `${pendientes.length} ticket${pendientes.length !== 1 ? 's' : ''} pendiente${pendientes.length !== 1 ? 's' : ''}`;

        pendientes.forEach(ticket => {
            const prioridad = ticket.prioridad || 'Baja';
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><span class="ticket-id">#${ticket.id_ticket}</span></td>
                <td>${escapeHtml(ticket.nombre_solicitante)}</td>
                <td>${escapeHtml(ticket.departamento)}</td>
                <td><span class="badge-prioridad badge-${prioridad}">${prioridad}</span></td>
                <td class="desc-cell" title="${escapeHtml(ticket.descripcion)}">${escapeHtml(ticket.descripcion)}</td>
                <td>
                    <button class="btn-atender" onclick="confirmarAtender(${ticket.id_ticket})">
                        Atender
                    </button>
                </td>`;
            tbody.appendChild(fila);
        });

    } catch (error) {
        console.error('Error al cargar tickets:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-error">
                    ❌ Error al conectar con el servidor. Verifica que n8n esté en ejecución.
                </td>
            </tr>`;
        countEl.textContent = 'Error al cargar';
    } finally {
        btnRefresh.classList.remove('loading');
        btnRefresh.disabled = false;
    }
}


/* ──────────────────────────────────────────
   MODAL DE CONFIRMACIÓN
   (reemplaza el alert nativo del navegador)
────────────────────────────────────────── */
let ticketPendienteId = null;

function confirmarAtender(id) {
    ticketPendienteId = id;
    document.getElementById('modal-ticket-id').textContent = '#' + id;
    document.getElementById('modal-backdrop').classList.add('open');
}

function cerrarModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
    ticketPendienteId = null;
}

async function confirmarYAtender() {
    cerrarModal();
    if (ticketPendienteId !== null) {
        await atenderTicket(ticketPendienteId);
    }
}

// Cerrar modal al hacer clic fuera
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModal();
});


/* ──────────────────────────────────────────
   ATENDER TICKET
────────────────────────────────────────── */
async function atenderTicket(id) {
    try {
        const response = await fetch(WEBHOOK_ATENDER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_ticket: id })
        });

        if (response.ok) {
            mostrarToast('success', `✅ Ticket #${id} marcado como En Proceso`);
            // Delay de seguridad igual que antes (500ms) para que Postgres confirme
            setTimeout(() => cargarTickets(), 500);
        } else {
            mostrarToast('error', `❌ Error al actualizar el ticket #${id}`);
        }

    } catch (error) {
        console.error('Error al atender ticket:', error);
        mostrarToast('error', '❌ No se pudo conectar con n8n');
    }
}


/* ──────────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────────── */
function mostrarToast(tipo, mensaje) {
    const toast = document.getElementById('toast');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}


/* ──────────────────────────────────────────
   HELPERS
────────────────────────────────────────── */

/** Escapa HTML para evitar XSS con datos de la BD */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}