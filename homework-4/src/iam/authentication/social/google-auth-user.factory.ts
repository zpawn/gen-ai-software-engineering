import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Auth } from 'googleapis';
import { Repository } from 'typeorm';
import { User, UserTokens } from '../../../users/entities';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleAuthUserFactory {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserTokens)
    private readonly userTokensRepository: Repository<UserTokens>,
  ) {}

  async createForUser(userId: User['id']): Promise<Auth.OAuth2Client> {
    const googleAuthService = new GoogleAuthService(
      this.configService,
      this.userTokensRepository,
    );

    await googleAuthService.setCredentials(userId);

    return googleAuthService.getOAuthClient();
  }
}
