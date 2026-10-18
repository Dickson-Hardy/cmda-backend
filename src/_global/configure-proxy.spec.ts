import * as express from 'express';
import * as request from 'supertest';
import { configureProxy } from './configure-proxy';

describe('Heroku rate-limit client addressing', () => {
  it('trusts only the last router-added address, not a spoofed prefix', async () => {
    const app = express(); configureProxy(app as any, true);
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    const response = await request(app).get('/').set('X-Forwarded-For', '203.0.113.99, 198.51.100.10');
    expect(response.body.ip).toBe('198.51.100.10');
  });
  it('does not trust forwarded addresses on ordinary local servers', async () => {
    const app = express(); configureProxy(app as any, false);
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    const response = await request(app).get('/').set('X-Forwarded-For', '198.51.100.10');
    expect(response.body.ip).not.toBe('198.51.100.10');
  });
});
