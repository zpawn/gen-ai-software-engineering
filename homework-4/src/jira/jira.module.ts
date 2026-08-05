import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JiraSettings } from '../settings/entities';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';

@Module({
  imports: [TypeOrmModule.forFeature([JiraSettings])],
  controllers: [JiraController],
  providers: [JiraService],
})
export class JiraModule {}
