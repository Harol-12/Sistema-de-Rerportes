-- TABLA TECNICOS
CREATE TABLE tecnicos (
    id_tecnico SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    especialidad VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'Disponible',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLA TICKETS
CREATE TABLE tickets (
    id_ticket SERIAL PRIMARY KEY,
    nombre_solicitante VARCHAR(100) NOT NULL,
    correo_solicitante VARCHAR(150) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Normal',
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    id_tecnico INTEGER REFERENCES tecnicos(id_tecnico),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_asignacion TIMESTAMP,
    fecha_cierre TIMESTAMP,
    observaciones TEXT
);

-- TABLA HISTORIAL
CREATE TABLE historial_tickets (
    id_historial SERIAL PRIMARY KEY,
    id_ticket INTEGER NOT NULL REFERENCES tickets(id_ticket),
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    comentario TEXT,
    modificado_por VARCHAR(100) NOT NULL,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLA LOGS DE ERRORES
CREATE TABLE logs_errores (
    id_error SERIAL PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    nodo VARCHAR(100),
    mensaje_error TEXT NOT NULL,
    datos_entrada JSONB,
    fecha_error TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ÍNDICES (MEJORA DE RENDIMIENTO 🔥)
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_tecnico ON tickets(id_tecnico);