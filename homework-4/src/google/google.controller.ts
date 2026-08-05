import {
  Get,
  Query,
  Controller,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Auth } from 'googleapis';
import { ActiveUser } from '../iam/decorators';
import { type ActiveUserData } from '../iam/interfaces';
import { GoogleAuthUserFactory } from '../iam/authentication/social/google-auth-user.factory';
import { GoogleService } from './google.service';
import { User } from '../users/entities';
import { EventsQueryDto } from './dto/events-query.dto';

@Controller('/google')
export class GoogleController {
  constructor(
    private readonly googleService: GoogleService,
    private readonly googleAuthUserFactory: GoogleAuthUserFactory,
  ) {}

  @Get('/auth-link')
  getAuthLink(@ActiveUser() user: ActiveUserData) {
    try {
      return this.googleService.getAuthLink(user.sub);
    } catch (e) {
      // todo: create logger
      console.error(e);
      throw new InternalServerErrorException('Failed to get auth link');
    }
  }

  @Get('/calendars')
  async getCalendars(@ActiveUser('sub') userId: User['id']) {
    let googleAuth: Auth.OAuth2Client;

    try {
      googleAuth = await this.googleAuthUserFactory.createForUser(userId);
    } catch {
      throw new ForbiddenException('Please re-authenticate with Google');
    }

    try {
      return this.googleService.getCalendars(googleAuth);
    } catch (e) {
      // todo: create logger
      console.error(e?.response?.data?.error_description);
      throw new InternalServerErrorException('Failed to get calendars');
    }
  }

  @Get('/events')
  async getEvents(
    @ActiveUser('sub') userId: User['id'],
    @Query() queryParams: EventsQueryDto,
  ) {
    let googleAuth: Auth.OAuth2Client;

    try {
      googleAuth = await this.googleAuthUserFactory.createForUser(userId);
    } catch {
      throw new ForbiddenException('Please re-authenticate with Google');
    }

    try {
      return this.googleService.getEvents(userId, googleAuth, queryParams);
    } catch (e) {
      // todo: create logger
      console.error(e?.response?.data?.error_description);
      throw new InternalServerErrorException('Failed to get events');
    }
  }
}
