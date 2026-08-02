import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_tokens')
export class UserTokens {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  refreshTokenId: string;

  @Column({ nullable: true })
  googleAccessToken: string;

  @Column({ nullable: true })
  googleRefreshToken: string;

  @Column({ nullable: true })
  googleState: string;

  @OneToOne(() => User, (user) => user.tokens, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
