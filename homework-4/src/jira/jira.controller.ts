import { Post, Body, Controller } from '@nestjs/common';
import { ActiveUser } from '../iam/decorators';
import { User } from '../users/entities';
import { JiraService } from './jira.service';
import { WorkLogDto } from './dto';

@Controller('/jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('/worklog')
  syncWorkLog(
    @ActiveUser('sub') userId: User['id'],
    @Body() worklog: WorkLogDto,
  ) {
    return this.jiraService.syncWorkLog(userId, worklog);
  }
}
