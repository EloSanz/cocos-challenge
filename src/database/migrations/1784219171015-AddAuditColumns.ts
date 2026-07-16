import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `created_at` / `updated_at` audit columns to the 4 domain tables.
 *
 * Hand-written (NOT the raw `migration:generate` output): generate diffed the
 * whole entity set against the provided schema and emitted destructive DDL
 * (DROP/re-ADD of ticker/name/type/email/side/status, enum conversions, NOT
 * NULL toggles). This migration does ONLY the intended, additive change, and
 * is idempotent so it is safe to run against any environment.
 *
 * NOTE: Esta migración está preparada para el futuro. Actualmente, las
 * entidades en el código NO tienen estas columnas definidas para no romper
 * la compatibilidad. Cuando decidas aplicar esta migración a la DB, 
 * recuerda agregar @CreateDateColumn y @UpdateDateColumn a las entidades.
 */
export class AddAuditColumns1784219171015 implements MigrationInterface {
  name = 'AddAuditColumns1784219171015';

  private readonly tables = ['users', 'instruments', 'orders', 'marketdata'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT now()`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "updated_at"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "created_at"`,
      );
    }
  }
}
