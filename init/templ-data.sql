-- template users data
INSERT INTO users (email, username, deactivated_at, password_hash)
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
VALUES ('019ac37d-6a39-724b-baf1-2ba700bc54ce', '019ac386-fe23-733c-ab1b-11797876eabc'),
       ('019ac37d-6a39-724b-baf1-2ba700bc54ce', '019ac386-fe23-74ae-861c-de6aaad66335')
RETURNING *;
