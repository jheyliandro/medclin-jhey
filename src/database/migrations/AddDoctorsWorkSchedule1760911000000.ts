import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorsWorkSchedule1760911000000
  implements MigrationInterface
{
  name = 'AddDoctorsWorkSchedule1760911000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "doctors" (
        "id" SERIAL NOT NULL,
        "crm" character varying(50) NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_doctors_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctors_crm" UNIQUE ("crm"),
        CONSTRAINT "UQ_doctors_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_doctors_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "work_shifts" (
        "id" SERIAL NOT NULL,
        "doctor_id" integer NOT NULL,
        "week_day" smallint NOT NULL,
        "start_time" TIME NOT NULL,
        "end_time" TIME NOT NULL,
        "slot_duration_minutes" integer NOT NULL,
        CONSTRAINT "PK_work_shifts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_shifts_doctor_id" FOREIGN KEY ("doctor_id")
          REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_work_shifts_week_day" CHECK ("week_day" BETWEEN 0 AND 6),
        CONSTRAINT "CHK_work_shifts_time" CHECK ("start_time" < "end_time"),
        CONSTRAINT "CHK_work_shifts_duration" CHECK ("slot_duration_minutes" > 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "work_shifts"');
    await queryRunner.query('DROP TABLE IF EXISTS "doctors"');
  }
}
