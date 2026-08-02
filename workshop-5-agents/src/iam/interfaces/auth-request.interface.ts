import { Request } from 'express';
import { REQUEST_USER_KEY } from '../iam.constants';
import { ActiveUserData } from './active-user-data.interface';

export interface AuthRequest extends Request {
  [REQUEST_USER_KEY]?: ActiveUserData;
}
