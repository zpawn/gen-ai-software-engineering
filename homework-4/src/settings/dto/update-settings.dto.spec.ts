import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSettingsDto } from './update-settings.dto';
import { JiraAuthType } from '../settings.constants';

describe('settings', () => {
  describe('dto', () => {
    describe('UpdateSettingsDto', () => {
      // BUG-001, T-003: omitting aiModel/aiProvider/aiFineTuning/googleCalendars
      // must not produce validation errors now that @IsOptional() is present.
      it('passes validation when aiModel, aiProvider, aiFineTuning, and googleCalendars are omitted (T-003)', async () => {
        const dto = plainToInstance(UpdateSettingsDto, {
          jiraAuthType: JiraAuthType.BEARER,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      // BUG-001, T-004: an invalid *present* value must still fail validation
      // for each of the four fields covered by the fix.
      it('fails validation when aiModel is present but not a string (T-004)', async () => {
        const dto = plainToInstance(UpdateSettingsDto, {
          jiraAuthType: JiraAuthType.BEARER,
          aiModel: 12345,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === 'aiModel')).toBe(
          true,
        );
      });

      it('fails validation when aiProvider is present but not a string (T-004)', async () => {
        const dto = plainToInstance(UpdateSettingsDto, {
          jiraAuthType: JiraAuthType.BEARER,
          aiProvider: 12345,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === 'aiProvider')).toBe(
          true,
        );
      });

      it('fails validation when aiFineTuning is present but not a string (T-004)', async () => {
        const dto = plainToInstance(UpdateSettingsDto, {
          jiraAuthType: JiraAuthType.BEARER,
          aiFineTuning: 12345,
        });

        const errors = await validate(dto);

        expect(
          errors.some((error) => error.property === 'aiFineTuning'),
        ).toBe(true);
      });

      it('fails validation when googleCalendars contains a non-string element (T-004)', async () => {
        const dto = plainToInstance(UpdateSettingsDto, {
          jiraAuthType: JiraAuthType.BEARER,
          googleCalendars: ['calendar-1', 42],
        });

        const errors = await validate(dto);

        expect(
          errors.some((error) => error.property === 'googleCalendars'),
        ).toBe(true);
      });

      it('passes validation when googleCalendars is an explicit empty array (T-003)', async () => {
        const dto = plainToInstance(UpdateSettingsDto, {
          jiraAuthType: JiraAuthType.BEARER,
          googleCalendars: [],
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });
    });
  });
});
