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
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE u.email = 'gaconght@gmail.com'
  AND u.deactivated_at IS NULL
GROUP BY u.id, u.username, u.email, u.password_hash, u.status, u.deactivated_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at
LIMIT 1;

-- FindUserWithoutPasswordByEmailService
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean AS has_password,
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
                               'deactivated_at', r.deactivated_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id AND r.deactivated_at IS NULL AND r.status = 'ACTIVE'
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
    AND r.deactivated_at IS NULL
    AND r.status = 'ACTIVE'
WHERE u.deactivated_at IS NULL
  AND u.id = '019ac37d-6a39-724b-baf1-2ba700bc54ce'
GROUP BY u.id, u.email, u.password_hash, u.username, u.status, u.deactivated_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at
LIMIT 1;

-- FindUserDetailWithoutPasswordByIdService
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean AS has_password,
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
                               'deactivated_at', r.deactivated_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                                      AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id AND r.deactivated_at IS NULL AND r.status = 'ACTIVE'
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
    AND r.deactivated_at IS NULL
    AND r.status = 'ACTIVE'
WHERE u.deactivated_at IS NULL
  AND u.id = '019ac37d-6a39-724b-baf1-2ba700bc54ce'
GROUP BY u.id, u.email, u.password_hash, u.username, u.status, u.deactivated_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at
LIMIT 1;

-- FindManyUserService
SELECT u.id,
       u.username,
       u.email,
       (u.password_hash IS NOT NULL)::boolean AS has_password,
       u.status,
       u.deactivated_at,
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
                               'deactivated_at', r.deactivated_at,
                               'can_delete', r.can_delete,
                               'can_update', r.can_update,
                               'created_at', r.created_at,
                               'updated_at', r.updated_at
                       )
                               ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
       )                                      AS roles
FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id AND r.deactivated_at IS NULL AND r.status = 'ACTIVE'
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
    AND r.deactivated_at IS NULL
    AND r.status = 'ACTIVE'
WHERE u.deactivated_at IS NULL
GROUP BY u.id, u.email, u.password_hash, u.username, u.status, u.deactivated_at, u.created_at, u.updated_at, ua.file_id,
         ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         ua.created_at;

-- FindRolesByUserIdService
WITH roles AS (SELECT r.*
               FROM user_roles ur
                        INNER JOIN roles r ON r.id = ur.role_id AND r.deactivated_at IS NULL
               WHERE ur.user_id = '019ac37d-6a39-724b-baf1-2ba700bc54ce')
SELECT *
FROM roles;


