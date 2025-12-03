-- FindPackagingByIdService
SELECT p.*,
       SUM(pi.quantity)::int AS total_quantity,
       (CASE
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
           END)               AS image
FROM packagings p
         LEFT JOIN packaging_images pim ON pim.packaging_id = p.id
    AND pim.is_primary = TRUE AND pim.deleted_at IS NULL
         LEFT JOIN files f ON f.id = pim.file_id
         LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
WHERE p.deleted_at IS NULL
  AND p.id = '019aceee-9aa3-7543-b53d-2b79bf523e03'
GROUP BY p.id, p.name, p.min_stock_level, p.unit, p.pcs_ctn, p.status, p.disabled_at, p.deleted_at, p.created_at, p.updated_at,
         pim.file_id, pim.height, pim.width, pim.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
         pim.created_at;

-- FindDetailPackagingByIdService
SELECT p.*,
       (CASE
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
           END)                     AS image,
       SUM(pi.quantity)::int        AS total_quantity,
       COUNT(w.id IS NOT NULL)::int AS warehouse_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', w.id,
                               'name', w.name,
                               'address', w.address,
                               'status', w.status,
                               'disabled_at', w.disabled_at,
                               'deleted_at', w.deleted_at,
                               'created_ad', w.created_at,
                               'updated_at', w.updated_at,
                               'quantity', pi.quantity
                       )
                               ) FILTER ( WHERE w.id IS NOT NULL ), '[]'
       )                            AS warehouses
FROM packagings p
         LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND pim.deleted_at IS NULL
         LEFT JOIN files f ON f.id = pim.file_id
         LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
         LEFT JOIN warehouses w ON w.id = pi.warehouse_id
WHERE p.deleted_at IS NULL
  AND p.id = '019aceee-9aa3-7543-b53d-2b79bf523e03'
GROUP BY p.id, p.name, p.min_stock_level, p.unit, p.pcs_ctn, p.status, p.disabled_at, p.deleted_at, p.created_at,
         p.updated_at,
         pim.file_id, pim.height, pim.width, pim.is_primary, f.original_name, f.mime_type, f.destination, f.file_name,
         f.size,
         pim.created_at;


-- FindManyPackagingService
SELECT p.*,
       (CASE
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
           END)                     AS image,
       SUM(pi.quantity)::int        AS total_quantity,
       COUNT(w.id IS NOT NULL)::int AS warehouse_count,
       COALESCE(
                       json_agg(
                       json_build_object(
                               'id', w.id,
                               'name', w.name,
                               'address', w.address,
                               'status', w.status,
                               'disabled_at', w.disabled_at,
                               'deleted_at', w.deleted_at,
                               'created_ad', w.created_at,
                               'updated_at', w.updated_at,
                               'quantity', pi.quantity
                       )
                               ) FILTER ( WHERE w.id IS NOT NULL ), '[]'
       )                            AS warehouses
FROM packagings p
         LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND pim.deleted_at IS NULL
         LEFT JOIN files f ON f.id = pim.file_id
         LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
         LEFT JOIN warehouses w ON w.id = pi.warehouse_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.min_stock_level, p.unit, p.pcs_ctn, p.status, p.disabled_at, p.deleted_at, p.created_at,
         p.updated_at,
         pim.file_id, pim.height, pim.width, pim.is_primary, f.original_name, f.mime_type, f.destination, f.file_name,
         f.size,
         pim.created_at;


-- FindWarehousesByPackagingIdService
WITH warehouses AS (SELECT w.*, pi.quantity
                    FROM packaging_inventory pi
                             INNER JOIN warehouses w ON w.id = pi.warehouse_id AND w.deleted_at IS NULL
                    WHERE pi.packaging_id = '019aceee-9aae-7fca-8f6a-fe42ad12ea19')
SELECT *
FROM warehouses