CREATE TABLE IF NOT EXISTS trigger_violation_log (
    violation_id INT AUTO_INCREMENT PRIMARY KEY,
    route_path VARCHAR(255),
    user_email VARCHAR(255),
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);
