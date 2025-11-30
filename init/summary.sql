-- DROP SCHEMA PUBLIC CASCADE;
-- CREATE SCHEMA PUBLIC;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER DATABASE pgdb
    SET
        datestyle = 'ISO, DMY';

ALTER DATABASE pgdb
    SET
        timezone = 'UTC';


--- timezone → ảnh hưởng đến giờ (lưu, hiển thị, convert). Có thể ép toàn DB về UTC.
--- datestyle → chỉ ảnh hưởng đến cách Postgres parse/hiển thị ngày (thứ tự ngày/tháng/năm). Nó không thay đổi dữ liệu bên trong.
-------
---- Các dạng datestyle hay gặp
----- ISO: chuẩn ISO-8601, hiển thị YYYY-MM-DD (rõ ràng, ít nhầm nhất).
----- MDY: tháng-ngày-năm (kiểu Mỹ).
----- DMY: ngày-tháng-năm (kiểu Châu Âu, VN quen dùng).
----- YMD: năm-tháng-ngày (ít khi xài vì ISO đã bao phủ).
-------
--- datestyle có thể có 1 hoặc 2 giá trị
---- 1 giá trị: chỉ định kiểu hiển thị (output format)
----- Ex: SET datestyle = 'ISO'; Hiển thị theo chuẩn ISO (YYYY-MM-DD)
---- 2 giá trị: giá trị đầu tiên là kiểu hiển thị, giá trị thứ hai là thứ tự khi parse input không rõ ràng.
----- Ex: SET datestyle = 'ISO, DMY';
----- ISO → in ra kiểu YYYY-MM-DD.
----- DMY → nếu bạn nhập '09-08-2025', PostgreSQL sẽ hiểu là 9 Aug 2025, không phải 8 Sep 2025.
---------------------------------

-- users table
CREATE TABLE IF NOT EXISTS users
(
    id            TEXT           NOT NULL DEFAULT uuidv7()::TEXT,
    email         VARCHAR(255)   NOT NULL,
    password_hash TEXT           NOT NULL,
    username      VARCHAR(100)   NOT NULL,
    status        VARCHAR(10)    NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' |'DISABLED'
    disabled_at   TIMESTAMPTZ(3),
    deleted_at    TIMESTAMPTZ(3),                           -- soft delete
    created_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'DISABLED'))
);

-- users deleted_at index
CREATE INDEX IF NOT EXISTS idx_users_deleted_at_null ON users (deleted_at)
    WHERE deleted_at IS NULL;
-- users  email unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active_unique ON users (email)
    WHERE deleted_at IS NULL;

alter  table  packagings rename COLUMN deactivated_at to disabled_at;
alter  table  packagings add COLUMN deleted_at TIMESTAMPTZ(3);


-- roles table
CREATE TABLE IF NOT EXISTS roles
(
    id          TEXT           NOT NULL DEFAULT uuidv7()::TEXT,
    name        VARCHAR(255)   NOT NULL,
    permissions TEXT[]         NOT NULL DEFAULT ARRAY []::TEXT[],
    description TEXT           NOT NULL DEFAULT '',
    status      VARCHAR(10)    NOT NULL DEFAULT 'ACTIVE',
    disabled_at TIMESTAMPTZ(3),
    deleted_at  TIMESTAMPTZ(3), -- soft delete
    can_delete  BOOLEAN        NOT NULL DEFAULT TRUE,
    can_update  BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);
-- roles index
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at_null ON roles (deleted_at)
    WHERE deleted_at IS NULL;


-- user_roles table
CREATE TABLE IF NOT EXISTS user_roles
(
    user_id    TEXT           NOT NULL,
    role_id    TEXT           NOT NULL,
    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id)
);

-- user_roles foreign key
ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_user_id_users_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE;
-- user_roles foreign key
ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- files table
CREATE TABLE IF NOT EXISTS files
(
    id            TEXT           NOT NULL DEFAULT uuidv7()::text,
    original_name TEXT           NOT NULL,
    mime_type     VARCHAR(255)   NOT NULL,
    destination   TEXT           NOT NULL,
    file_name     TEXT           NOT NULL,
    path          TEXT           NOT NULL,
    size          BIGINT         NOT NULL,
    -- category_id TEXT,
    owner_id      TEXT           NOT NULL,
    created_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    -- deleted_at TIMESTAMPTZ(3),
    CONSTRAINT files_pkey PRIMARY KEY (id)
);
-- files owner_id index
CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files (owner_id);
-- files created_at index
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at);
-- files mime_type index
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files (mime_type);


-- user_avatars table
CREATE TABLE IF NOT EXISTS user_avatars
(
    user_id    TEXT           NOT NULL,
    file_id    TEXT           NOT NULL,
    width      INTEGER        NOT NULL,
    height     INTEGER        NOT NULL,
    is_primary BOOLEAN        NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ(3),
    CONSTRAINT user_avatars_pkey PRIMARY KEY (user_id, file_id)
);

-- user_avatars user_id index
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars (user_id);
-- user_avatars deleted_at index
CREATE INDEX IF NOT EXISTS idx_user_avatars_deleted_at ON user_avatars (deleted_at)
    WHERE
        deleted_at IS NULL;
-- user_avatars user_id unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_avatars_primary_unique ON user_avatars (user_id)
    WHERE
        is_primary = true
            AND deleted_at IS NULL;

-- user_avatars foreign key
ALTER TABLE user_avatars
    ADD CONSTRAINT user_avatars_file_id_files_id_fkey FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE;


-- warehouses table
CREATE TABLE IF NOT EXISTS warehouses
(
    id          TEXT           NOT NULL DEFAULT uuidv7()::text,
    name        VARCHAR(255)   NOT NULL,
    address     TEXT           NOT NULL DEFAULT '',
    status      VARCHAR(10)    NOT NULL DEFAULT 'ACTIVE',
    disabled_at TIMESTAMPTZ(3),
    deleted_at  TIMESTAMPTZ(3), -- soft delete
    created_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT warehouses_pkey PRIMARY KEY (id)
);

-- warehouses deleted_at index
CREATE INDEX IF NOT EXISTS idx_warehouses_deleted_at ON warehouses (deleted_at)
    WHERE
        deleted_at IS NULL;

-- packagings table
CREATE TABLE IF NOT EXISTS packagings
(
    id              TEXT           NOT NULL DEFAULT uuidv7()::text,
    name            VARCHAR(255)   NOT NULL,
    min_stock_level INTEGER,
    unit            VARCHAR(20)    NOT NULL, -- PIECE | CARTON
    pcs_ctn         INTEGER,
    status          VARCHAR(10)    NOT NULL DEFAULT 'ACTIVE',
    disabled_at     TIMESTAMPTZ(3),
    deleted_at      TIMESTAMPTZ(3),          -- soft delete
    created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT packagings_pkey PRIMARY KEY (id)
);
-- packagings deleted_at index
CREATE INDEX IF NOT EXISTS idx_packagings_deleted_at ON warehouses (deleted_at)
    WHERE
        deleted_at IS NULL;

-- packagings check đảm bảo logic unit <-> pcs_ctn
ALTER TABLE packagings
    ADD CONSTRAINT chk_unit_to_pcs_ctn CHECK (
        (
            unit = 'CARTON'
                AND pcs_ctn IS NOT NULL
            )
            OR (
            unit <> 'CARTON'
                AND pcs_ctn IS NULL
            )
        );

-- packaging_images table
CREATE TABLE IF NOT EXISTS packaging_images
(
    packaging_id TEXT           NOT NULL,
    file_id      TEXT           NOT NULL,
    width        INTEGER        NOT NULL,
    height       INTEGER        NOT NULL,
    is_primary   BOOLEAN        NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ(3),
    CONSTRAINT packaging_images_pkey PRIMARY KEY (packaging_id, file_id)
);

-- packaging_images foreign key
ALTER TABLE packaging_images
    ADD CONSTRAINT packaging_images_file_id_files_id_fkey FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE;



-- packaging_inventory table
CREATE TABLE IF NOT EXISTS packaging_inventory
(
    packaging_id TEXT           NOT NULL,
    warehouse_id TEXT           NOT NULL,
    quantity     INTEGER        NOT NULL DEFAULT 0,
    -- reserved_quantity INTEGER NOT NULL DEFAULT 0,
    -- available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    created_at   TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT packaging_inventory_pkey PRIMARY KEY (warehouse_id, packaging_id)
);

--- packaging_inventory foreign key
ALTER TABLE packaging_inventory
    ADD CONSTRAINT packaging_inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT ON UPDATE CASCADE;
--- packaging_inventory foreign key
ALTER TABLE packaging_inventory
    ADD CONSTRAINT packaging_inventory_packaging_id_fkey FOREIGN KEY (packaging_id) REFERENCES packagings (id) ON DELETE RESTRICT ON UPDATE CASCADE;



-- set_updated_at function
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
    LANGUAGE plpgsql AS
$$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- users trigger updated_at
CREATE TRIGGER trg_updated_at_users
    BEFORE
        UPDATE
    ON users
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();