import { AdminRole } from '../admin/admin.constant';
import { UserRole } from './user.constant';
import { UsersService } from './users.service';

describe('UsersService contact privacy', () => {
  const profile = {
    _id: { toString: () => 'member-2' },
    fullName: 'Ada Member',
    email: 'ada@example.com',
    phone: '+2348000000000',
    membershipId: 'CM0002',
  };
  const userModel = {
    findById: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(profile) })),
  } as any;
  const service = new UsersService(userModel, null, null, null, null);

  const requester = (id: string, role: UserRole | AdminRole) =>
    ({ id, role } as any);

  beforeEach(() => jest.clearAllMocks());

  it('omits email and phone when a member views another member', async () => {
    const response = await service.findOne('member-2', requester('member-1', UserRole.DOCTOR));

    expect(response.data).not.toHaveProperty('email');
    expect(response.data).not.toHaveProperty('phone');
    expect(response.data).toMatchObject({ fullName: 'Ada Member', membershipId: 'CM0002' });
  });

  it('keeps contact details in the member own profile', async () => {
    const response = await service.findOne('member-2', requester('member-2', UserRole.DOCTOR));

    expect(response.data).toMatchObject({
      email: 'ada@example.com',
      phone: '+2348000000000',
    });
  });

  it('keeps contact details available to authorized administrators', async () => {
    const response = await service.findOne(
      'member-2',
      requester('admin-1', AdminRole.MEMBER_MANAGER),
    );

    expect(response.data).toMatchObject({
      email: 'ada@example.com',
      phone: '+2348000000000',
    });
  });
});
