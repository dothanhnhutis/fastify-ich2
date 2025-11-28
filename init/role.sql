-- FindRoleByIdService
SELECT *
FROM roles
WHERE deactivated_at IS NULL
  AND id = '019ac386-fe23-733c-ab1b-11797876eabc';

-- FindRoleDetailByIdService
SELECT r.*,
       COUNT(u.id)::int AS user_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', u.id,
                               'email', u.email,
                               'username', u.username,
                               'has_password', (u.password_hash IS NOT NULL)::boolean,
                               'status', u.status,
                               'deactivated_at', u.deactivated_at,
                               'created_at', u.created_at,
                               'updated_at', u.updated_at,
                               'avatar', CASE
                                             WHEN ua.file_id IS NOT NULL THEN json_build_object(
                                                     'id', ua.file_id,
                                                     'width', ua.width,
                                                     'height', ua.height,
                                                     'is_primary', ua.is_primary,
                                                     'original_name', f.original_name,
                                                     'mime_type', f.mime_type,
                                                     'destination', f.destination,
                                                     'file_name', f.file_name,
                                                     'size', f.size,
                                                     'created_at', to_char(ua.created_at AT TIME ZONE 'UTC',
                                                                           'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                                                                              ) END
                       )
                               ) FILTER ( WHERE u.id IS NOT NULL ), '[]'
       )                AS users
FROM roles r
         LEFT JOIN user_roles ur ON ur.role_id = r.id
         LEFT JOIN users u ON u.id = ur.user_id AND u.status = 'ACTIVE' AND u.deactivated_at IS NULL
         LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
         LEFT JOIN files f ON f.id = ua.file_id
WHERE r.deactivated_at IS NULL
  AND r.id = '019ac386-fe23-733c-ab1b-11797876eabc'
GROUP BY r.id
LIMIT 1;

-- FindManyRoleService
SELECT r.*,
       (SELECT COUNT(*)
        FROM user_roles ur2
                 JOIN users u2 ON u2.id = ur2.user_id
        WHERE ur2.role_id = r.id
          AND u2.status = 'ACTIVE'
          AND u2.deactivated_at IS NULL)::int AS user_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', u.id,
                               'email', u.email,
                               'has_password', (u.password_hash IS NOT NULL)::boolean,
                               'username', u.username,
                               'status', u.status,
                               'deactivated_at', u.deactivated_at,
                               'avatar', u.avatar,
                               'created_at', to_char(
                                       u.created_at AT TIME ZONE 'UTC',
                                       'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                                             ),
                               'updated_at', to_char(
                                       u.updated_at AT TIME ZONE 'UTC',
                                       'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                                             )
                       )
                               ) FILTER (WHERE u.id IS NOT NULL),
                       '[]'
       )                                      AS users
FROM roles r
         LEFT JOIN LATERAL (
    SELECT u.*,
           (CASE
                WHEN f.id IS NOT NULL THEN
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
                            'created_at', to_char(
                                    ua.created_at AT TIME ZONE 'UTC',
                                    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                                          )
                    ) END) AS avatar
    FROM users u
             LEFT JOIN user_roles ur ON ur.user_id = u.id
             LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.deactivated_at is NULL
             LEFT JOIN files f ON f.id = ua.file_id
    WHERE ur.role_id = r.id
      AND u.status = 'ACTIVE'
      AND u.deactivated_at IS NULL
    ORDER BY u.created_at DESC
    LIMIT 3
    ) u ON TRUE
GROUP BY r.id;

-- FindUsersByRoleIdService
WITH users AS (SELECT u.id,
                      u.username,
                      u.email,
                      (u.password_hash IS NOT NULL)::boolean AS has_password,
                      u.status,
                      u.deactivated_at,
                      u.created_at,
                      u.updated_at,
                      (CASE
                           WHEN f.id IS NOT NULL THEN json_build_object(
                                   'id', ua.file_id,
                                   'width', ua.width,
                                   'height', ua.height,
                                   'is_primary', ua.is_primary,
                                   'original_name', f.original_name,
                                   'mime_type', f.mime_type,
                                   'destination', f.destination,
                                   'file_name', f.file_name,
                                   'size', f.size,
                                   'created_at', to_char(
                                           ua.created_at AT TIME ZONE 'UTC',
                                           'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                                                 )
                                                      ) END) AS avatar
               FROM user_roles ur
                        INNER JOIN users u ON u.id = ur.user_id AND u.deactivated_at IS NULL
                        LEFT JOIN user_avatars ua
                                  ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
                        LEFT JOIN files f ON f.id = ua.file_id
               WHERE ur.role_id = '019ac386-fe23-74ae-861c-de6aaad66335')
SELECT *
from users;


