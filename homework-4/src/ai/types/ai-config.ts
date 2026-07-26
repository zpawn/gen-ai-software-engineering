import { ConfigType } from '@nestjs/config';
import { aiConfig } from '../../config/app.config';

export type AIConfig = ConfigType<typeof aiConfig>;
