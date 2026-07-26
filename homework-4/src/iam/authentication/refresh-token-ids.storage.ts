import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTokens } from '../../users/entities';

@Injectable()
export class RefreshTokenIdsStorage {
  constructor(
    @InjectRepository(UserTokens)
    private readonly refreshTokenRepository: Repository<UserTokens>,
  ) {}

  async insert(userId: number, refreshTokenId: string): Promise<void> {
    await this.refreshTokenRepository.upsert(
      { user: { id: userId }, refreshTokenId },
      ['user.id'],
    );
  }

  async validate(userId: number, refreshTokenId: string): Promise<boolean> {
    const token = await this.refreshTokenRepository.findOneBy({
      user: { id: userId },
    });
    return refreshTokenId === token?.refreshTokenId;
  }

  async invalidate(userId: number): Promise<void> {
    await this.refreshTokenRepository.delete({ user: { id: userId } });
  }
}
