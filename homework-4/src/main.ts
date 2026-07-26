import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL,
    credentials: true,
  });
  app.setGlobalPrefix('api/v2');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove all fields that are not in the DTO
      forbidNonWhitelisted: false, // throw an error if there is a non-whitelisted field
      transform: true, // transform the data to the type of the DTO
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
