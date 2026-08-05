import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { UserTokens } from './user-tokens.entity';
import {
  AISettings,
  JiraSettings,
  GoogleCalendarSettings,
} from '../../settings/entities';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToOne(() => UserTokens, (tokens) => tokens.user)
  tokens: UserTokens;

  @OneToOne(() => GoogleCalendarSettings, (settings) => settings.user)
  googleCalendarSettings: GoogleCalendarSettings;

  @OneToOne(() => AISettings, (settings) => settings.user)
  aiSettings: AISettings;

  @OneToOne(() => JiraSettings, (settings) => settings.user)
  jiraSettings: JiraSettings;
}
