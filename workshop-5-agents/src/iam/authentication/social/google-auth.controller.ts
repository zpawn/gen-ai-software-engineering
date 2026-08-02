import { Get, Query, Controller } from '@nestjs/common';
import { Auth } from '../decorators/auth.decorator';
import { AuthType } from '../enums/auth-type.enum';
import { GoogleAuthService } from './google-auth.service';
import { GoogleCallbackQueryDto } from './dto';

@Controller('/auth/google')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Auth(AuthType.None)
  @Get('/callback')
  callback(@Query() query: GoogleCallbackQueryDto) {
    return this.googleAuthService.callback(query);
  }
}
