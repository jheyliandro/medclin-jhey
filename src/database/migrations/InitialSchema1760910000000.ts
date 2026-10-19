import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760910000000 implements MigrationInterface {
  name = 'InitialSchema1760910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "name" character varying(120) NOT NULL,
          "email" character varying(255) NOT NULL,
          "password" character varying(255) NOT NULL,
          "roles" text NOT NULL DEFAULT 'admin',
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_users_email" UNIQUE ("email")
        )
      `);
    } else {
      const usersTable = await queryRunner.getTable('users');
      const hasRoles = usersTable?.findColumnByName('roles');
      const legacyRole = usersTable?.findColumnByName('role');

      if (!hasRoles && legacyRole) {
        await queryRunner.query(
          'ALTER TABLE "users" ADD COLUMN "roles" text',
        );
        await queryRunner.query(`
          UPDATE "users"
          SET "roles" = CASE
            WHEN "role"::text = 'attendant' THEN 'secretary'
            ELSE "role"::text
          END
        `);
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "role"');
        await queryRunner.query(
          `ALTER TABLE "users" ALTER COLUMN "roles" SET NOT NULL,
           ALTER COLUMN "roles" SET DEFAULT 'admin'`,
        );
      } else if (!hasRoles) {
        await queryRunner.query(`
          ALTER TABLE "users"
          ADD COLUMN "roles" text NOT NULL DEFAULT 'admin'
        `);
      }
    }

    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_unique" ON "users" ("email")',
    );

    if (!(await queryRunner.hasTable('patients'))) {
      await queryRunner.query(`
        CREATE TABLE "patients" (
          "id" SERIAL NOT NULL,
          "name" character varying(120) NOT NULL,
          "cpf" character varying(11) NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_patients_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_patients_cpf" UNIQUE ("cpf")
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "patients"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
