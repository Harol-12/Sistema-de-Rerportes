# 🏥 GIH — Gestión Informática Hospitalaria

> **Sistema de HelpDesk interno para el Hospital Regional de Cobán, Alta Verapaz.**  
> Gestión completa del ciclo de vida de tickets de soporte técnico: desde el reporte hasta la ficha técnica y archivo en Google Drive.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Estructura de Archivos](#-estructura-de-archivos)
- [Modelo de Datos](#-modelo-de-datos)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso del Sistema](#-uso-del-sistema)
- [Workflows de n8n](#-workflows-de-n8n)
- [Webhooks — Referencia Completa](#-webhooks--referencia-completa)
- [Manejo de Errores](#-manejo-de-errores)
- [Consideraciones de Seguridad](#-consideraciones-de-seguridad)
- [Comandos de Mantenimiento](#-comandos-de-mantenimiento)
- [Solución de Problemas Frecuentes](#-solución-de-problemas-frecuentes)

---

## 📌 Descripción General

GIH digitaliza el proceso de soporte técnico del departamento de informática hospitalaria. Antes del sistema, los reportes se gestionaban de forma verbal y sin ningún registro formal. Con GIH, cada solicitud queda registrada en base de datos, notificada por correo, atendida con trazabilidad completa y cerrada con una ficha técnica en PDF archivada en Google Drive.

### Flujo principal

```
Solicitante llena formulario
        ↓
  Ticket creado en BD  →  Correo de confirmación  →  Fila en Google Sheets
        ↓
  Técnico ve ticket en Panel  →  Presiona "Atender"
        ↓
  Estado: Atendiendo  →  Correo "en camino" al solicitante
        ↓
  Técnico abre Estadísticas  →  Llena Ficha Técnica
        ↓
  Guardar y Validar  →  PDF generado  →  Subido a Google Drive
        ↓
  Presiona "Finalizar Ticket"  →  Estado: Finalizado  →  Correo de cierre
```

---

## 🛠 Tecnologías Utilizadas

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Frontend | HTML5 / CSS3 / JavaScript Vanilla | — | Interfaces de usuario |
| Orquestador | n8n Workflow Automation | Latest | Lógica de negocio y webhooks |
| Base de Datos | PostgreSQL | 15 | Persistencia de datos |
| Administración BD | pgAdmin 4 | Latest | Gestión visual de la BD |
| Contenedores | Docker + Docker Compose | — | Infraestructura local |
| Generación PDF | jsPDF (CDN) | 2.5.1 | Fichas técnicas en PDF |
| Exportación Excel | SheetJS / xlsx (CDN) | 0.18.5 | Reportes en .xlsx |
| Almacenamiento nube | Google Drive API | v3 | Archivo de fichas técnicas |
| Notificaciones | Gmail API / SMTP | — | Correos automáticos |
| Registro externo | Google Sheets API | v4 | Control paralelo de tickets |

---

## 🏗 Arquitectura del Sistema

El sistema opera completamente **on-premise** dentro de la red local del hospital. No requiere servidor web externo — los archivos HTML se sirven directamente desde el sistema de archivos.

```
Red Hospitalaria (LAN)
  │
  ├── PC Técnico (Servidor Local)
  │     ├── Docker Desktop
  │     │     ├── helpdesk_postgres   → PostgreSQL  :5432
  │     │     ├── helpdesk_n8n        → n8n          :5678
  │     │     └── helpdesk_pgadmin    → pgAdmin      :8080
  │     │
  │     └── C:\HelpDesk\
  │           ├── index\login\
  │           ├── index\Panel_tecnico\
  │           ├── index\estadistica\
  │           └── index\RecepcionTicket\
  │
  ├── PC Servicio 1  →  recepcion_tickets.html
  ├── PC Servicio 2  →  recepcion_tickets.html
  └── PC Servicio N  →  recepcion_tickets.html
```

---

## 📁 Estructura de Archivos

```
HelpDesk/
├── docker-compose.yml              # Orquestación de contenedores
├── .env                            # Variables de entorno (credenciales)
├── init-db/
│   └── 01-schema.sql               # Esquema inicial de la BD (auto-ejecutado)
│
└── index/
    ├── login/
    │   ├── index.html              # Autenticación de técnicos
    │   └── style.css
    │
    ├── Panel_tecnico/
    │   ├── panel_tecnico.html      # Lista de tickets pendientes
    │   ├── tickets_atendidos.html  # Tickets en estado Atendiendo
    │   ├── panel_tecnico.css       # Estilos compartidos del panel
    │   └── debuj_tickets.html      # Herramienta de diagnóstico (solo IT)
    │
    ├── estadistica/
    │   ├── Estadistica.html        # Fichas técnicas + histórico + Finalizar
    │   ├── script.js               # Lógica JS de estadísticas
    │   ├── style.css
    │   └── img/                    # Logos institucionales
    │
    └── RecepcionTicket/
        ├── recepcion_tickets.html  # Formulario público de reportes
        └── style.css
```

---

## 🗄 Modelo de Datos

### Tabla `tickets`
Entidad principal del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_ticket` | SERIAL PK | Identificador autoincremental |
| `nombre_solicitante` | VARCHAR(100) NOT NULL | Jefe de servicio que reporta |
| `correo_solicitante` | VARCHAR(150) NOT NULL | Correo para notificaciones |
| `departamento` | VARCHAR(100) NOT NULL | Servicio u unidad hospitalaria |
| `categoria` | VARCHAR(50) NOT NULL | Impresora / Computadora / Red / etc. |
| `prioridad` | VARCHAR(20) | Baja / Media / Alta |
| `descripcion` | TEXT NOT NULL | Descripción del problema |
| `estado` | VARCHAR(30) | `Pendiente` → `Atendiendo` → `Finalizado` |
| `id_tecnico` | INTEGER FK | Técnico asignado |
| `fecha_creacion` | TIMESTAMP | Momento del registro |
| `fecha_asignacion` | TIMESTAMP | Cuando el técnico inicia atención |
| `fecha_cierre` | TIMESTAMP | Cuando se marca como Finalizado |
| `observaciones` | TEXT | Notas adicionales |

### Tabla `tecnicos`
Credenciales y datos del personal de IT.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_tecnico` | SERIAL PK | Identificador único |
| `nombre` | VARCHAR(100) NOT NULL | Nombre completo |
| `correo` | VARCHAR(150) UNIQUE | Correo / usuario de acceso |
| `especialidad` | VARCHAR(100) | Área de especialización |
| `estado` | VARCHAR(20) | Disponible / Ocupado |
| `created_at` | TIMESTAMP | Fecha de registro |

### Tabla `historial_tickets`
Auditoría completa de cambios de estado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_historial` | SERIAL PK | Identificador del evento |
| `id_ticket` | INTEGER FK | Ticket afectado |
| `estado_anterior` | VARCHAR(30) | Estado antes del cambio |
| `estado_nuevo` | VARCHAR(30) | Estado después del cambio |
| `comentario` | TEXT | Descripción de la acción |
| `modificado_por` | VARCHAR(100) | Técnico responsable |
| `fecha_cambio` | TIMESTAMP | Fecha y hora exacta |

### Tabla `logs_errores`
Registro de errores de los workflows n8n.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_error` | SERIAL PK | Identificador del error |
| `workflow_name` | VARCHAR(100) | Workflow donde ocurrió |
| `nodo` | VARCHAR(100) | Nodo específico que falló |
| `mensaje_error` | TEXT | Descripción del error |
| `datos_entrada` | JSONB | Payload al momento del error |
| `fecha_error` | TIMESTAMP | Fecha y hora del evento |

### Índices
```sql
CREATE INDEX idx_tickets_estado  ON tickets(estado);
CREATE INDEX idx_tickets_tecnico ON tickets(id_tecnico);
```

---

## ✅ Requisitos Previos

- **Docker Desktop** 4.x o superior — [descargar](https://www.docker.com/products/docker-desktop)
- **Navegador web** — Chrome, Edge o Firefox actuales
- **Acceso a internet** — Solo para el primer `docker-compose up` (descarga de imágenes)
- **Cuenta Gmail** — Con OAuth2 configurado en n8n para notificaciones
- **Google Drive / Sheets** — Con credenciales OAuth2 configuradas en n8n

---

## 🚀 Instalación

### 1. Copiar el proyecto

Copiar la carpeta `HelpDesk` al equipo del servidor. Se recomienda:

```
C:\HelpDesk\
```

### 2. Configurar variables de entorno

Editar el archivo `.env` con las credenciales del entorno:

```env
POSTGRES_USER=n8n
POSTGRES_PASSWORD=123456
POSTGRES_DB=helpdesk

N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
```

> ⚠️ **Importante:** No compartir el archivo `.env` fuera del equipo servidor.

### 3. Levantar los contenedores

Abrir PowerShell o CMD en la carpeta del proyecto:

```bash
cd C:\HelpDesk
docker-compose up -d
```

Esperar **30–60 segundos** para que PostgreSQL inicialice y n8n esté disponible.

### 4. Verificar los servicios

```bash
docker ps
```

Deben aparecer tres contenedores corriendo:

| Contenedor | Estado | Puerto |
|------------|--------|--------|
| `helpdesk_postgres` | Up | 5432 |
| `helpdesk_n8n` | Up | 5678 |
| `helpdesk_pgadmin` | Up | 8080 |

### 5. Importar los workflows en n8n

1. Abrir `http://localhost:5678` en el navegador
2. Ir a **Workflows → Import from file**
3. Importar los 4 archivos JSON en este orden:
   - `Crear_Ticket.json`
   - `Login.json`
   - `Atencion_de_tickets.json`
   - `Cierre_Tickets.json`
4. **Activar** cada workflow con el toggle

### 6. Registrar el primer técnico

Conectarse a pgAdmin (`http://localhost:8080`) con `admin@admin.com` / `admin123` y ejecutar:

```sql
INSERT INTO tecnicos (nombre, correo, especialidad)
VALUES ('Harol Edmerzon Rax', 'harol.rax@hospital.gob.gt', 'Soporte IT General');
```

### 7. Verificar funcionamiento

Abrir en el navegador:

```
C:\HelpDesk\index\RecepcionTicket\recepcion_tickets.html
```

Enviar un ticket de prueba y confirmar que aparece en el panel técnico.

---

## ⚙️ Configuración

### Credenciales en n8n

Después de importar los workflows, configurar las siguientes credenciales en **n8n → Credentials**:

| Credencial | Tipo | Usada en |
|-----------|------|---------|
| `Postgres account` | PostgreSQL | Todos los workflows |
| `Gmail account` | Gmail OAuth2 | Atención de Tickets, Cierre |
| `SMTP account` | SMTP | Crear Ticket |
| `Google Sheets account` | Google Sheets OAuth2 | Crear Ticket, Cierre |
| `Google Drive account` | Google Drive OAuth2 | Cierre de Tickets |

### Ajustar URLs en el frontend

Si n8n corre en un equipo diferente al que sirve los HTML, actualizar la URL base en cada archivo:

```javascript
// Cambiar en todos los archivos HTML/JS:
const URL_BASE = 'http://localhost:5678';
// por la IP del servidor, ejemplo:
const URL_BASE = 'http://192.168.1.100:5678';
```

---

## 📖 Uso del Sistema

### Para Jefes de Servicio (acceso público)

1. Abrir `recepcion_tickets.html` desde cualquier PC de la red
2. Completar el formulario: nombre, correo, servicio, categoría, prioridad y descripción
3. Presionar **"Enviar Ticket"**
4. Recibirás un correo de confirmación automáticamente

### Para Técnicos de IT

**Paso 1 — Login**
- Abrir `login/index.html`
- Ingresar usuario y contraseña

**Paso 2 — Panel Técnico**
- Ver lista de tickets pendientes
- Presionar **"Atender"** en el ticket a trabajar
- El ticket cambia a estado *Atendiendo* y el solicitante recibe correo

**Paso 3 — Tickets en Proceso**
- Ver todos los tickets activos en `tickets_atendidos.html`
- Navegar a Estadísticas cuando el trabajo esté listo

**Paso 4 — Estadísticas y Ficha Técnica**
- En `Estadistica.html` aparecen los tickets *Atendiendo* con fondo ámbar
- Presionar **"📑 Ficha"** para abrir el modal
- Completar todos los campos del equipo intervenido
- Presionar **"💾 Guardar y Validar"**:
  - Los datos se guardan en localStorage
  - Se genera el PDF de la ficha técnica
  - El PDF se sube a Google Drive
  - Aparece el botón verde **"✅ Finalizar Ticket"**
- Presionar **"✅ Finalizar Ticket"** para cerrar el proceso

> 💡 **Tip:** Si cierras el modal antes de Finalizar, al volver a abrir la ficha los datos estarán precargados y el botón Finalizar ya estará visible.

---

## 🔄 Workflows de n8n

### Workflow 1 — Crear Ticket

**Trigger:** `POST /webhook/crear-ticket`

```
Webhook → INSERT tickets (PostgreSQL) → Respond al frontend
                                       → Append fila (Google Sheets)
                                       → Email confirmación (SMTP)
```

Registra el ticket en BD, responde inmediatamente al frontend, registra en Sheets y notifica al solicitante por correo.

---

### Workflow 2 — Login

**Trigger:** `POST /webhook/login-tecnico`

```
Webhook → SELECT usuarios (PostgreSQL) → IF credenciales coinciden
                                              ├── true  → Respond { autenticado: true, usuario }
                                              └── false → Respond { autenticado: false }
```

Autentica al técnico comparando credenciales contra la tabla `usuarios`.

---

### Workflow 3 — Atención de Tickets

Contiene **dos webhooks independientes**:

**Flujo A — Listar:** `GET /webhook/obtener-tickets-pendientes`
```
Webhook → SELECT tickets WHERE estado IN ('Pendiente','Atendiendo') → Respond [ array ]
```

**Flujo B — Atender:** `POST /webhook/atender-ticket`
```
Webhook → UPDATE tickets SET estado='Atendiendo' → Gmail "tu reporte en camino" → Respond { ok }
```

---

### Workflow 4 — Cierre de Tickets

Contiene **tres webhooks independientes**:

**Flujo A — Finalizar:** `POST /webhook/finalizar-tickets`
```
Webhook → UPDATE tickets SET estado='Finalizado', fecha_cierre=NOW()
        → UPDATE Google Sheets (columna Estado)
        → Gmail "ticket resuelto"
        → Respond { ok }
```

**Flujo B — Historial:** `GET /webhook/consultar-finalizados`
```
Webhook → SELECT tickets WHERE estado='Finalizado' → Respond [ array ]
```

**Flujo C — PDF a Drive:** `POST /webhook/guardar-ficha-pdf`
```
Webhook → ConvertToFile (Base64 → binario PDF)
        → Google Drive upload → carpeta Fichas_Tecnicas/
        → Respond { status: ok }
```

---

## 📡 Webhooks — Referencia Completa

| Endpoint | Método | Descripción | Body / Params |
|----------|--------|-------------|---------------|
| `/webhook/crear-ticket` | POST | Crea un nuevo ticket | `nombre, correo, departamento, categoria, prioridad, descripcion` |
| `/webhook/login-tecnico` | POST | Autentica a un técnico | `usuario, password` |
| `/webhook/obtener-tickets-pendientes` | GET | Lista tickets Pendiente y Atendiendo | — |
| `/webhook/atender-ticket` | POST | Cambia ticket a Atendiendo | `id_ticket, id_tecnico` |
| `/webhook/finalizar-tickets` | POST | Cierra un ticket | `ticket_id, correo, tecnico_nombre` |
| `/webhook/consultar-finalizados` | GET | Lista tickets Finalizados | — |
| `/webhook/guardar-ficha-pdf` | POST | Sube PDF de ficha a Google Drive | `id_ticket, archivo_base64, nombre_archivo, tecnico` |

---

## 🚨 Manejo de Errores

### Frontend

Todos los archivos HTML/JS implementan `try/catch` en cada llamada `fetch`. El usuario ve mensajes descriptivos en **toast** de color rojo sin exponer trazas técnicas.

| Escenario | Mensaje mostrado |
|-----------|-----------------|
| n8n sin conexión | `❌ Error al conectar con n8n` |
| Respuesta HTTP != 2xx | `❌ Error al procesar la solicitud` |
| Google Drive no disponible | `⚠️ Drive no disponible — ficha guardada localmente` |
| Campos vacíos | `Por favor completa todos los campos obligatorios` |
| Finalizar ticket falla | `❌ Error al finalizar. Verifica n8n.` |

### n8n — Logs de errores

Los errores de los workflows se registran en la tabla `logs_errores`. Para consultarlos:

```sql
-- Últimos 20 errores
SELECT id_error, workflow_name, nodo, mensaje_error, fecha_error
FROM logs_errores
ORDER BY fecha_error DESC
LIMIT 20;

-- Errores por workflow
SELECT workflow_name, COUNT(*) as total_errores
FROM logs_errores
GROUP BY workflow_name
ORDER BY total_errores DESC;

-- Errores del día de hoy
SELECT * FROM logs_errores
WHERE fecha_error::date = CURRENT_DATE
ORDER BY fecha_error DESC;
```

### Persistencia de fichas técnicas

Los datos de la ficha técnica se guardan en `localStorage` del navegador con la clave `ficha_{id_ticket}`. Si el técnico cierra el modal antes de finalizar:

- Los datos del equipo permanecen guardados
- Al reabrir la ficha, los campos se precargan automáticamente
- El botón **"✅ Finalizar Ticket"** aparece sin necesidad de repetir el proceso

---

## 🔒 Consideraciones de Seguridad

| Área | Estado | Recomendación |
|------|--------|---------------|
| Autenticación de técnicos | ✅ Implementado | Agregar hash de contraseñas (bcrypt) |
| Sesión con localStorage | ✅ Implementado | Agregar expiración de sesión |
| n8n Basic Auth activo | ✅ Implementado | Cambiar credenciales por defecto |
| Red local (sin internet) | ✅ Por diseño | No exponer puertos al exterior |
| Auditoría de cambios | ✅ Implementado | Revisión periódica de historial_tickets |
| `N8N_ENCRYPTION_KEY` | ⚠️ Hardcodeada | Mover a variable en `.env` |
| Contraseñas en texto plano | ⚠️ En tabla usuarios | Implementar hash antes de escalar |
| HTTPS en red local | ⚠️ Sin implementar | Agregar certificado con nginx si se expande |
| pgAdmin sin restricción IP | ⚠️ Pendiente | Limitar acceso a IP del técnico jefe |

---

## 🔧 Comandos de Mantenimiento

```bash
# Iniciar todos los servicios
docker-compose up -d

# Detener todos los servicios
docker-compose stop

# Ver estado de los contenedores
docker ps

# Ver logs en tiempo real de n8n
docker logs helpdesk_n8n -f

# Ver logs de PostgreSQL
docker logs helpdesk_postgres -f

# Reiniciar solo n8n (sin reiniciar la BD)
docker restart helpdesk_n8n

# Backup completo de la base de datos
docker exec helpdesk_postgres pg_dump -U n8n helpdesk > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i helpdesk_postgres psql -U n8n helpdesk < backup_20250601.sql

# Conectarse a PostgreSQL desde terminal
docker exec -it helpdesk_postgres psql -U n8n -d helpdesk
```

---

## 🆘 Solución de Problemas Frecuentes

**El panel técnico no carga los tickets**
```
Verificar que n8n esté corriendo: docker ps
Abrir http://localhost:5678 y confirmar que el workflow "Atención de Tickets" esté activo
```

**Error "SMTP connection timeout" al crear ticket**
```
Verificar conectividad a internet desde el servidor
Re-autenticar la credencial SMTP en n8n → Credentials
```

**El PDF no se sube a Google Drive**
```
Ir a n8n → Credentials → Google Drive → reconectar OAuth2
Verificar que la carpeta "Fichas_Tecnicas" existe en el Drive
```

**El técnico no puede hacer login**
```sql
-- Verificar que existe en la tabla correcta
SELECT * FROM tecnicos WHERE correo = 'correo@hospital.gob.gt';

-- El workflow Login consulta la tabla "usuarios" — verificar que exista
SELECT * FROM usuarios LIMIT 5;
```

**Los tickets finalizados no aparecen en Estadísticas**
```
Verificar que el workflow "Cierre de Tickets" esté activo en n8n
Confirmar que el webhook /consultar-finalizados responde:
  GET http://localhost:5678/webhook/consultar-finalizados
```

**PostgreSQL no arranca**
```bash
# Ver logs de error
docker logs helpdesk_postgres --tail 50

# Reiniciar el contenedor
docker restart helpdesk_postgres
```

---

## 📊 Consultas SQL Útiles

```sql
-- Resumen de tickets por estado
SELECT estado, COUNT(*) AS total
FROM tickets
GROUP BY estado;

-- Tickets del día de hoy
SELECT id_ticket, nombre_solicitante, departamento, categoria, estado
FROM tickets
WHERE fecha_creacion::date = CURRENT_DATE
ORDER BY fecha_creacion DESC;

-- Carga de trabajo por técnico
SELECT tc.nombre, COUNT(t.id_ticket) AS tickets_atendidos
FROM tickets t
JOIN tecnicos tc ON t.id_tecnico = tc.id_tecnico
WHERE t.estado = 'Finalizado'
GROUP BY tc.nombre
ORDER BY tickets_atendidos DESC;

-- Tiempo promedio de resolución (en horas)
SELECT AVG(EXTRACT(EPOCH FROM (fecha_cierre - fecha_creacion))/3600) AS horas_promedio
FROM tickets
WHERE estado = 'Finalizado' AND fecha_cierre IS NOT NULL;

-- Auditoría de un ticket específico
SELECT h.fecha_cambio, h.estado_anterior, h.estado_nuevo, h.modificado_por, h.comentario
FROM historial_tickets h
WHERE h.id_ticket = 108
ORDER BY h.fecha_cambio ASC;
```

---

## 👥 Créditos

**Desarrollado por:** Departamento de Gestión Informática Hospitalaria (GIH)  
**Institución:** Hospital Regional de Cobán, Alta Verapaz  
**Ministerio:** Ministerio de Salud Pública y Asistencia Social — Guatemala  
**Versión:** 1.0  
**Año:** 2025

---

*Sistema de uso interno exclusivo del Hospital Regional de Cobán. Prohibida su distribución sin autorización del Departamento GIH.*
