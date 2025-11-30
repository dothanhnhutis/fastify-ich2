-- FindUserByEmailService
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
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.email = 'gaconght@gmail.com'
  AND u.deleted_at IS NULL
GROUP BY u.id, u.username, u.email, u.password_hash, u.status, u.disabled_at, u.deleted_at, u.created_at, u.updated_at,
         ua.file_id, ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name,
         f.size,
         ua.created_at
LIMIT 1;

-- FindUserWithoutPasswordByEmailService
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean AS has_password,
       u.status,
       u.disabled_at,
       u.deleted_at,
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
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.email = 'gaconght@gmail.com'
  AND u.deleted_at IS NULL
GROUP BY u.id, u.username, u.email, u.password_hash, u.status, u.disabled_at, u.deleted_at, u.created_at, u.updated_at,
         ua.file_id, ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name,
         f.size,
         ua.created_at
LIMIT 1;

-- FindUserDetailByIdService
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
           )            AS avatar,
       COUNT(r.id)::int AS role_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', r.id,
                               'name', r.name,
                               'permissions', r.permissions,
                               'description', r.description,
                               'status', r.status,
                               'disabled_at', r.disabled_at,
                               'deleted_at', r.deleted_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.disabled_at IS NULL
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.deleted_at IS NULL
  AND u.id = '019ac9d9-c834-7843-bdde-4d4615c6c68f'
GROUP BY u.id, u.email, u.password_hash, u.username, u.status, u.disabled_at, u.deleted_at, u.created_at, u.updated_at,
         ua.file_id, ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at
LIMIT 1;

-- FindUserDetailWithoutPasswordByIdService
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean AS has_password,
       u.status,
       u.disabled_at,
       u.deleted_at,
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
           )                                  AS avatar,
       COUNT(r.id)::int                       AS role_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', r.id,
                               'name', r.name,
                               'permissions', r.permissions,
                               'description', r.description,
                               'status', r.status,
                               'disabled_at', r.disabled_at,
                               'deleted_at', r.deleted_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                                      AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.disabled_at IS NULL
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.deleted_at IS NULL
  AND u.id = '019ab9d2-d664-74fc-9768-61cb828f9058'
GROUP BY u.id, u.email, u.password_hash, u.username, u.status, u.disabled_at, u.deleted_at, u.created_at, u.updated_at,
         ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at
LIMIT 1;

-- FindManyUserService
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean AS has_password,
       u.status,
       u.disabled_at,
       u.deleted_at,
       u.created_at,
       u.updated_at,
       COUNT(r.id)::int                       AS role_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', r.id,
                               'name', r.name,
                               'permissions', r.permissions,
                               'description', r.description,
                               'status', r.status,
                               'disabled_at', r.disabled_at,
                               'deleted_at', r.deleted_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                                      AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.disabled_at IS NULL
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.password_hash, u.username, u.status, u.deleted_at, u.disabled_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at;

-- FindRolesByUserIdService
WITH roles AS (SELECT r.*
               FROM user_roles ur
                        INNER JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
               WHERE ur.user_id = '019ac9d9-c834-7843-bdde-4d4615c6c68f')
SELECT *
FROM roles;


