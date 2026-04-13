import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOtpCodeColumnLength1776057630366 implements MigrationInterface {
    name = 'FixOtpCodeColumnLength1776057630366'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_logs" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "otp_logs" ADD "code" character varying(72) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_logs" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "otp_logs" ADD "code" character varying(10) NOT NULL`);
    }

}
