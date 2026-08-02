import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities';

@Entity('google_calendar_settings')
export class GoogleCalendarSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'simple-array', nullable: true })
  calendarIds: string[];

  @OneToOne(() => User, (user) => user.googleCalendarSettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;
}
