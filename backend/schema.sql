CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    migration_id character varying(150) NOT NULL,
    product_version character varying(32) NOT NULL,
    CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
);

START TRANSACTION;

CREATE TABLE families (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    invite_code character varying(16) NOT NULL,
    creator_user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_families PRIMARY KEY (id)
);

CREATE TABLE users (
    id uuid NOT NULL,
    display_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    avatar_url character varying(500),
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id)
);

CREATE TABLE events (
    id uuid NOT NULL,
    family_id uuid NOT NULL,
    title character varying(150) NOT NULL,
    event_date character varying(50) NOT NULL,
    icon character varying(20) NOT NULL,
    badge_bg character varying(20) NOT NULL,
    has_cart boolean NOT NULL,
    is_completed boolean NOT NULL,
    completed_at character varying(50),
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_events PRIMARY KEY (id),
    CONSTRAINT fk_events_families_family_id FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE products (
    id uuid NOT NULL,
    title character varying(150) NOT NULL,
    unit character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    image_key character varying(50),
    image_url character varying(500),
    emoji character varying(20),
    family_id uuid,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_products PRIMARY KEY (id),
    CONSTRAINT fk_products_families_family_id FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE family_members (
    id uuid NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    joined_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_family_members PRIMARY KEY (id),
    CONSTRAINT fk_family_members_families_family_id FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
    CONSTRAINT fk_family_members_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id uuid NOT NULL,
    family_id uuid NOT NULL,
    product_id uuid,
    title character varying(150) NOT NULL,
    unit character varying(100) NOT NULL,
    image_key character varying(50),
    image_url character varying(500),
    emoji character varying(20),
    quantity integer NOT NULL,
    status character varying(20) NOT NULL,
    taken_by_user_id uuid,
    is_bought boolean NOT NULL,
    event_id uuid,
    updated_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_cart_items PRIMARY KEY (id),
    CONSTRAINT fk_cart_items_events_event_id FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_families_family_id FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_products_product_id FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
    CONSTRAINT fk_cart_items_users_taken_by_user_id FOREIGN KEY (taken_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_cart_items_event_id ON cart_items (event_id);

CREATE INDEX ix_cart_items_family_id ON cart_items (family_id);

CREATE INDEX ix_cart_items_product_id ON cart_items (product_id);

CREATE INDEX ix_cart_items_taken_by_user_id ON cart_items (taken_by_user_id);

CREATE INDEX ix_events_family_id ON events (family_id);

CREATE UNIQUE INDEX ix_families_invite_code ON families (invite_code);

CREATE UNIQUE INDEX ix_family_members_family_id_user_id ON family_members (family_id, user_id);

CREATE INDEX ix_family_members_user_id ON family_members (user_id);

CREATE INDEX ix_products_family_id ON products (family_id);

CREATE UNIQUE INDEX ix_users_email ON users (email);

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20261026214529_InitialCreate', '8.0.5');

COMMIT;

