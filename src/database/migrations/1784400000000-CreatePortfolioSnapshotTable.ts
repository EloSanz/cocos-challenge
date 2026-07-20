import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePortfolioSnapshotTable1784400000000 implements MigrationInterface {
  name = 'CreatePortfolioSnapshotTable1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'portfolio_snapshots',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'userid',
            type: 'integer',
            isUnique: true,
          },
          {
            name: 'lastorderid',
            type: 'integer',
            default: 0,
          },
          {
            name: 'availablecash',
            type: 'numeric',
            precision: 15,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'positions',
            type: 'jsonb',
            default: "'{}'::jsonb",
          },
          {
            name: 'version',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userid'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['userid'],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('portfolio_snapshots');
  }
}
