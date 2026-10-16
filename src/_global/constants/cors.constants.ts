export const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4040',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4175',
  'http://127.0.0.1:4175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://cmdanigeria.net',
  'https://www.cmdanigeria.net',
  'https://admin.cmdanigeria.net',
];

export const SOCKET_IO_CORS = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
};
