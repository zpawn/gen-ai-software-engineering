import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities';
import { SummaryLevel } from '../types';

@Entity('ai_settings')
export class AISettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  provider: string;

  @Column({ nullable: true })
  llm: string;

  @Column({ type: 'text', nullable: true })
  fineTuning: string;

  @Column({
    type: 'enum',
    enum: SummaryLevel,
    default: SummaryLevel.MEDIUM,
    nullable: false,
  })
  summaryLevel: SummaryLevel;

  @OneToOne(() => User, (user) => user.aiSettings, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
