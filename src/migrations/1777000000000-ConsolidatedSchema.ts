import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidatedSchema1777000000000 implements MigrationInterface {
  name = 'ConsolidatedSchema1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_provider_enum') THEN
          CREATE TYPE "public"."users_provider_enum" AS ENUM('local', 'google', 'facebook', 'magic_link');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_logs_type_enum') THEN
          CREATE TYPE "public"."otp_logs_type_enum" AS ENUM('email_verify', 'password_reset', 'two_factor');
        END IF;
      END $$
    `);

    // ── Extension for uuid_generate_v4 (optional, used by some tooling) ──
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Roles table ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id"          SERIAL        NOT NULL,
        "idx"         uuid          NOT NULL,
        "name"        varchar(50)   NOT NULL,
        "description" text,
        "is_active"    boolean       NOT NULL DEFAULT true,
        "is_deleted"   boolean       NOT NULL DEFAULT false,
        "deleted_at"   TIMESTAMP,
        "created_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_idx"  UNIQUE ("idx"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles"      PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_roles_name" ON "roles" ("name")`,
    );

    // ── Users table ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            SERIAL                       NOT NULL,
        "idx"           uuid                         NOT NULL,
        "first_name"     varchar(50)                  NOT NULL,
        "middle_name"    varchar(50),
        "last_name"      varchar(50)                  NOT NULL,
        "email"         varchar(255)                 NOT NULL,
        "password"      varchar(255),
        "mobile_number"  varchar(20),
        "is_active"      boolean                      NOT NULL DEFAULT true,
        "last_login"     TIMESTAMP,
        "provider"      "public"."users_provider_enum" NOT NULL DEFAULT 'local',
        "provider_id"    varchar(255),
        "is_deleted"     boolean                      NOT NULL DEFAULT false,
        "deleted_at"     TIMESTAMP,
        "created_at"     TIMESTAMP                    NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP                    NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_idx"   UNIQUE ("idx"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users"       PRIMARY KEY ("id")
      )
    `);

    // Users indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_users_idx" ON "users" ("idx")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_isDeleted" ON "users" ("is_deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_mobile_number" ON "users" ("mobile_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_last_login" ON "users" ("last_login")`,
    );

    // ── User Roles junction table (RBAC) ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" int NOT NULL,
        "role_id" int NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_roles"
        ADD CONSTRAINT "FK_user_roles_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_roles"
        ADD CONSTRAINT "FK_user_roles_role_id"
        FOREIGN KEY ("role_id") REFERENCES "roles"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ── User Devices table (normalized device info) ────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "id"                SERIAL        NOT NULL,
        "idx"               uuid          NOT NULL,
        "is_active"          boolean       NOT NULL DEFAULT true,

        "user_id"            int           NOT NULL,
        "device_identifier"  uuid          NOT NULL,
        "device_name"        varchar(255),
        "device_type"        varchar(50)   NOT NULL DEFAULT 'desktop',
        "user_agent"         text,
        "ip_address"         varchar(100),
        "last_used_at"       TIMESTAMP,
        "is_trusted"         boolean       NOT NULL DEFAULT false,
        "trusted_at"         TIMESTAMP,

        "is_deleted"         boolean       NOT NULL DEFAULT false,
        "deleted_at"         TIMESTAMP,
        "created_at"         TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMP     NOT NULL DEFAULT now(),

        CONSTRAINT "UQ_user_devices_idx" UNIQUE ("idx"),
        CONSTRAINT "PK_user_devices"     PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_devices"
        ADD CONSTRAINT "FK_user_devices_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_devices_user_id" ON "user_devices" ("user_id")`,
    );
    // Unique partial index: one active device per (user, identifier)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_devices_user_identifier"
      ON "user_devices" ("user_id", "device_identifier")
      WHERE "is_deleted" = false
    `);

    // ── Refresh Tokens table (normalized — device info in user_devices) ────
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"           SERIAL        NOT NULL,
        "idx"          uuid          NOT NULL,
        "is_active"     boolean       NOT NULL DEFAULT true,

        "hashed_token"  varchar(500)  NOT NULL,
        "user_id"       int           NOT NULL,
        "device_id"     int,

        "expires_at"    TIMESTAMP     NOT NULL,
        "last_used_at"  TIMESTAMP,

        "is_revoked"    boolean       NOT NULL DEFAULT false,
        "revoked_at"    TIMESTAMP,

        "is_deleted"    boolean       NOT NULL DEFAULT false,
        "deleted_at"    TIMESTAMP,
        "created_at"    TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP     NOT NULL DEFAULT now(),

        CONSTRAINT "UQ_refresh_tokens_idx" UNIQUE ("idx"),
        CONSTRAINT "PK_refresh_tokens"     PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
        ADD CONSTRAINT "FK_refresh_tokens_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
        ADD CONSTRAINT "FK_refresh_tokens_device_id"
        FOREIGN KEY ("device_id") REFERENCES "user_devices"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_device_id" ON "refresh_tokens" ("device_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_is_revoked" ON "refresh_tokens" ("is_revoked")`,
    );

    // ── OTP Logs table ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "otp_logs" (
        "id"        SERIAL                           NOT NULL,
        "idx"       uuid                             NOT NULL,
        "is_active"  boolean                          NOT NULL DEFAULT true,
        "is_deleted" boolean                          NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMP,
        "created_at" TIMESTAMP                        NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP                        NOT NULL DEFAULT now(),
        "code"      varchar(72)                      NOT NULL,
        "user_id"    int                              NOT NULL,
        "type"      "public"."otp_logs_type_enum"    NOT NULL,
        "expires_at" TIMESTAMP                        NOT NULL,
        "is_used"    boolean                          NOT NULL DEFAULT false,
        "attempts"  int                              NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_otp_logs_idx" UNIQUE ("idx"),
        CONSTRAINT "PK_otp_logs"     PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_logs"
        ADD CONSTRAINT "FK_otp_logs_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ── Seed default roles ─────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "roles" ("idx", "name", "description")
      VALUES
        (uuid_generate_v4(), 'admin', 'Administrator with full access'),
        (uuid_generate_v4(), 'user',  'Regular user with standard access')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order of creation
    await queryRunner.query(
      `ALTER TABLE "otp_logs" DROP CONSTRAINT "FK_otp_logs_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "otp_logs"`);

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_device_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_is_revoked"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_device_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);

    await queryRunner.query(
      `ALTER TABLE "user_devices" DROP CONSTRAINT IF EXISTS "FK_user_devices_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_user_devices_user_identifier"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_user_devices_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_devices"`);

    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_users_last_login"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_mobile_number"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_isDeleted"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_idx"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_roles_name"`);
    await queryRunner.query(`DROP TABLE "roles"`);

    await queryRunner.query(`DROP TYPE "public"."otp_logs_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
  }
}
