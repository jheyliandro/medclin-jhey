import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointments1760912000000 implements MigrationInterface {
  name = 'AddAppointments1760912000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" SERIAL NOT NULL,
        "doctor_id" integer NOT NULL,
        "patient_id" integer NOT NULL,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'scheduled',
        CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointments_doctor_id" FOREIGN KEY ("doctor_id")
          REFERENCES "doctors"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointments_patient_id" FOREIGN KEY ("patient_id")
          REFERENCES "patients"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_appointments_period" CHECK ("starts_at" < "ends_at"),
        CONSTRAINT "CHK_appointments_status" CHECK
          ("status" IN ('scheduled', 'in_progress', 'done', 'cancelled'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_doctor_period" ON "appointments" ("doctor_id", "starts_at", "ends_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_patient_period" ON "appointments" ("patient_id", "starts_at", "ends_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "appointments"');
  }
}
