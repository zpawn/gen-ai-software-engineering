import { Controller, Get } from '@nestjs/common';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';

@Controller('')
export class RootController {
  @Auth(AuthType.None)
  @Get('/ping')
  ping() {
    return 'pong';
  }
}
