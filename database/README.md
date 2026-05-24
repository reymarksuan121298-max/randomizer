# Database Schema

This folder defines a backend-ready PostgreSQL schema for the Randomizer app.

All table `id` columns use PostgreSQL auto-incrementing identity columns:
`BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.

## Auth And Login

- `users` stores login identity, role, status, and password hash.
- `user_sessions` stores hashed refresh tokens for persistent login.
- `login_events` records successful and failed login attempts for audit and lockout workflows.

Frontend localStorage key `user` should eventually be replaced by an authenticated API session backed by `users` and `user_sessions`.

## App Data Mapping

- `companies` maps to the current `companies` localStorage collection.
- `game_types` maps to configured game type records used by the app.
- `batches` maps to the `batches` localStorage collection. The app-generated batch identifier should be stored in `batches.batch_code`; `batches.id` is the auto-incrementing database key.
- `booklets`, `booklet_sheets`, `tickets`, and `number_bets` map to each generated `batch_data_{id}` payload.
- `winning_numbers` stores draw results used in the workbook summary and booklet headers.
- `prize_payouts` stores winner rows used by the Alpha List workbook sheets.
- `export_files` can track generated Excel exports, including Summary, All Tickets, Booklet, Alpha List, DSR, SOD, and matrix reports.

## Workbook Mapping

The analyzed workbook structure maps as follows:

- `Summary`: `batches`, `winning_numbers`, aggregated `number_bets`, and `prize_payouts`.
- `All Tickets`: `booklets`, `booklet_sheets`, `tickets`, `number_bets`, and payout flags.
- `Booklet N`: one `booklets` row with its related `booklet_sheets`, `tickets`, and `number_bets`.
- `Alpha List Booklet N`: `prize_payouts` joined through `number_bets`, `tickets`, `booklets`, and `game_types`.

## Suggested First User

Create application users through Supabase Auth, then link them to rows in `users`.

```sql
-- See lanao-norte-manager.sql for the Lanao del Norte manager setup.
```

For the Lanao del Norte manager, run `database/lanao-norte-manager.sql` in the Supabase SQL editor after replacing `<TEMP_PASSWORD>` with the temporary password you want to issue.
