import { Get, Post, Body, Controller } from '@nestjs/common';
import { ActiveUser } from '../iam/decorators/active-user.decorators';
import { type ActiveUserData } from '../iam/interfaces';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto, ResponseSettingsDto } from './dto';

@Controller('/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}
  @Get()
  getSettings(
    @ActiveUser() user: ActiveUserData,
  ): Promise<ResponseSettingsDto> {
    return this.settingsService.getUserSettings(user.sub);
  }

  @Post()
  updateSettings(
    @ActiveUser() user: ActiveUserData,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateUserSettings(user.sub, updateSettingsDto);
  }
}
