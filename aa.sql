-- warehouse find many
SELECT
  w.*,
  COUNT(pi.packaging_id) FILTER (
	  WHERE
		  pi.packaging_id IS NOT NULL
		  AND p.status = 'ACTIVE'
  )::int AS packaging_count,
  COALESCE(
  	json_agg(
		json_build_object(
			'id', p.id,
			'name', p.name,
			'min_stock_level', p.min_stock_level,
			'unit', p.unit,
			'pcs_ctn', p.pcs_ctn,
			'status', p.status,
			'deactived_at', to_char(p.deactived_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
			'image', CASE
                WHEN pim.file_id IS NOT NULL THEN 
                  json_build_object(
                      'id',
                      pim.file_id,
                      'width',
                      pim.width,
                      'height',
                      pim.height,
                      'is_primary',
                      pim.is_primary,
                      'original_name',
                      f.original_name,
                      'mime_type',
                      f.mime_type,
                      'destination',
                      f.destination,
                      'file_name',
                      f.file_name,
                      'size',
                      f.size,
                      'created_at',
                      to_char(
                          pim.created_at AT TIME ZONE 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                        )
                  )
                ELSE null
            END,
			'created_at', to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    		'updated_at', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
		)
	)
	,'[]'
  ) AS packagings 
FROM
  warehouses w
  LEFT JOIN packaging_inventory pi ON (pi.warehouse_id = w.id)
  LEFT JOIN packagings p ON (pi.packaging_id = p.id)
  LEFT JOIN packaging_images pim ON (p.id = pim.packaging_id)
  	AND pim.deleted_at IS NULL
  	AND pim.is_primary = true
  LEFT JOIN files f ON f.id = pim.file_id
    AND pim.deleted_at IS NULL
GROUP BY w.id