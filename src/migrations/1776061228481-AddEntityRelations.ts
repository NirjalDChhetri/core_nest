import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEntityRelations1776061228481 implements MigrationInterface {
    name = 'AddEntityRelations1776061228481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_logs" ADD CONSTRAINT "FK_a3cf692b8f7762b1b60013946c8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_logs" DROP CONSTRAINT "FK_a3cf692b8f7762b1b60013946c8"`);
    }

}
