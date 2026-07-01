-- Metadata tables used by DataBridge to store migration projects and mappings.
-- These are created automatically on first use (see Mapping/mapping.service.ts),
-- but this script is provided for manual setup / inspection.

CREATE TABLE IF NOT EXISTS migration_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    source_database VARCHAR(255) NOT NULL,
    destination_database VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS table_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    source_table VARCHAR(255) NOT NULL,
    destination_table VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    migrated_rows INT DEFAULT 0,
    total_rows INT DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (project_id) REFERENCES migration_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS column_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_mapping_id INT NOT NULL,
    source_column VARCHAR(255) NOT NULL,
    destination_column VARCHAR(255) NOT NULL,
    transform_rule VARCHAR(50) DEFAULT NULL,
    lookup_table VARCHAR(255) DEFAULT NULL,
    lookup_column VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (table_mapping_id) REFERENCES table_mapping(id) ON DELETE CASCADE
);
