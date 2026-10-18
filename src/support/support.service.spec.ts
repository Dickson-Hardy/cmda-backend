import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupportService } from './support.service';
import { v2 as cloudinary } from 'cloudinary';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSupportDto, SupportQueryDto, UpdateSupportDto } from './support.dto';

const token = 'a'.repeat(64);
const dto: CreateSupportDto = {
  submissionId: '300f9763-5f4e-4b58-b165-3e665ba2c6f9',
  accessToken: token,
  kind: 'complaint',
  category: 'technical',
  name: 'Test Member',
  email: 'member@example.test',
  subject: 'Cannot update profile',
  message: 'My profile changes are not being saved.',
  source: 'cmdanigeria.org',
};
const ticket = {
  _id: '507f1f77bcf86cd799439011',
  reference: 'CMDA-ABC',
  tokenHash: '',
  revision: 0,
  ...dto,
  status: 'open',
  messages: [
    { messageId: dto.submissionId, author: 'member', message: dto.message, createdAt: new Date() },
  ],
};

describe('SupportService', () => {
  let service: SupportService;
  let model: any;
  let email: any;
  beforeEach(() => {
    model = {
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue(ticket),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    email = { sendEmail: jest.fn().mockResolvedValue({ success: true }) };
    service = new SupportService(model, email);
  });
  afterEach(() => jest.restoreAllMocks());
  it('stores valid screenshots as private authenticated images', async () => {
    model.findOne.mockResolvedValue(ticket);
    model.findOneAndUpdate.mockResolvedValue(ticket);
    const upload = jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(((options, callback) => ({ end: () => callback(null, { public_id: options.public_id }) })) as any);
    await service.upload(ticket.reference, token, { buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), size: 8, mimetype: 'image/png' } as any);
    expect(upload.mock.calls[0][0]).toEqual(expect.objectContaining({ type: 'authenticated', resource_type: 'image', format: 'png' }));
    expect(model.findOneAndUpdate.mock.calls[0][0]).toEqual(expect.objectContaining({ attachmentId: { $exists: false } }));
  });
  it('generates only short-lived private download links for admins', async () => {
    model.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ attachmentId: 'private-image' }) });
    const download = jest.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue('https://example.test/private');
    await service.attachment(ticket._id);
    expect(download.mock.calls[0][2]).toEqual(expect.objectContaining({ type: 'authenticated', expires_at: expect.any(Number) }));
    expect(download.mock.calls[0][2].expires_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 300);
  });
  it('creates a private ticket and an acknowledgement link, not a payment credit', async () => {
    model.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const result = await service.create(dto);
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cmdanigeria.org', tokenHash: service.hash(token) }),
    );
    expect(model.create.mock.calls[0][0]).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('tokenHash');
    expect(result).not.toHaveProperty('email');
    expect(result.emailSent).toBe(true);
    expect(email.sendEmail.mock.calls[0][0].html).toContain(`/support#CMDA-ABC:${token}`);
  });
  it('keeps a saved ticket successful when email fails', async () => {
    model.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    email.sendEmail.mockRejectedValue(new Error('mail offline'));
    expect((await service.create(dto)).emailSent).toBe(false);
  });
  it('retries a submission without creating or emailing twice', async () => {
    model.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ ...ticket, tokenHash: service.hash(token) }),
    });
    expect((await service.create(dto)).duplicate).toBe(true);
    expect(model.create).not.toHaveBeenCalled();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
  it('does not disclose an existing ticket to a different token', async () => {
    model.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ ...ticket, tokenHash: 'different' }),
    });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });
  it('requires a private access token to track tickets', async () => {
    await expect(service.track('CMDA-ABC', '')).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOne).not.toHaveBeenCalled();
  });
  it('uses the token hash in the ownership lookup and hides admin-only fields', async () => {
    model.findOne.mockResolvedValue({
      ...ticket,
      assignedTo: 'admin',
      history: ['private'],
      email: 'private@test.test',
    });
    const data = await service.track('CMDA-ABC', token);
    expect(model.findOne).toHaveBeenCalledWith({
      reference: 'CMDA-ABC',
      tokenHash: service.hash(token),
    });
    expect(data).not.toHaveProperty('history');
    expect(data).not.toHaveProperty('assignedTo');
  });
  it('rejects stale admin changes rather than overwriting another review', async () => {
    model.findOneAndUpdate.mockResolvedValue(null);
    await expect(
      service.update(ticket._id, 'admin', { status: 'resolved', assignment: 'me', version: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(model.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: ticket._id, revision: 0 });
  });
  it('keeps retries of an existing reply idempotent', async () => {
    model.findOne.mockResolvedValue(ticket);
    await service.reply(
      ticket.reference,
      { messageId: dto.submissionId, message: 'Retry', version: 0 },
      undefined,
      token,
    );
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('reopens a conversation when the member replies', async () => {
    model.findOne.mockResolvedValue(ticket);
    model.findOneAndUpdate.mockResolvedValue(ticket);
    await service.reply(
      ticket.reference,
      { messageId: 'new-reply', message: 'Still not working', version: 0 },
      undefined,
      token,
    );
    expect(model.findOneAndUpdate.mock.calls[0][1].$set.status).toBe('open');
    expect(model.findOneAndUpdate.mock.calls[0][1].$push.messages.author).toBe('member');
  });
  it('rejects disguised screenshot files before sending to storage', async () => {
    model.findOne.mockResolvedValue(ticket);
    await expect(
      service.upload(ticket.reference, token, {
        buffer: Buffer.from('<script>'),
        mimetype: 'image/png',
        size: 8,
      } as any),
    ).rejects.toThrow('JPEG or PNG');
  });
  it('escapes search regex and applies pagination and filters', async () => {
    const chain: any = {};
    for (const method of ['select', 'populate', 'sort', 'skip', 'limit'])
      chain[method] = jest.fn().mockReturnValue(chain);
    chain.lean = jest.fn().mockResolvedValue([]);
    model.find.mockReturnValue(chain);
    model.countDocuments.mockResolvedValue(31);
    const data = await service.list({
      page: 2,
      limit: 15,
      kind: 'feedback',
      source: 'cmdanigeria.org',
      search: 'a.*',
    });
    expect(chain.skip).toHaveBeenCalledWith(15);
    expect(chain.limit).toHaveBeenCalledWith(15);
    expect(model.find.mock.calls[0][0].$or[0].reference.$regex).toBe('a\\.\\*');
    expect(data.meta.totalPages).toBe(3);
  });
  it('escapes user-supplied names in email HTML', async () => {
    model.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    model.create.mockResolvedValue({ ...ticket, name: '<img src=x>' });
    await service.create(dto);
    expect(email.sendEmail.mock.calls[0][0].html).toContain('&lt;img src=x&gt;');
  });
});

describe('Support validation', () => {
  it('accepts both supported websites', async () => {
    for (const source of ['cmdanigeria.org', 'cmdanigeria.net'])
      expect(await validate(plainToInstance(CreateSupportDto, { ...dto, source }))).toHaveLength(0);
  });
  it('rejects honeypots, missing tokens and unbounded text', async () => {
    for (const change of [
      { website: 'spam' },
      { accessToken: '' },
      { message: 'x'.repeat(5001) },
      { source: 'evil.test' },
    ])
      expect(
        (await validate(plainToInstance(CreateSupportDto, { ...dto, ...change }))).length,
      ).toBeGreaterThan(0);
  });
  it('rejects invalid page sizes and assignment or status changes', async () => {
    expect(
      (await validate(plainToInstance(SupportQueryDto, { page: -1, limit: 10000 }))).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(UpdateSupportDto, { status: 'paid', assignment: 'someone', version: -1 }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
