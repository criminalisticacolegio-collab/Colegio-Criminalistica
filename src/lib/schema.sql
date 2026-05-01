-- SCHEMA DEFINITION FOR CPC CATAMARCA RELATIONAL MOTOR
-- EXECUTE THIS IN SUPABASE SQL EDITOR

-- 1. Table for Matriculados Core Data
CREATE TABLE IF NOT EXISTS matriculados_core (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres_completos TEXT NOT NULL,
    dni TEXT UNIQUE NOT NULL,
    matricula TEXT UNIQUE,
    jurisdiccion TEXT CHECK (jurisdiccion IN ('Capital', 'Recreo', 'Belén', 'Santa María', 'Tinogasta', 'Andalgalá')),
    telefono TEXT,
    adjuntos JSONB DEFAULT '[]', -- References to storage paths for DNI, Title, etc.
    estado TEXT DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'SUSPENSO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table for Payment History
CREATE TABLE IF NOT EXISTS historial_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matriculado_id UUID REFERENCES matriculados_core(id) ON DELETE CASCADE,
    tipo_pago TEXT NOT NULL, -- 'MATRICULA_ANUAL', 'CUOTA_MENSUAL', etc.
    monto DECIMAL(12, 2) NOT NULL,
    estado_validacion TEXT DEFAULT 'PENDIENTE' CHECK (estado_validacion IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comprobante_url TEXT
);

-- 3. Automatic Triggers Placeholders
-- FUTURE: Trigger to inactivate after 3 months of debt
-- CREATE OR REPLACE FUNCTION check_matriculado_debt() ...

-- FUTURE: Trigger for email notification on payment approval
-- CREATE OR REPLACE FUNCTION notify_payment_approved() ...

COMMENT ON TABLE matriculados_core IS 'Core data for all registered professionals';
COMMENT ON TABLE historial_pagos IS 'Ledger for professional fees and manual validation states';
