# Prisma migrations

This project now uses Prisma Migrate. Do **not** reset `prisma/dev.db` to apply the baseline.

## Development (existing database)

The current SQLite file was baseline-marked as having `20260921100000_init`.

```bash
npx prisma migrate status
npx prisma generate
```

Future schema edits:

```bash
npx prisma migrate dev --name describe_the_change
```

Do not use `prisma db push` for schema changes after this baseline.

## Fresh install

```bash
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run db:import
npm run db:import:griffith
```

`migrate deploy` applies SQL from `prisma/migrations/`. It does not seed the Rigveda; run the importers.

## Future production database

Set `DATABASE_URL` to the production database.

```bash
npx prisma migrate deploy
npx prisma generate
COMMERCIAL_BUILD=true npm run db:validate
```

`COMMERCIAL_BUILD=true` fails while the preferred Sanskrit witness is GRETIL (CC BY-NC-SA). Development continues to use GRETIL unless that flag is set.
