

## Database Migration Documentation

I'll create a comprehensive documentation file that describes your entire database architecture, making it possible for any database engineer to recreate it on a different platform.

---

### File to Create

**File:** `DATABASE_DOCUMENTATION.md`

This markdown file will include:

---

### 1. Executive Summary
- Overview of the portfolio management application
- Core functionality: asset tracking, FX rates, snapshots, session-based authentication
- Technology stack: PostgreSQL (via Supabase), with custom session management

---

### 2. Database Tables (9 tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `assets` | Main portfolio holdings | name, class, sub_class, quantity, price, account info |
| `fx_rates` | Exchange rates (7 currencies) | currency, to_usd_rate, to_ils_rate |
| `portfolio_snapshots` | Historical snapshots | assets (JSON), fx_rates (JSON), calculated totals |
| `sessions` | Session-based authentication | session_token, expires_at |
| `app_config` | Application password storage | password |
| `account_update_tracker` | Track when accounts were updated | entity/bank combo, last_updated |
| `asset_liquidation_settings` | Liquidation year per asset | asset_name, liquidation_year |
| `limited_liquidity_assets` | Assets marked as illiquid | asset_name |
| `pending_assets` | Assets awaiting addition | name, asset_class, value_usd |

For each table I'll document:
- All columns with data types
- Constraints (CHECK, UNIQUE, NOT NULL)
- Default values
- Indexes
- Foreign keys (none currently - all tables are standalone)

---

### 3. Check Constraints (Business Logic in DB)

**Assets table constraints:**
- `class` must be one of: Public Equity, Private Equity, Fixed Income, Cash, Commodities & more, Real Estate
- `sub_class` must match the class (e.g., Cash requires currency subclass)
- `origin_currency` must be: ILS, USD, CHF, EUR, CAD, HKD, GBP
- `account_bank` must be in allowed list
- `factor` must be between 0 and 1 (for Private Equity)

---

### 4. Database Functions (5 functions)

| Function | Purpose |
|----------|---------|
| `is_authorized()` | Validates session token from HTTP headers |
| `set_session_token(token)` | Sets session config for transaction |
| `cleanup_expired_sessions()` | Removes expired sessions |
| `get_config(name)` | Gets PostgreSQL config values |
| `update_updated_at_column()` | Trigger function for timestamps |

---

### 5. Row-Level Security (RLS) Policies

All tables use session-based authorization via `is_authorized()` function:
- Most tables: Single `FOR ALL` policy checking `is_authorized()`
- `fx_rates`: Public SELECT, authorized INSERT/UPDATE, no DELETE
- `pending_assets`: Separate policies for SELECT/INSERT/UPDATE/DELETE

---

### 6. Triggers (9 triggers)

Every table has an `update_<table>_updated_at` trigger that auto-updates the `updated_at` column before UPDATE operations.

---

### 7. Scheduled Jobs (Cron)

| Job | Schedule | Action |
|-----|----------|--------|
| `daily-stock-price-update` | 6:00 AM UTC | Calls `scheduled-stock-price-update` edge function |
| `daily-fx-rate-update` | 6:00 AM UTC | Calls `update-fx-rates` edge function |

---

### 8. Edge Functions (4 functions)

| Function | Purpose | External APIs |
|----------|---------|---------------|
| `validate-password` | Password auth, creates sessions | None |
| `update-fx-rates` | Fetches FX rates, writes to DB | exchangerate.host |
| `update-stock-prices` | Returns prices for given tickers | MarketStack, Polygon |
| `scheduled-stock-price-update` | Auto-updates all asset prices | MarketStack, Polygon |

---

### 9. Application Data Access Patterns

**React Hooks → Database Operations:**

| Hook | Table(s) | Operations |
|------|----------|------------|
| `useAssets` | assets | SELECT, INSERT, UPDATE, DELETE |
| `useFXRates` | fx_rates | SELECT, UPSERT |
| `usePendingAssets` | pending_assets | SELECT, INSERT, UPDATE, DELETE |
| `usePortfolioSnapshots` | portfolio_snapshots | INSERT |
| `useAccountUpdateTracker` | account_update_tracker | SELECT, UPSERT, UPDATE |
| `useLimitedLiquidityAssets` | limited_liquidity_assets | SELECT, INSERT, DELETE |
| `useAssetLiquidationSettings` | asset_liquidation_settings | SELECT, UPSERT, DELETE |
| `useStockPrices` | assets (via callback) | UPDATE (prices) |

---

### 10. Required Secrets/Environment Variables

| Secret | Purpose |
|--------|---------|
| `EXCHANGE_RATE_API_KEY` | exchangerate.host API |
| `MARKETSTACK_API_KEY` | MarketStack stock prices |
| `POLYGON_API_KEY` | Polygon options prices |
| `SUPABASE_URL` | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided (edge functions) |

---

### 11. Migration Considerations

Key Supabase-specific features to replicate:
- `gen_random_uuid()` → Use equivalent UUID generation
- RLS → Implement at application layer or use alternative
- PostgREST headers (`request.headers`) → Custom middleware needed
- Edge functions → Convert to your serverless platform (AWS Lambda, Cloudflare Workers, etc.)
- `pg_cron` + `pg_net` → Use external scheduler (cron, AWS EventBridge)

---

### 12. Complete SQL Schema

The document will include the complete DDL to recreate all tables, constraints, indexes, functions, triggers, and RLS policies as executable SQL.

