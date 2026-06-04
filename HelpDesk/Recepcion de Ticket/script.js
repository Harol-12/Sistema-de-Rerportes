let datosTickets = [];
let datosFichaTemporal = {};

// 1. Cargar datos desde n8n
async function cargarDatos() {
    try {
        const res = await fetch('http://localhost:5678/webhook/consultar-finalizados');
        datosTickets = await res.json();
        renderizarTabla(datosTickets);
    } catch (err) {
        document.getElementById('cuerpo-tabla').innerHTML = "<tr><td colspan='6' style='color:red; text-align:center;'>❌ Error de conexión con n8n.</td></tr>";
    }
}

// 2. Renderizar Tabla
function renderizarTabla(tickets) {
    const cuerpo = document.getElementById('cuerpo-tabla');
    cuerpo.innerHTML = "";
    let conteoTecnicos = {};

    if (!tickets || tickets.length === 0) {
        cuerpo.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No se encontraron tickets finalizados.</td></tr>";
        return;
    }

    tickets.sort((a, b) => b.id_ticket - a.id_ticket);

    tickets.forEach(t => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><strong>#${t.id_ticket}</strong></td>
            <td>${t.departamento || 'N/A'}</td>
            <td>${t.nombre_solicitante || 'N/A'}</td>
            <td style="color:var(--primary-blue); font-weight:bold;">${t.nombre_tecnico || 'N/A'}</td>
            <td>${t.fecha_cierre || 'N/A'}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn-accion btn-visualizar" onclick="abrirModalFicha('${t.id_ticket}')">📑 Ficha</button>
                <button id="btn-descargar-${t.id_ticket}" class="btn-accion btn-descargar" 
                        style="opacity: 0.4; cursor: not-allowed;" 
                        onclick="ejecutarFlujoPDF('${t.id_ticket}')" disabled>☁️ Drive</button>
            </td>
        `;
        cuerpo.appendChild(fila);
        if(t.nombre_tecnico) conteoTecnicos[t.nombre_tecnico] = (conteoTecnicos[t.nombre_tecnico] || 0) + 1;
    });

    document.getElementById('total-tickets').innerText = tickets.length;
    const nombres = Object.keys(conteoTecnicos);
    if(nombres.length > 0) {
        const mejor = nombres.reduce((a, b) => conteoTecnicos[a] > conteoTecnicos[b] ? a : b);
        document.getElementById('mejor-tecnico').innerText = mejor;
    }
}

// 3. Funciones del Modal
function abrirModalFicha(id) {
    const ticket = datosTickets.find(t => t.id_ticket == id);
    document.getElementById('ticketIdActual').value = id;
    document.getElementById('ticketIdBadge').innerText = `TICKET #${id}`;
    
    datosFichaTemporal[id] = {
        tecnico: ticket?.nombre_tecnico || "Técnico IT",
        jefe: ticket?.nombre_solicitante || "N/A",
        servicio: ticket?.departamento || "N/A"
    };
    document.getElementById('modalFicha').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalFicha').style.display = 'none';
    document.getElementById('formFicha').reset();
}

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

// 4. GUARDAR FICHA (Captura y Habilita Acción)
document.getElementById('formFicha').onsubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById('ticketIdActual').value;
    
    let accesorios = [];
    if(document.getElementById('check_power').checked) accesorios.push("Energía");
    if(document.getElementById('check_hdmi').checked) accesorios.push("HDMI");
    if(document.getElementById('check_vga').checked) accesorios.push("VGA");
    if(document.getElementById('check_teclado').checked) accesorios.push("Teclado");
    if(document.getElementById('check_mouse').checked) accesorios.push("Mouse");

    datosFichaTemporal[id] = {
        ...datosFichaTemporal[id],
        tipo_equipo: document.getElementById('tipo_equipo').value,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        n_serie: document.getElementById('n_serie').value,
        inventario: document.getElementById('inventario').value,
        monitor: `${document.getElementById('monitor_marca').value} ${document.getElementById('monitor_modelo').value} (S/N: ${document.getElementById('monitor_sn').value})`,
        accesorios: accesorios.join(", "),
        adicional: document.getElementById('adicional').value,
        observacion: document.getElementById('observacion').value,
        recomendacion: document.getElementById('recomendacion').value
    };

    alert("Ficha técnica preparada para Ticket #" + id);
    cerrarModal();
    
    // HABILITAR BOTÓN DRIVE Y CORREGIR CURSOR
    const btnDrive = document.getElementById(`btn-descargar-${id}`);
    if(btnDrive) {
        btnDrive.disabled = false;
        btnDrive.style.opacity = "1";
        btnDrive.style.cursor = "pointer";
    }
};


async function ejecutarFlujoPDF(id) {
    const info = datosFichaTemporal[id];
    const btn = document.getElementById(`btn-descargar-${id}`);
    
    try {
        btn.innerHTML = "⏳ Subiendo...";
        btn.style.cursor = "wait";

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // --- ENCABEZADO ---

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("HOSPITAL REGIONAL DE COBAN", pageWidth / 2, 15, { align: "center" });
        doc.setFontSize(11);
        doc.text("GIH - INFORMES", pageWidth / 2, 22, { align: "center" });
        doc.line(margin, 25, pageWidth - margin, 25);

        // --- DATOS DE REFERENCIA ---
        doc.setFontSize(10);
        let y = 35;
        const col1 = margin, col2 = 60;
        
        const datosRef = [
            ["CORRELATIVO:", `Ticket #${id}`],
            ["Jefe/a:", info.jefe],
            ["Servicio o unidad:", info.servicio],
            ["Fecha de cierre:", new Date().toLocaleDateString()]
        ];

        datosRef.forEach(fila => {
            doc.setFont(undefined, 'bold');
            doc.text(fila[0], col1, y);
            doc.setFont(undefined, 'normal');
            doc.text(fila[1], col2, y);
            y += 7;
        });

        // --- DATOS DEL EQUIPO ---
        y += 5;
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text("DATOS DEL EQUIPO REVISADO", pageWidth / 2, y + 6, { align: "center" });
        
        y += 15;
        doc.setFontSize(9);
        doc.text("TIPO", margin, y);
        doc.text("MARCA", 50, y);
        doc.text("MODELO", 85, y);
        doc.text("S/N", 125, y);
        doc.text("INVENTARIO", 160, y);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        
        y += 8;
        doc.setFont(undefined, 'normal');
        doc.text(info.tipo_equipo || "---", margin, y);
        doc.text(info.marca || "---", 50, y);
        doc.text(info.modelo || "---", 85, y);
        doc.text(info.n_serie || "---", 125, y);
        doc.text(info.inventario || "---", 160, y);

        // --- MONITOR Y ACCESORIOS ---
        y += 15;
        doc.setFont(undefined, 'bold');
        doc.text("MONITOR Y ACCESORIOS", margin, y);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        
        y += 10;
        doc.text("MONITOR (Detalles):", col1, y);
        doc.setFont(undefined, 'normal');
        doc.text(info.monitor || "No especificado", col2, y);
        
        y += 8;
        doc.setFont(undefined, 'bold');
        doc.text("ACCESORIOS:", col1, y);
        doc.setFont(undefined, 'normal');
        doc.text(info.accesorios || "Ninguno", col2, y);

        // --- SECCIÓN ADICIONAL (AHORA DESPUÉS DE MONITOR) ---
        y += 12;
        doc.setFont(undefined, 'bold');
        doc.text("ADICIONAL:", margin, y);
        y += 4;
        
        // Cuadro para Adicional
        const adicLines = doc.splitTextToSize(info.adicional || "N/A", contentWidth - 10);
        const adicHeight = Math.max(12, (adicLines.length * 6) + 4);
        doc.rect(margin, y, contentWidth, adicHeight); // Marco
        doc.setFont(undefined, 'normal');
        doc.text(adicLines, margin + 5, y + 7);
        y += adicHeight + 10;

        // --- SECCIÓN OBSERVACIÓN TÉCNICA ---
        doc.setFont(undefined, 'bold');
        doc.text("OBSERVACIÓN TÉCNICA:", margin, y);
        y += 4;
        
        const obsLines = doc.splitTextToSize(info.observacion || "Sin observación", contentWidth - 10);
        const obsHeight = Math.max(15, (obsLines.length * 6) + 5);
        doc.rect(margin, y, contentWidth, obsHeight); // Marco
        doc.setFont(undefined, 'normal');
        doc.text(obsLines, margin + 5, y + 7);
        y += obsHeight + 10;

        // --- SECCIÓN RECOMENDACIÓN ---
        doc.setFont(undefined, 'bold');
        doc.text("RECOMENDACIÓN:", margin, y);
        y += 4;
        
        const recLines = doc.splitTextToSize(info.recomendacion || "Sin recomendación", contentWidth - 10);
        const recHeight = Math.max(15, (recLines.length * 6) + 5);
        doc.rect(margin, y, contentWidth, recHeight); // Marco
        doc.setFont(undefined, 'normal');
        doc.text(recLines, margin + 5, y + 7);

        // --- FIRMAS ---
        y = 265; 
        doc.line(30, y, 90, y);
        doc.line(120, y, 180, y);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text("FIRMA JEFE/A SERVICIO", 60, y + 5, { align: "center" });
        doc.text("GIH - TECNICO RESPONSABLE", 150, y + 5, { align: "center" });

        // --- ENVÍO A DRIVE ---
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const response = await fetch('http://localhost:5678/webhook/guardar-ficha-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_ticket: id,
                archivo_base64: pdfBase64,
                nombre_archivo: `Ficha_Tecnica_Ticket_${id}.pdf`,
                tecnico: info.tecnico
            })
        });

        if (response.ok) {
            btn.innerHTML = "✅ En Drive";
            btn.style.backgroundColor = "#2e7d32";
            doc.save(`Ficha_Tecnica_${id}.pdf`);
        } else { throw new Error(); }

    } catch (err) {
        btn.innerHTML = "❌ Error";
        btn.style.backgroundColor = "#d32f2f";
        btn.style.cursor = "pointer";
    }
}

function filtrarTabla() {
    const query = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('#cuerpo-tabla tr').forEach(f => {
        f.style.display = f.innerText.toLowerCase().includes(query) ? "" : "none";
    });
}

function exportarExcel() {
    const wb = XLSX.utils.table_to_book(document.getElementById("tabla-reporte"));
    XLSX.writeFile(wb, "Reporte_GIH.xlsx");
}

window.onload = cargarDatos;