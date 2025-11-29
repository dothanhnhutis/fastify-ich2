-- find by id
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
                        'created_at', to_char(pim.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                )
            ELSE NULL END) AS image
FROM packagings p
         LEFT JOIN packaging_images pim ON pim.packaging_id = p.id
         LEFT JOIN files f ON f.id = pim.file_id;


-- find detail
SELECT p.*,
       SUM(pi.quantity)                                             AS total_quantity,
       COUNT(pi.warehouse_id IS NOT NULL AND w.id IS NOT NULL)::int as warehouse_count,
       COALESCE(json_agg(json_build_object(
               'id', w.id,
               'name', w.name,
               'address', w.address,
               'status', w.status,
               'deactivated_at', w.deactivated_at,
               'created_ad', w.created_at,
               'updated_at', w.updated_at,
               'quantity', pi.quantity
                         )), '[]')
FROM packagings p
         LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
         LEFT JOIN warehouses w ON w.id = pi.warehouse_id
WHERE p.id = '019ab9d2-d667-729d-b764-68005ab98a93'
GROUP BY p.id, p.name, p.min_stock_level, p.unit, p.pcs_ctn, p.status, p.deactivated_at, p.created_at, p.updated_at