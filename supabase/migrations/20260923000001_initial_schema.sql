-- Core Metrological Domain Enums
CREATE TYPE accuracy_class_enum AS ENUM ('CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII');
CREATE TYPE report_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
CREATE TYPE test_direction_enum AS ENUM ('INCREASING', 'DECREASING', 'STATIC');
CREATE TYPE test_type_enum AS ENUM ('WEIGHING', 'REPEATABILITY', 'ECCENTRICITY', 'TARE_ZERO');

-- 1. Reference Standards Table (ISO 17025 Traceability)
CREATE TABLE reference_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_identifier VARCHAR(100) UNIQUE NOT NULL,
    accuracy_class VARCHAR(10) NOT NULL, -- E1, E2, F1, F2, M1
    certificate_number VARCHAR(100) NOT NULL,
    calibrated_by VARCHAR(200) NOT NULL,
    calibration_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Physical Instruments Master
CREATE TABLE instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model_name VARCHAR(150) NOT NULL,
    manufacturer_name VARCHAR(200) NOT NULL,
    accuracy_class accuracy_class_enum NOT NULL,
    max_capacity NUMERIC(14, 5) NOT NULL,
    min_capacity NUMERIC(14, 5) NOT NULL,
    scale_interval_d NUMERIC(14, 5) NOT NULL,
    verification_interval_e NUMERIC(14, 5) NOT NULL,
    is_multi_interval BOOLEAN DEFAULT FALSE,
    multi_interval_spec JSONB DEFAULT NULL, -- Format: [{"max": 6, "e": 0.002}, {"max": 15, "e": 0.005}]
    unit VARCHAR(10) DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Test Evaluation Reports
CREATE TABLE test_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(100) UNIQUE NOT NULL,
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
    reference_standard_id UUID REFERENCES reference_standards(id) ON DELETE RESTRICT,
    attempt_number INT NOT NULL DEFAULT 1,
    status report_status_enum DEFAULT 'DRAFT',
    standard_version VARCHAR(50) DEFAULT 'OIML R 76-1:2006',
    ambient_temperature_celsius NUMERIC(5, 2),
    relative_humidity_pct NUMERIC(5, 2),
    atmospheric_pressure_hpa NUMERIC(7, 2),
    technical_checklist JSONB NOT NULL DEFAULT '{}'::JSONB,
    overall_verdict BOOLEAN DEFAULT NULL,
    rejection_reason TEXT,
    sha256_hash VARCHAR(64),
    pdf_storage_path TEXT,
    docx_storage_path TEXT,
    conducted_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Test Observations (Observation Records)
CREATE TABLE test_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    test_type test_type_enum NOT NULL DEFAULT 'WEIGHING',
    direction test_direction_enum DEFAULT 'STATIC',
    sequence_order INT NOT NULL DEFAULT 1,
    load_applied NUMERIC(14, 5) NOT NULL,
    indication_observed NUMERIC(14, 5) NOT NULL,
    delta_load NUMERIC(14, 5) NOT NULL DEFAULT 0.0,
    calculated_p NUMERIC(14, 5) NOT NULL,
    error_e NUMERIC(14, 5) NOT NULL DEFAULT 0.0,
    corrected_error_ec NUMERIC(14, 5) NOT NULL,
    mpe_allowed NUMERIC(14, 5) NOT NULL,
    is_compliant BOOLEAN NOT NULL,
    position_tag VARCHAR(50) DEFAULT 'CENTER',
    run_cycle INT DEFAULT 1
);

-- 5. Photographic Evidence Vault
CREATE TABLE instrument_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    report_id UUID REFERENCES test_reports(id) ON DELETE SET NULL,
    attachment_type VARCHAR(50) NOT NULL, -- 'NAMEPLATE', 'LEAD_SEAL', 'LEVEL_BUBBLE', 'OVERALL_FRONT'
    storage_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Immutable Regulatory Audit Ledger (ISO 17025 Compliance)
CREATE TABLE audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    performed_by UUID,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Automated Audit Trigger Function
CREATE OR REPLACE FUNCTION audit_trigger_handler()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_ledger (table_name, record_id, action, performed_by, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Audit Triggers
CREATE TRIGGER trg_audit_test_reports
AFTER INSERT OR UPDATE OR DELETE ON test_reports
FOR EACH ROW EXECUTE FUNCTION audit_trigger_handler();

CREATE TRIGGER trg_audit_test_observations
AFTER INSERT OR UPDATE OR DELETE ON test_observations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_handler();
