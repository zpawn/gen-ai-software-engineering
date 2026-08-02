import { google, Auth } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserTokens } from '../../../users/entities';
import { GoogleCallbackQueryDto } from './dto';

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

@Injectable()
export class GoogleAuthService {
  private oauthClient: Auth.OAuth2Client;

  constructor(
    private configService: ConfigService,

    @InjectRepository(UserTokens)
    private readonly userTokensRepository: Repository<UserTokens>,
  ) {
    const googleConfig = this.configService.get<GoogleConfig>('google')!;

    this.oauthClient = new google.auth.OAuth2({
      clientId: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      redirectUri: googleConfig.redirectUri,
    });
  }

  getOAuthClient() {
    return this.oauthClient;
  }

  async generateAuthUrl(userId: User['id'], state: string): Promise<string> {
    const googleConfig = this.configService.get<GoogleConfig>('google')!;

    await this.userTokensRepository.upsert(
      { user: { id: userId }, googleState: state },
      ['user.id'],
    );

    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: googleConfig.scopes,
      state,
    });
  }

  async callback(query: GoogleCallbackQueryDto) {
    try {
      const { state, code } = query;

      if (!state || !code) return;

      const userTokens = await this.userTokensRepository.findOneBy({
        googleState: state,
      });

      if (!userTokens) return;

      const { tokens } = await this.oauthClient.getToken(code);

      await this.userTokensRepository.update(userTokens.id, {
        googleAccessToken: tokens?.access_token || '',
        googleRefreshToken: tokens?.refresh_token || '',
        googleState: '',
      });
    } catch {
      // todo: log this error
    }
  }

  async setCredentials(userId: User['id']) {
    const userTokens = await this.userTokensRepository.findOneBy({
      user: { id: userId },
    });

    if (!userTokens?.googleAccessToken || !userTokens?.googleRefreshToken) {
      throw new Error('No google credentials found');
    }

    this.oauthClient.setCredentials({
      access_token: userTokens.googleAccessToken,
      refresh_token: userTokens.googleRefreshToken,
    });
  }
}
