import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';
import { GoogleAuthService } from '../iam/authentication/social/google-auth.service';
import { GoogleAuthUserFactory } from '../iam/authentication/social/google-auth-user.factory';
import { UserTokens } from '../users/entities';
import { GoogleCalendarSettings } from '../settings/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserTokens, GoogleCalendarSettings]),
  ],
  controllers: [GoogleController],
  providers: [GoogleService, GoogleAuthService, GoogleAuthUserFactory],
})
export class GoogleModule {}
