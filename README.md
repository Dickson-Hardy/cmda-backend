# CMDA Nigeria API

> The backend server code for CMDA Nigeria membership website

## Production background jobs

Set `RABBITMQ_URL` to the TLS RabbitMQ URL supplied by the broker. Run both Procfile process types: `web` serves HTTP/WebSocket traffic and `worker` consumes the durable `cmda.jobs.v1` queue. Failed broker messages are routed to `cmda.jobs.dead.v1`; MongoDB outboxes remain the source of truth during broker outages.

Recommended variables: `RABBITMQ_PREFETCH=10`, `RABBITMQ_HEARTBEAT=30`, `MONGODB_MAX_POOL_SIZE=20`, `MONGODB_MIN_POOL_SIZE=2`, `MONGODB_CONNECT_TIMEOUT_MS=10000`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000`, `MONGODB_SOCKET_TIMEOUT_MS=45000`, `HTTP_REQUEST_TIMEOUT_MS=30000`, `HTTP_HEADERS_TIMEOUT_MS=35000`, and `HTTP_KEEP_ALIVE_TIMEOUT_MS=65000`.

Keep exactly one worker dyno until all legacy cron jobs use unique distributed claims. WebSocket-only transport is enabled, but a shared Socket.IO adapter is still required before adding a second web dyno.

## Core Technologies

- [NestJs](https://github.com/nestjs/nest) - with Typescript and express (default)
- Swagger - for api documentation
- Mongoose / MongoDB for database


## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

### Learn More

For more information about NestJS framework, [read documentation here](https://docs.nestjs.com).


(c) 2024 CMDA Nigeria.
