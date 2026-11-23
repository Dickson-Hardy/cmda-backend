import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from './users.service';

@Public()
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async unsubscribe(@Query('token') token: string, @Res() res: Response): Promise<void> {
    // Always return the same generic confirmation so we never reveal whether
    // an address exists or whether a token was valid/expired.
    const accepted = await this.usersService.unsubscribeByToken(token);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email preferences - CMDA Nigeria</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f6f6; margin: 0; padding: 40px 16px; color: #333; }
    .card { max-width: 520px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 8px; text-align: center; }
    h1 { color: #994279; font-size: 20px; }
    p { font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Email preferences updated</h1>
    <p>${accepted
      ? 'You will no longer receive marketing emails from CMDA Nigeria.'
      : 'Your request has been received. If you have an account, your preferences have been updated.'}</p>
    <p>You can change your preferences at any time from your dashboard.</p>
  </div>
</body>
</html>`);
  }
}
