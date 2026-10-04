USE sharedgoal;

CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
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
