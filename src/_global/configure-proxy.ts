import { NestExpressApplication } from '@nestjs/platform-express';

export function configureProxy(app: Pick<NestExpressApplication, 'set'>, onHeroku = Boolean(process.env.DYNO)) {
  // Heroku appends the connecting client's IP at the right of X-Forwarded-For.
  // Trust only that immediate router hop, not arbitrary caller-supplied prefixes.
  // This keeps per-client throttling from grouping everyone under a router IP.
  if (onHeroku) app.set('trust proxy', 1);
}
