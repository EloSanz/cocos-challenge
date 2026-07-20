import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProjectionManager } from '../portfolio/impl/projection-manager';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';

async function bootstrap() {
  console.log('🚀 Bootstrapping NestJS Context for Pre-warming Snapshots...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const dataSource = app.get(DataSource);
  const userRepository = dataSource.getRepository(User);
  const projectionManager = app.get(ProjectionManager);

  console.log('🔍 Fetching all users from the database...');
  const users = await userRepository.find({ select: { id: true } });

  console.log(`✅ Found ${users.length} users. Starting snapshot creation...`);

  let count = 0;
  for (const user of users) {
    try {
      // This will do a full scan of their orders (since they don't have a snapshot)
      // and then save the resulting snapshot to the DB.
      await projectionManager.updateSnapshot(user.id);
      count++;
      if (count % 100 === 0) {
        console.log(`⏳ Processed ${count}/${users.length} users...`);
      }
    } catch (error) {
      console.error(`❌ Failed to update snapshot for user ${user.id}:`, error);
    }
  }

  console.log('🎉 Pre-warming complete! Closing application context.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
