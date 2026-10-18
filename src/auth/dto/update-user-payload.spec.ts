import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateUserDto } from './update-user.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});

const run = (payload: any) =>
  pipe.transform(payload, { type: 'body', metatype: UpdateUserDto });

describe('UpdateUserDto - full web EditProfile payload', () => {
  it('doctor/global payload', async () => {
    const payload = {
      firstName: 'Ada',
      middleName: '',
      lastName: 'Obi',
      phone: '08031234567',
      gender: 'Male',
      dateOfBirth: '1990-05-12',
      bio: 'A doctor',
      leadershipPosition: '',
      socials: { facebook: 'https://facebook.com/x' },
      region: 'UK/Europe region',
      licenseNumber: 'LIC1',
      specialty: 'Cardiology',
      yearsOfExperience: '0 - 5 Years',
    };
    await expect(run(payload)).resolves.toBeTruthy();
  });

  it('student payload', async () => {
    const payload = {
      firstName: 'Ada',
      middleName: '',
      lastName: 'Obi',
      phone: '08031234567',
      gender: 'Female',
      dateOfBirth: '2005-05-12',
      bio: '',
      leadershipPosition: '',
      socials: {},
      region: 'ABUTH',
      admissionYear: '2023',
      yearOfStudy: '3rd Year',
    };
    await expect(run(payload)).resolves.toBeTruthy();
  });

  it('empty optional strings (dateOfBirth blank)', async () => {
    await expect(run({ dateOfBirth: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('empty gender', async () => {
    await expect(run({ gender: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('empty region', async () => {
    await expect(run({ region: '' })).resolves.toBeTruthy();
  });

  it('incomeBracket not sent by web form is fine', async () => {
    await expect(run({ firstName: 'Ada', bio: 'x', leadershipPosition: 'y', socials: {} })).resolves.toBeTruthy();
  });

  it('socials object survives whitelist', async () => {
    const out: any = await run({ socials: { facebook: 'url' } });
    expect(out.socials).toEqual({ facebook: 'url' });
  });

  it('socials as JSON string', async () => {
    const out: any = await run({ socials: '{"twitter":"url"}' });
    expect(out.socials).toEqual('{"twitter":"url"}');
  });
});
