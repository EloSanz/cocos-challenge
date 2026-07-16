import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes `orders (userId, status)`.
 *
 * Both the portfolio and the order funds check scan every FILLED order of a
 * user (WHERE userId = ? AND status = 'FILLED'). Without this index that is a
 * full table scan and the first bottleneck on a large `orders` table.
 *
 * NOTE: TypeORM wraps each migration in a transaction, so a plain CREATE INDEX
 * is used here. On a large live table, build it with CREATE INDEX CONCURRENTLY
 * outside a transaction instead (avoids locking writes during the build).
 */
export class AddOrdersUserStatusIndex1752000000000 implements MigrationInterface {
  name = 'AddOrdersUserStatusIndex1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_orders_user_status" ON "orders" ("userid", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_status"`);
  }
}
