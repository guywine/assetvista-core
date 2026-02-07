# Database Migration Documentation

> **Purpose**: This document provides complete documentation of the database architecture for the Portfolio Management Application. Any database engineer can use this to recreate the database on any PostgreSQL-compatible platform.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Database Tables](#2-database-tables)
3. [Check Constraints](#3-check-constraints)
4. [Database Functions](#4-database-functions)
5. [Row-Level Security (RLS) Policies](#5-row-level-security-rls-policies)
6. [Triggers](#6-triggers)
7. [Scheduled Jobs](#7-scheduled-jobs)
8. [Edge Functions / Serverless Functions](#8-edge-functions--serverless-functions)
9. [Application Data Access Patterns](#9-application-data-access-patterns)
10. [Required Secrets / Environment Variables](#10-required-secrets--environment-variables)
11. [Migration Considerations](#11-migration-considerations)
12. [Complete SQL Schema](#12-complete-sql-schema)

---

## 1. Executive Summary

### Application Overview
A portfolio management application for tracking personal/family investment holdings across multiple entities, banks, and asset classes.

### Core Functionality
- **Asset Tracking**: Manage holdings across Public Equity, Private Equity, Fixed Income, Cash, Commodities, and Real Estate
- **Multi-Currency Support**: 7 currencies (USD, ILS, EUR, CHF, CAD, HKD, GBP) with automatic FX rate updates
- **Portfolio Snapshots**: Save historical portfolio states for comparison
- **Session-Based Authentication**: Password-protected access using database-stored sessions
- **Automatic Price Updates**: Scheduled updates for stock/option prices and FX rates
- **Liquidity Tracking**: Mark assets as limited liquidity with liquidation year planning

### Technology Stack
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Custom session-based (not Supabase Auth)
- **API Layer**: Supabase PostgREST (auto-generated REST API)
- **Serverless Functions**: Supabase Edge Functions (Deno runtime)
- **Scheduling**: pg_cron extension
- **Frontend**: React/TypeScript with Supabase JS client

---

## 2. Database Tables

### 2.1 `assets` - Main Portfolio Holdings

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Asset name/ticker description |
| `class` | text | No | - | Asset class (see constraints) |
| `sub_class` | text | No | - | Asset sub-class (see constraints) |
| `isin` | text | Yes | NULL | Ticker symbol for price updates |
| `account_entity` | text | No | - | Entity owner (Roy, Roni, Guy, etc.) |
| `account_bank` | text | No | - | Bank/broker holding the asset |
| `beneficiary` | text | No | `'Kids'` | Beneficiary (Kids, Inheritance) |
| `origin_currency` | text | No | - | Original currency of the asset |
| `quantity` | numeric | No | - | Number of units held |
| `price` | numeric | No | - | Price per unit in origin currency |
| `factor` | numeric | Yes | NULL | 0-1 multiplier for Private Equity |
| `maturity_date` | text | Yes | NULL | Maturity date for bonds |
| `ytw` | numeric | Yes | NULL | Yield to worst for bonds |
| `pe_company_value` | numeric | Yes | NULL | Total company value for PE |
| `pe_holding_percentage` | numeric | Yes | NULL | Ownership % for PE |
| `is_cash_equivalent` | boolean | No | `false` | Auto-calculated cash equivalent flag |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

---

### 2.2 `fx_rates` - Exchange Rates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `currency` | text | No | - | Currency code (UNIQUE) |
| `to_usd_rate` | numeric | No | `0` | Conversion rate to USD |
| `to_ils_rate` | numeric | No | `0` | Conversion rate to ILS |
| `last_updated` | timestamptz | No | `now()` | Last rate update time |
| `source` | text | No | `'api'` | Source: 'api' or 'manual' |
| `is_manual_override` | boolean | No | `false` | Manual override flag |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Unique Constraint**: `currency` column

---

### 2.3 `portfolio_snapshots` - Historical Snapshots

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Snapshot name |
| `description` | text | Yes | NULL | Optional description |
| `snapshot_date` | date | No | `CURRENT_DATE` | Date of snapshot |
| `assets` | jsonb | No | `'[]'::jsonb` | Full asset array as JSON |
| `fx_rates` | jsonb | No | `'{}'::jsonb` | FX rates at snapshot time |
| `total_value_usd` | numeric | Yes | `0` | Total portfolio value in USD |
| `liquid_fixed_income_value_usd` | numeric | Yes | `0` | Liquid + Fixed Income value |
| `private_equity_value_usd` | numeric | Yes | `0` | Private Equity value |
| `real_estate_value_usd` | numeric | Yes | `0` | Real Estate value |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

---

### 2.4 `sessions` - Session-Based Authentication

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `session_token` | text | No | - | UUID token for authentication |
| `expires_at` | timestamptz | No | - | Expiration time (2 hours from creation) |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### 2.5 `app_config` - Application Configuration

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `password` | text | No | - | Application password (plain text) |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Note**: Contains a single row with the application password.

---

### 2.6 `account_update_tracker` - Track Account Update Status

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `account_entity` | text | No | - | Entity (Roy, Roni, etc.) |
| `account_bank` | text | No | - | Bank/broker name |
| `last_updated` | timestamptz | Yes | NULL | When account was last reviewed |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Unique Constraint**: `(account_entity, account_bank)` composite

---

### 2.7 `asset_liquidation_settings` - Liquidation Year Settings

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `asset_name` | text | No | - | Asset name (UNIQUE) |
| `liquidation_year` | text | No | - | Year string (e.g., "2025", "later") |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Unique Constraint**: `asset_name` column

---

### 2.8 `limited_liquidity_assets` - Illiquid Asset Markers

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `asset_name` | text | No | - | Asset name (UNIQUE) |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Unique Constraint**: `asset_name` column

---

### 2.9 `pending_assets` - Assets Awaiting Addition

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Asset name |
| `asset_class` | text | No | - | Asset class |
| `value_usd` | numeric | No | `0` | Estimated value in USD |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

---

## 3. Check Constraints

### 3.1 Assets Table Constraints

#### Asset Class Constraint
```sql
CHECK (class IN (
  'Public Equity',
  'Private Equity', 
  'Fixed Income',
  'Cash',
  'Commodities & more',
  'Real Estate'
))
```

#### Sub-Class Constraint (must match class)
```sql
CHECK (
  (class = 'Public Equity' AND sub_class IN ('Direct', 'ETF', 'Mutual Fund', 'Options')) OR
  (class = 'Private Equity' AND sub_class IN ('Startup', 'Fund', 'Real Estate Fund')) OR
  (class = 'Fixed Income' AND sub_class IN ('Government Bond', 'Corporate Bond', 'REIT stock', 'Municipal Bond', 'Bond Fund')) OR
  (class = 'Cash' AND sub_class IN ('ILS', 'USD', 'EUR', 'CHF', 'CAD', 'HKD', 'GBP')) OR
  (class = 'Commodities & more' AND sub_class IN ('Gold', 'Silver', 'Crypto', 'Other')) OR
  (class = 'Real Estate' AND sub_class IN ('Residential', 'Commercial', 'Land', 'REIT'))
)
```

#### Origin Currency Constraint
```sql
CHECK (origin_currency IN ('ILS', 'USD', 'CHF', 'EUR', 'CAD', 'HKD', 'GBP'))
```

#### Account Bank Constraint
```sql
CHECK (account_bank IN (
  'Poalim', 'Leumi', 'Discount', 'Mizrachi', 'IBI', 'Meitav',
  'Interactive Brokers', 'Schwab', 'Fidelity', 'Morgan Stanley',
  'UBS', 'Credit Suisse', 'Julius Baer', 'Bank of Israel',
  'Other Bank', 'Direct Investment', 'Insurance Company'
))
```

#### Account Entity Constraint
```sql
CHECK (account_entity IN ('Roy', 'Roni', 'Guy', 'Shira', 'Joint'))
```

#### Beneficiary Constraint
```sql
CHECK (beneficiary IN ('Kids', 'Inheritance'))
```

#### Factor Constraint (Private Equity)
```sql
CHECK (factor IS NULL OR (factor >= 0 AND factor <= 1))
```

---

## 4. Database Functions

### 4.1 `is_authorized()` - Session Validation

**Purpose**: Validates session token from HTTP headers for RLS policies.

```sql
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_token TEXT;
  session_exists BOOLEAN := false;
  headers_json JSON;
BEGIN
  -- Clear any previous session flags
  PERFORM set_config('app.session_expired', '', true);
  PERFORM set_config('app.no_session', '', true);
  
  -- Extract session token from PostgREST request headers
  BEGIN
    headers_json := current_setting('request.headers', true)::json;
    auth_token := NULLIF(headers_json->>'x-session-token', '');
  EXCEPTION WHEN OTHERS THEN
    auth_token := NULL;
  END;

  -- If no session token provided
  IF auth_token IS NULL THEN
    PERFORM set_config('app.no_session', 'true', true);
    RETURN false;
  END IF;

  -- Check if session token exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM public.sessions s
    WHERE s.session_token = auth_token
    AND s.expires_at > now()
  ) INTO session_exists;

  -- If session token exists but is expired or invalid
  IF NOT session_exists THEN
    IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.session_token = auth_token) THEN
      PERFORM set_config('app.session_expired', 'true', true);
    ELSE
      PERFORM set_config('app.no_session', 'true', true);
    END IF;
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
```

---

### 4.2 `set_session_token(token)` - Set Session Context

**Purpose**: Sets session token for the current database transaction.

```sql
CREATE OR REPLACE FUNCTION public.set_session_token(token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.session_token', token, true);
END;
$$;
```

---

### 4.3 `cleanup_expired_sessions()` - Remove Expired Sessions

**Purpose**: Deletes all expired sessions from the database.

```sql
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now();
END;
$$;
```

---

### 4.4 `get_config(config_name)` - Get PostgreSQL Config

**Purpose**: Retrieves PostgreSQL configuration values.

```sql
CREATE OR REPLACE FUNCTION public.get_config(config_name text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN current_setting(config_name, true);
END;
$$;
```

---

### 4.5 `update_updated_at_column()` - Timestamp Trigger

**Purpose**: Trigger function to auto-update `updated_at` column.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## 5. Row-Level Security (RLS) Policies

All tables have RLS enabled. Authorization is based on the `is_authorized()` function which validates session tokens.

### 5.1 Standard Authorization Pattern (Most Tables)

Used by: `assets`, `portfolio_snapshots`, `sessions`, `app_config`, `account_update_tracker`, `asset_liquidation_settings`, `limited_liquidity_assets`

```sql
-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Single policy for all operations
CREATE POLICY "Authorized access to table_name"
ON public.table_name
FOR ALL
USING (is_authorized())
WITH CHECK (is_authorized());
```

---

### 5.2 FX Rates (Public Read, Authorized Write)

```sql
-- Enable RLS
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "FX rates are viewable by everyone"
ON public.fx_rates
FOR SELECT
USING (true);

-- Authorized insert
CREATE POLICY "Authorized users can insert FX rates"
ON public.fx_rates
FOR INSERT
WITH CHECK (is_authorized());

-- Authorized update
CREATE POLICY "Authorized users can update FX rates"
ON public.fx_rates
FOR UPDATE
USING (is_authorized());

-- No DELETE policy (delete is not allowed)
```

---

### 5.3 Pending Assets (Separate Policies per Operation)

```sql
-- Enable RLS
ALTER TABLE public.pending_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view pending_assets"
ON public.pending_assets FOR SELECT
USING (is_authorized());

CREATE POLICY "Authorized users can insert pending_assets"
ON public.pending_assets FOR INSERT
WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can update pending_assets"
ON public.pending_assets FOR UPDATE
USING (is_authorized())
WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can delete pending_assets"
ON public.pending_assets FOR DELETE
USING (is_authorized());
```

---

## 6. Triggers

Every table has an `update_updated_at` trigger:

```sql
-- Pattern for each table
CREATE TRIGGER update_[table_name]_updated_at
BEFORE UPDATE ON public.[table_name]
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

Tables with this trigger:
- `assets`
- `fx_rates`
- `portfolio_snapshots`
- `sessions` (though sessions aren't updated)
- `app_config`
- `account_update_tracker`
- `asset_liquidation_settings`
- `limited_liquidity_assets`
- `pending_assets`

---

## 7. Scheduled Jobs

Using `pg_cron` extension with `pg_net` for HTTP calls.

### 7.1 Daily Stock Price Update

```sql
SELECT cron.schedule(
  'daily-stock-price-update',
  '0 6 * * *',  -- 6:00 AM UTC daily
  $$
  SELECT net.http_post(
    'https://[project-ref].supabase.co/functions/v1/scheduled-stock-price-update',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer [service-role-key]"}'
  );
  $$
);
```

### 7.2 Daily FX Rate Update

```sql
SELECT cron.schedule(
  'daily-fx-rate-update',
  '0 6 * * *',  -- 6:00 AM UTC daily
  $$
  SELECT net.http_post(
    'https://[project-ref].supabase.co/functions/v1/update-fx-rates',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer [service-role-key]"}'
  );
  $$
);
```

---

## 8. Edge Functions / Serverless Functions

### 8.1 `validate-password`

**Purpose**: Password authentication, creates database sessions.

**Endpoint**: `POST /functions/v1/validate-password`

**Request**:
```json
{ "password": "user-entered-password" }
```

**Response** (success):
```json
{
  "success": true,
  "sessionToken": "uuid-v4-token",
  "expiresAt": "2025-01-01T14:00:00.000Z"
}
```

**Logic**:
1. Fetch password from `app_config` table
2. Compare with submitted password
3. If valid, create session in `sessions` table (2-hour expiry)
4. Call `cleanup_expired_sessions()` RPC
5. Return session token

**Database Operations**:
- SELECT from `app_config`
- INSERT into `sessions`
- RPC call to `cleanup_expired_sessions`

---

### 8.2 `update-fx-rates`

**Purpose**: Fetches current FX rates from external API and updates database.

**Endpoint**: `POST /functions/v1/update-fx-rates`

**External API**: `https://api.exchangerate.host/live`

**Logic**:
1. Call exchangerate.host API with ILS as source
2. Calculate cross-rates for all 7 currencies
3. UPSERT all rates into `fx_rates` table

**Database Operations**:
- UPSERT to `fx_rates` (on conflict: `currency`)

**Required Secrets**:
- `EXCHANGE_RATE_API_KEY`

---

### 8.3 `update-stock-prices`

**Purpose**: Returns current stock/option prices for given tickers.

**Endpoint**: `POST /functions/v1/update-stock-prices`

**Request**:
```json
{ "symbols": ["AAPL", "GOOGL", "O:SPY250117C00600000"] }
```

**Response**:
```json
{
  "success": true,
  "prices": { "AAPL": 185.50, "GOOGL": 142.30 },
  "errors": { "INVALID": "Symbol not found" },
  "message": "Updated 2 prices, 1 failed"
}
```

**External APIs**:
- **Stocks**: MarketStack API (`http://api.marketstack.com/v2/eod/latest`)
- **Options** (O: prefix): Polygon API (`https://api.polygon.io/v2/aggs/ticker/{ticker}/prev`)

**Required Secrets**:
- `MARKETSTACK_API_KEY`
- `POLYGON_API_KEY`

---

### 8.4 `scheduled-stock-price-update`

**Purpose**: Automatically updates all eligible asset prices in the database.

**Endpoint**: `POST /functions/v1/scheduled-stock-price-update`

**Eligibility Criteria**:
- Must have ISIN/ticker field populated
- Asset class must be: Public Equity, OR Fixed Income with sub_class "REIT stock", OR Commodities & more
- Options (O: prefix) are always eligible

**Special Handling**:
- Tel Aviv stocks (`.TA` suffix or ILS currency): Prices divided by 100 (agorot to shekels)

**Database Operations**:
- SELECT all assets
- UPDATE price for each eligible asset

---

## 9. Application Data Access Patterns

### React Hook to Database Mapping

| Hook | Table(s) | Operations |
|------|----------|------------|
| `useAssets` | `assets` | SELECT all, INSERT, UPDATE (single + batch by name), DELETE |
| `useFXRates` | `fx_rates` | SELECT all, UPSERT (on conflict: currency) |
| `usePendingAssets` | `pending_assets` | SELECT all, INSERT, UPDATE, DELETE |
| `usePortfolioSnapshots` | `portfolio_snapshots` | INSERT only |
| `useAccountUpdateTracker` | `account_update_tracker` | SELECT all, UPSERT (on conflict: entity+bank), UPDATE |
| `useLimitedLiquidityAssets` | `limited_liquidity_assets` | SELECT all, INSERT, DELETE |
| `useAssetLiquidationSettings` | `asset_liquidation_settings` | SELECT all, UPSERT (on conflict: asset_name), DELETE |
| `useStockPrices` | (via edge function) | Calls `update-stock-prices`, then UPDATE assets |

### Session Header Pattern

All authenticated requests include:
```javascript
headers: {
  'x-session-token': 'uuid-session-token'
}
```

This is configured in the Supabase client via custom headers.

---

## 10. Required Secrets / Environment Variables

### Edge Function Secrets

| Secret Name | Purpose | Provider |
|-------------|---------|----------|
| `EXCHANGE_RATE_API_KEY` | FX rate API access | exchangerate.host |
| `MARKETSTACK_API_KEY` | Stock price API | MarketStack |
| `POLYGON_API_KEY` | Options price API | Polygon.io |
| `SUPABASE_URL` | Database connection | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database access | Auto-provided |

### Frontend Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |

---

## 11. Migration Considerations

### Supabase-Specific Features to Replace

| Feature | Supabase | Alternative |
|---------|----------|-------------|
| UUID generation | `gen_random_uuid()` | `uuid_generate_v4()` (uuid-ossp) or application-level |
| RLS | Built-in PostgreSQL RLS | Application middleware or database RLS |
| PostgREST headers | `current_setting('request.headers', true)` | Custom middleware to inject headers |
| Edge Functions | Deno runtime | AWS Lambda, Cloudflare Workers, Vercel Functions |
| pg_cron | Built-in scheduler | AWS EventBridge, CloudWatch, external cron |
| pg_net | HTTP from database | Application-level scheduling |

### Authentication Migration

The current system uses:
1. Password stored in `app_config` table (plain text)
2. Session tokens stored in `sessions` table
3. RLS policies check session validity via `is_authorized()` function
4. Sessions expire after 2 hours

**To migrate**:
- Implement password hashing (bcrypt recommended)
- Move session validation to application middleware, OR
- Replicate the `is_authorized()` function pattern
- Add session token to all API requests as header

### API Migration

Current: Supabase auto-generates REST API via PostgREST

**Options**:
1. **PostgREST standalone**: Deploy PostgREST server pointing to your PostgreSQL
2. **Custom API**: Build REST/GraphQL API with your framework
3. **ORM-based**: Use Prisma, Drizzle, or similar with custom endpoints

---

## 12. Complete SQL Schema

```sql
-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_config(config_name text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN current_setting(config_name, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_session_token(token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.session_token', token, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_token TEXT;
  session_exists BOOLEAN := false;
  headers_json JSON;
BEGIN
  PERFORM set_config('app.session_expired', '', true);
  PERFORM set_config('app.no_session', '', true);
  
  BEGIN
    headers_json := current_setting('request.headers', true)::json;
    auth_token := NULLIF(headers_json->>'x-session-token', '');
  EXCEPTION WHEN OTHERS THEN
    auth_token := NULL;
  END;

  IF auth_token IS NULL THEN
    PERFORM set_config('app.no_session', 'true', true);
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.sessions s
    WHERE s.session_token = auth_token
    AND s.expires_at > now()
  ) INTO session_exists;

  IF NOT session_exists THEN
    IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.session_token = auth_token) THEN
      PERFORM set_config('app.session_expired', 'true', true);
    ELSE
      PERFORM set_config('app.no_session', 'true', true);
    END IF;
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ============================================
-- TABLES
-- ============================================

-- Sessions table
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- App config table
CREATE TABLE public.app_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Assets table
CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  class text NOT NULL,
  sub_class text NOT NULL,
  isin text,
  account_entity text NOT NULL,
  account_bank text NOT NULL,
  beneficiary text NOT NULL DEFAULT 'Kids',
  origin_currency text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  factor numeric,
  maturity_date text,
  ytw numeric,
  pe_company_value numeric,
  pe_holding_percentage numeric,
  is_cash_equivalent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT assets_class_check CHECK (class IN (
    'Public Equity', 'Private Equity', 'Fixed Income', 
    'Cash', 'Commodities & more', 'Real Estate'
  )),
  CONSTRAINT assets_origin_currency_check CHECK (
    origin_currency IN ('ILS', 'USD', 'CHF', 'EUR', 'CAD', 'HKD', 'GBP')
  ),
  CONSTRAINT assets_factor_check CHECK (factor IS NULL OR (factor >= 0 AND factor <= 1))
);

-- FX rates table
CREATE TABLE public.fx_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency text NOT NULL UNIQUE,
  to_usd_rate numeric NOT NULL DEFAULT 0,
  to_ils_rate numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'api',
  is_manual_override boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Portfolio snapshots table
CREATE TABLE public.portfolio_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  fx_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_value_usd numeric DEFAULT 0,
  liquid_fixed_income_value_usd numeric DEFAULT 0,
  private_equity_value_usd numeric DEFAULT 0,
  real_estate_value_usd numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Account update tracker table
CREATE TABLE public.account_update_tracker (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_entity text NOT NULL,
  account_bank text NOT NULL,
  last_updated timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (account_entity, account_bank)
);

-- Asset liquidation settings table
CREATE TABLE public.asset_liquidation_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name text NOT NULL UNIQUE,
  liquidation_year text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Limited liquidity assets table
CREATE TABLE public.limited_liquidity_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pending assets table
CREATE TABLE public.pending_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  asset_class text NOT NULL,
  value_usd numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fx_rates_updated_at
  BEFORE UPDATE ON public.fx_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_snapshots_updated_at
  BEFORE UPDATE ON public.portfolio_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_account_update_tracker_updated_at
  BEFORE UPDATE ON public.account_update_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_liquidation_settings_updated_at
  BEFORE UPDATE ON public.asset_liquidation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_limited_liquidity_assets_updated_at
  BEFORE UPDATE ON public.limited_liquidity_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_assets_updated_at
  BEFORE UPDATE ON public.pending_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_update_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_liquidation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limited_liquidity_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_assets ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Authorized access to sessions"
  ON public.sessions FOR ALL
  USING (is_authorized()) WITH CHECK (is_authorized());

-- App config policies
CREATE POLICY "Authorized access to app_config"
  ON public.app_config FOR ALL
  USING (is_authorized());

-- Assets policies
CREATE POLICY "Authorized access to assets"
  ON public.assets FOR ALL
  USING (is_authorized());

-- FX rates policies (public read)
CREATE POLICY "FX rates are viewable by everyone"
  ON public.fx_rates FOR SELECT USING (true);

CREATE POLICY "Authorized users can insert FX rates"
  ON public.fx_rates FOR INSERT WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can update FX rates"
  ON public.fx_rates FOR UPDATE USING (is_authorized());

-- Portfolio snapshots policies
CREATE POLICY "Authorized access to portfolio_snapshots"
  ON public.portfolio_snapshots FOR ALL
  USING (is_authorized());

-- Account update tracker policies
CREATE POLICY "Authorized access to account_update_tracker"
  ON public.account_update_tracker FOR ALL
  USING (is_authorized()) WITH CHECK (is_authorized());

-- Asset liquidation settings policies
CREATE POLICY "Authorized access to asset_liquidation_settings"
  ON public.asset_liquidation_settings FOR ALL
  USING (is_authorized());

-- Limited liquidity assets policies
CREATE POLICY "Authorized access to limited_liquidity_assets"
  ON public.limited_liquidity_assets FOR ALL
  USING (is_authorized()) WITH CHECK (is_authorized());

-- Pending assets policies
CREATE POLICY "Authorized users can view pending_assets"
  ON public.pending_assets FOR SELECT USING (is_authorized());

CREATE POLICY "Authorized users can insert pending_assets"
  ON public.pending_assets FOR INSERT WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can update pending_assets"
  ON public.pending_assets FOR UPDATE
  USING (is_authorized()) WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can delete pending_assets"
  ON public.pending_assets FOR DELETE USING (is_authorized());

-- ============================================
-- SCHEDULED JOBS (pg_cron)
-- ============================================
-- Note: Replace [project-ref] and [service-role-key] with actual values

-- SELECT cron.schedule(
--   'daily-stock-price-update',
--   '0 6 * * *',
--   $$SELECT net.http_post(
--     'https://[project-ref].supabase.co/functions/v1/scheduled-stock-price-update',
--     '{}',
--     '{"Content-Type": "application/json", "Authorization": "Bearer [service-role-key]"}'
--   );$$
-- );

-- SELECT cron.schedule(
--   'daily-fx-rate-update', 
--   '0 6 * * *',
--   $$SELECT net.http_post(
--     'https://[project-ref].supabase.co/functions/v1/update-fx-rates',
--     '{}',
--     '{"Content-Type": "application/json", "Authorization": "Bearer [service-role-key]"}'
--   );$$
-- );
```

---

## Document Version

- **Created**: 2026-02-07
- **Last Updated**: 2026-02-07
- **Database Platform**: Supabase (PostgreSQL)
- **Application Version**: Portfolio Management v1.0
