import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenOtpLogOAuth1776013660370 implements MigrationInterface {
  name = 'AddRefreshTokenOtpLogOAuth1776013660370';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "idx" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "isDeleted" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "hashedToken" character varying(500) NOT NULL, "userId" integer NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "userAgent" character varying(500), "ipAddress" character varying(100), CONSTRAINT "UQ_6dc31405e640f10842f7d99fc07" UNIQUE ("idx"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."otp_logs_type_enum" AS ENUM('email_verify', 'password_reset', 'two_factor')`,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_logs" ("id" SERIAL NOT NULL, "idx" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "isDeleted" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(10) NOT NULL, "userId" integer NOT NULL, "type" "public"."otp_logs_type_enum" NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "attempts" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_1fae8ce12a46c927e164103dcdf" UNIQUE ("idx"), CONSTRAINT "PK_e40afc7741f20895f967dc22d85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "hashedRefreshToken"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_provider_enum" AS ENUM('local', 'google', 'facebook', 'magic_link')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "provider" "public"."users_provider_enum" NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "providerId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "providerId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider"`);
    await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "hashedRefreshToken" character varying(500)`,
    );
    await queryRunner.query(`DROP TABLE "otp_logs"`);
    await queryRunner.query(`DROP TYPE "public"."otp_logs_type_enum"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
