import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities';
import { JiraAuthType } from '../settings.constants';

@Entity('jira_settings')
export class JiraSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: JiraAuthType,
    nullable: false,
    default: JiraAuthType.BEARER,
  })
  authType: JiraAuthType;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  issueKey: string;

  @Column({ nullable: true })
  url: string;

  @OneToOne(() => User, (user) => user.jiraSettings, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
