-- FindRoleByIdService
SELECT *
FROM roles
WHERE id = '019ac386-fe23-733c-ab1b-11797876eabc'
  AND deactivated_at IS NULL;

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
                               'updated_at', u.updated_at
                       )
                               ) FILTER ( WHERE u.id IS NOT NULL ), '[]'
       )
FROM roles r
         LEFT JOIN user_roles ur ON ur.role_id = r.id
         LEFT JOIN users u ON u.id = ur.user_id AND u.deactivated_at IS NULL
GROUP BY r.id

