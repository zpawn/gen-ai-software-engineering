import * as Joi from 'joi';
import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RootController } from './root/root.controller';
import { SettingsModule } from './settings/settings.module';
import { GoogleModule } from './google/google.module';
import { AiModule } from './ai/ai.module';
import { JiraModule } from './jira/jira.module';
import { UsersModule } from './users/users.module';
import {
  aiConfig,
  dbConfig,
  appConfig,
  googleConfig,
} from './config/app.config';
import { IamModule } from './iam/iam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, dbConfig, aiConfig, googleConfig],
      validationSchema: Joi.object({
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),
        DATABASE_URL: Joi.string().optional(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        autoLoadEntities: true,
        synchronize: true,
        ...configService.get<TypeOrmModuleAsyncOptions>('db'),
      }),
    }),
    GoogleModule,
    SettingsModule,
    AiModule,
    JiraModule,
    UsersModule,
    IamModule,
  ],
  providers: [],
  controllers: [RootController],
})
export class AppModule {}
