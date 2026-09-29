USE sharedgoal;

CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE help_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    story TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_users (email, password) VALUES
(
    'darpanjhaveri0710@gmail.com',
    '$2y$12$C134ys7IAfXAlH4ePVjIFOOcZ4yEL2xSLp/GEt6qb05fI7D9XYVgK'
),
(
    '2216.stkabirnrnp@gmail.com',
    '$2y$12$8aLt3CxewPKYoauwne2rXeaFDBJT9ArAsTngYXnLVelXGCHaFBy3O'
);

INSERT INTO help_requests (title, category, story, amount)
VALUES
(
    'Help Riya continue her studies',
    'Education',
    'Support school fees and learning materials for the coming year.',
    50000
),
(
    'Support a family medical need',
    'Medical',
    'Help cover treatment and recovery expenses.',
    100000
),
(
    'Essential supplies for a family',
    'Basic Needs',
    'Help provide groceries and household supplies.',
    30000
);