import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MemberCategory, UserGender, UserRole } from '../../users/user.constant';
import { CreateMemberByAdminDto } from './create-member-by-admin.dto';

describe('CreateMemberByAdminDto', () => {
  it('accepts a Global Network member without a date of birth', async () => {
    const dto = plainToInstance(CreateMemberByAdminDto, {
      firstName: 'Ada',
      lastName: 'Member',
      email: 'ada@example.com',
      gender: UserGender.FEMALE,
      role: UserRole.GLOBALNETWORK,
      region: 'Global Americas',
      memberCategory: MemberCategory.GLOBAL_AMERICAS,
      dateOfBirth: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.dateOfBirth).toBeUndefined();
  });
});
