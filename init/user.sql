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


-- find user by id or email
SELECT u.*,
       (CASE
            WHEN ua.file_id IS NOT NULL THEN
                json_build_object(
                        'id', ua.file_id,
                        'width', ua.width,
                        'height', ua.height,
                        'is_primary', ua.is_primary,
                        'original_name', f.original_name,
                        'mime_type', f.mime_type,
                        'destination', f.destination,
                        'file_name', f.file_name,
                        'size', f.size,
                        'created_at', to_char(ua.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                ) END
           ) AS avatar
FROM users u
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.email = 'gaconght@gmail.com'
  AND u.deactivated_at IS NULL
GROUP BY u.id, u.username, u.email, u.password_hash, u.status, u.deactivated_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at;


-- find user by id or email without password
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean as has_password,
       u.status,
       u.deactivated_at,
       u.created_at,
       u.updated_at,
       (CASE
            WHEN ua.file_id IS NOT NULL THEN
                json_build_object(
                        'id', ua.file_id,
                        'width', ua.width,
                        'height', ua.height,
                        'is_primary', ua.is_primary,
                        'original_name', f.original_name,
                        'mime_type', f.mime_type,
                        'destination', f.destination,
                        'file_name', f.file_name,
                        'size', f.size,
                        'created_at', to_char(ua.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                ) END
           )                                  AS avatar
FROM users u
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.email = 'gaconght@gmail.com'
  AND u.deactivated_at IS NULL
GROUP BY u.id, u.username, u.email, u.password_hash, u.status, u.deactivated_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at;

-- find user detail by id
SELECT u.*,
       COUNT(ur.role_id)::int AS role_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', r.id,
                               'name', r.name,
                               'permissions', r.permissions,
                               'description', r.description,
                               'status', r.status,
                               'deactivated_at', r.deactivated_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                      AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
    AND r.deactivated_at IS NULL
    AND r.status = 'ACTIVE'
WHERE u.id = '019ac37d-6a39-724b-baf1-2ba700bc54ce'
GROUP BY u.id;

-- find many user
SELECT u.*,
       COUNT(ur.role_id)::int AS role_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', r.id,
                               'name', r.name,
                               'permissions', r.permissions,
                               'description', r.description,
                               'status', r.status,
                               'deactivated_at', r.deactivated_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                      AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
    AND r.deactivated_at IS NULL
    AND r.status = 'ACTIVE'
WHERE u.id = '019ac37d-6a39-724b-baf1-2ba700bc54ce'
GROUP BY u.id;


select * from roles;



