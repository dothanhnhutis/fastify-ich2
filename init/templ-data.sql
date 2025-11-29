-- template users data
INSERT INTO users (email, username, deleted_at, password_hash)
VALUES ('gaconght@gmail.com', 'Thanh Nhut', null,
        '$argon2id$v=19$m=65536,t=3,p=4$oDdsbvL66JBFGcGtpM2bVQ$BSuYE86W6ALjeRJmC9I5sv/pr6xXJj3eFGvgS+aF7Io'),
       ('gaconght@gmail.com', 'Thanh Nhut', NOW(),
        '$argon2id$v=19$m=65536,t=3,p=4$oDdsbvL66JBFGcGtpM2bVQ$BSuYE86W6ALjeRJmC9I5sv/pr6xXJj3eFGvgS+aF7Io'),
       ('gaconght@gmail.com', 'Thanh Nhut', NOW(),
        '$argon2id$v=19$m=65536,t=3,p=4$oDdsbvL66JBFGcGtpM2bVQ$BSuYE86W6ALjeRJmC9I5sv/pr6xXJj3eFGvgS+aF7Io'),
       ('gaconght1@gmail.com', 'Thanh Nhut', null,
        '$argon2id$v=19$m=65536,t=3,p=4$oDdsbvL66JBFGcGtpM2bVQ$BSuYE86W6ALjeRJmC9I5sv/pr6xXJj3eFGvgS+aF7Io'),
       ('gaconght2@gmail.com', 'Thanh Nhut', null,
        '$argon2id$v=19$m=65536,t=3,p=4$oDdsbvL66JBFGcGtpM2bVQ$BSuYE86W6ALjeRJmC9I5sv/pr6xXJj3eFGvgS+aF7Io')
RETURNING *;
-- template roles data
INSERT INTO roles (name, permissions, description, can_delete, can_update)
VALUES ('Super Admin',
        ARRAY [
            'read:dashboard',
            'read:user',
            'create:user',
            'update:user',
            'delete:user',
            'read:role',
            'create:role',
            'update:role',
            'delete:role'
            ],
        'Vai trò khởi tạo từ hệ thống.',
        false,
        false),
       ('Super Admin',
        ARRAY [
            'read:warehouse',
            'create:warehouse',
            'update:warehouse',
            'delete:warehouse',
            'read:packaging',
            'create:packaging',
            'update:packaging',
            'delete:packaging'
            ],
        'vai tro kho hang',
        true,
        true)
RETURNING
    *;

-- template user_roles data
INSERT INTO user_roles(user_id, role_id)
VALUES ('019ac9d9-c834-7843-bdde-4d4615c6c68f', '019ac9da-429e-7d75-8b41-186e2974cd5d'),
       ('019ac9d9-c834-7843-bdde-4d4615c6c68f', '019ac9da-42a5-7902-9077-fedaedeaf8e4')
RETURNING *;




-- template warehouse
INSERT INTO warehouses(name, address)
VALUES ('Nha kho 1', '159 Nguyen dinh chieu'),
       ('Nha kho 2', '201 Nguyen dinh chieu')
RETURNING *;