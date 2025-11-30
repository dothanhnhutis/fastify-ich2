-- FindWarehouseByIdService
SELECT *
FROM warehouses
WHERE deleted_at IS NULL
  AND id = '019acece-6899-781f-9779-04d13c5804af';


-- FindWarehouseDetailByIdService
SELECT w.*,
       COUNT(p.id)::int as packaging_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', p.id,
                               'name', p.name,
                               'min_stock_level', p.min_stock_level,
                               'unit', p.unit,
                               'pcs_ctn', p.pcs_ctn,
                               'status', p.status,
                               'disabled_at',
                               to_char(p.disabled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'deleted_at',
                               to_char(p.deleted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'created_at', to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'updated_at', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'image', CASE
                                            WHEN pim.file_id IS NOT NULL THEN
                                                json_build_object(
                                                        'id', pim.file_id,
                                                        'width', pim.width,
                                                        'height', pim.height,
                                                        'is_primary', pim.is_primary,
                                                        'original_name', f.original_name,
                                                        'mime_type', f.mime_type,
                                                        'destination', f.destination,
                                                        'file_name', f.file_name,
                                                        'size', f.size,
                                                        'created_at', to_char(pim.created_at AT TIME ZONE 'UTC',
                                                                              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                                                )
                                   END,
                               'quantity', pi.quantity
                       )
                               ) FILTER ( WHERE p.id IS NOT NULL ), '[]'
       )                AS packagings
FROM warehouses w
         LEFT JOIN packaging_inventory pi ON pi.warehouse_id = w.id
         LEFT JOIN packagings p ON p.id = pi.packaging_id AND p.deleted_at IS NULL
         LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND p.deleted_at IS NULL
         LEFT JOIN files f ON f.id = pim.file_id
WHERE w.deleted_at IS NULL
  AND w.id = '019ad00e-1c80-7be9-8675-1eac39515d59'
GROUP BY w.id;


-- FindManyWarehouseService
SELECT w.*,
       COUNT(p.id)::int as packaging_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', p.id,
                               'name', p.name,
                               'min_stock_level', p.min_stock_level,
                               'unit', p.unit,
                               'pcs_ctn', p.pcs_ctn,
                               'status', p.status,
                               'disabled_at',
                               to_char(p.disabled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'deleted_at',
                               to_char(p.deleted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'created_at', to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'updated_at', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                               'image', CASE
                                            WHEN pim.file_id IS NOT NULL THEN
                                                json_build_object(
                                                        'id', pim.file_id,
                                                        'width', pim.width,
                                                        'height', pim.height,
                                                        'is_primary', pim.is_primary,
                                                        'original_name', f.original_name,
                                                        'mime_type', f.mime_type,
                                                        'destination', f.destination,
                                                        'file_name', f.file_name,
                                                        'size', f.size,
                                                        'created_at', to_char(pim.created_at AT TIME ZONE 'UTC',
                                                                              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                                                )
                                   END,
                               'quantity', pi.quantity
                       )
                               ) FILTER ( WHERE p.id IS NOT NULL ), '[]'
       )                AS packagings
FROM warehouses w
         LEFT JOIN packaging_inventory pi ON pi.warehouse_id = w.id
         LEFT JOIN packagings p ON p.id = pi.packaging_id AND p.deleted_at IS NULL
         LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND p.deleted_at IS NULL
         LEFT JOIN files f ON f.id = pim.file_id
WHERE w.deleted_at IS NULL
GROUP BY w.id;

-- FindPackagingsByWarehouseIdService
WITH packagings AS (SELECT p.*,
                           pi.quantity,
                           (CASE
                                WHEN f.id IS NOT NULL THEN json_build_object(
                                        'id', pim.file_id,
                                        'width', pim.width,
                                        'height', pim.height,
                                        'is_primary', pim.is_primary,
                                        'original_name', f.original_name,
                                        'mime_type', f.mime_type,
                                        'destination', f.destination,
                                        'file_name', f.file_name,
                                        'size', f.size,
                                        'created_at', to_char(
                                                pim.created_at AT TIME ZONE 'UTC',
                                                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                                                      )
                                                           ) END) AS image
                    FROM packaging_inventory pi
                             INNER JOIN packagings p ON p.id = pi.packaging_id AND p.deleted_at IS NULL
                             LEFT JOIN packaging_images pim
                                       ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND pim.deleted_at IS NULL
                             LEFT JOIN files f ON f.id = pim.file_id
                    WHERE pi.warehouse_id = '019ad00e-1c80-7be9-8675-1eac39515d59')
SELECT *
from packagings