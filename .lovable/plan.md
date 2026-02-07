

## Application Code Migration Documentation

I'll add a new comprehensive section to the `DATABASE_DOCUMENTATION.md` file that documents all the code changes required to migrate away from Supabase, including a "Maximum Portability" refactoring option.

---

### New Section: "13. Application Code Migration Guide"

This section will be added after the current Section 12 and will include:

---

### 13.1 Files That Require Changes

#### Overview Table

| File | Purpose | Change Complexity |
|------|---------|-------------------|
| `src/integrations/supabase/client.ts` | Supabase SDK initialization | **HIGH** - Core replacement |
| `src/integrations/supabase/types.ts` | Auto-generated TypeScript types | **MEDIUM** - Regenerate from new provider |
| `src/hooks/useAssets.ts` | Asset CRUD operations | **HIGH** - 717 lines, complex batch logic |
| `src/hooks/useFXRates.ts` | FX rate management | **MEDIUM** - Simple CRUD |
| `src/hooks/usePendingAssets.ts` | Pending assets CRUD | **LOW** - Simple operations |
| `src/hooks/usePortfolioSnapshots.ts` | Snapshot creation | **LOW** - Insert only |
| `src/hooks/useAccountUpdateTracker.ts` | Account tracking | **MEDIUM** - Upsert operations |
| `src/hooks/useLimitedLiquidityAssets.ts` | Liquidity markers | **LOW** - Simple CRUD |
| `src/hooks/useAssetLiquidationSettings.ts` | Liquidation settings | **MEDIUM** - Upsert operations |
| `src/hooks/useStockPrices.ts` | Stock price updates | **MEDIUM** - Edge function calls |
| `src/contexts/AuthContext.tsx` | Authentication | **HIGH** - Session management |
| `src/lib/session-utils.ts` | Session validation | **HIGH** - RLS-specific logic |
| `src/components/portfolio/PortfolioHistory.tsx` | History + Downloads | **MEDIUM** - Database reads |
| `supabase/functions/*` | Edge functions (4 files) | **HIGH** - Platform-specific |

---

### 13.2 Detailed Change Analysis Per File

#### A. Core Client File

**File**: `src/integrations/supabase/client.ts`

**Current**: Creates Supabase client with custom fetch wrapper for session headers

**Changes Required**:
- Replace Supabase SDK initialization
- Maintain custom header injection for session tokens
- If using PostgREST standalone: minimal changes to URL
- If using custom API: replace with fetch/axios calls

**Current Code Pattern**:
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: (input, init) => {
      // Custom header injection
    }
  }
});
```

---

#### B. Data Access Hooks (9 files)

Each hook uses Supabase query builder syntax that must be translated:

**Supabase Query Patterns Used**:

| Pattern | Count | Example |
|---------|-------|---------|
| `.from('table').select('*')` | 12 | All hooks |
| `.insert([data]).select()` | 6 | useAssets, usePendingAssets |
| `.update(data).eq('id', id)` | 15 | All CRUD hooks |
| `.delete().eq('id', id)` | 5 | useAssets, usePendingAssets |
| `.upsert(data, { onConflict })` | 6 | useFXRates, useAccountUpdateTracker |
| `.order('column', { ascending })` | 8 | Most SELECT queries |
| `.eq('column', value)` | 20+ | Filtering and updates |
| `.maybeSingle()` | 8 | Single row returns |
| `.single()` | 4 | Required single row |
| `.rpc('function_name', args)` | 2 | is_authorized, cleanup_sessions |
| `supabase.functions.invoke()` | 3 | Edge function calls |

---

#### C. Authentication/Session Files

**Files**: `src/contexts/AuthContext.tsx`, `src/lib/session-utils.ts`

**Supabase-Specific Patterns**:
1. `supabase.functions.invoke('validate-password', { body })` - Edge function call
2. `supabase.rpc('is_authorized')` - RPC for session check
3. Custom `x-session-token` header injection

**Migration Options**:
- Replace edge function calls with standard REST API calls
- Replace RPC with standard API endpoint
- Maintain header-based session pattern OR switch to cookies/JWT

---

#### D. Edge Functions (4 files)

| Function | Lines | External APIs | DB Operations |
|----------|-------|---------------|---------------|
| `validate-password/index.ts` | 96 | None | SELECT app_config, INSERT sessions, RPC cleanup |
| `update-fx-rates/index.ts` | 162 | exchangerate.host | UPSERT fx_rates |
| `update-stock-prices/index.ts` | 67 | MarketStack, Polygon | None (returns prices) |
| `scheduled-stock-price-update/index.ts` | 170 | MarketStack, Polygon | SELECT assets, UPDATE prices |
| `_shared/stock-prices.ts` | 195 | MarketStack, Polygon | None (shared logic) |

**Deno-Specific Code**:
- `Deno.serve()` - HTTP server
- `Deno.env.get()` - Environment variables
- ESM imports from URLs

---

### 13.3 Query Syntax Translation Reference

| Supabase | Standard SQL | Prisma | Drizzle |
|----------|-------------|--------|---------|
| `.from('assets').select('*')` | `SELECT * FROM assets` | `db.assets.findMany()` | `db.select().from(assets)` |
| `.insert([data])` | `INSERT INTO ... VALUES` | `db.assets.create({ data })` | `db.insert(assets).values(data)` |
| `.update(data).eq('id', id)` | `UPDATE ... WHERE id = ?` | `db.assets.update({ where: { id }, data })` | `db.update(assets).set(data).where(eq(assets.id, id))` |
| `.delete().eq('id', id)` | `DELETE FROM ... WHERE` | `db.assets.delete({ where: { id } })` | `db.delete(assets).where(eq(assets.id, id))` |
| `.upsert(data, { onConflict: 'col' })` | `INSERT ... ON CONFLICT DO UPDATE` | `db.assets.upsert({ where, create, update })` | `db.insert(assets).values(data).onConflictDoUpdate({ target, set })` |
| `.order('col', { ascending: false })` | `ORDER BY col DESC` | `orderBy: { col: 'desc' }` | `.orderBy(desc(assets.col))` |
| `.eq('col', val)` | `WHERE col = ?` | `where: { col: val }` | `.where(eq(assets.col, val))` |

---

### 13.4 Maximum Portability Refactoring Option

To achieve maximum portability, create a Data Access Layer (DAL) abstraction:

#### Step 1: Define Repository Interfaces

**New File**: `src/data/interfaces/IAssetRepository.ts`
```typescript
export interface IAssetRepository {
  findAll(): Promise<Asset[]>;
  findById(id: string): Promise<Asset | null>;
  findByName(name: string): Promise<Asset[]>;
  create(asset: CreateAssetDTO): Promise<Asset>;
  update(id: string, data: UpdateAssetDTO): Promise<Asset>;
  updateMany(filter: { name: string }, data: Partial<Asset>): Promise<Asset[]>;
  delete(id: string): Promise<void>;
}
```

#### Step 2: Create Supabase Implementation

**New File**: `src/data/supabase/AssetRepository.ts`
```typescript
export class SupabaseAssetRepository implements IAssetRepository {
  constructor(private client: SupabaseClient) {}
  
  async findAll(): Promise<Asset[]> {
    const { data, error } = await this.client
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(convertFromDb);
  }
  // ... other methods
}
```

#### Step 3: Create Alternative Implementation (e.g., Prisma)

**New File**: `src/data/prisma/AssetRepository.ts`
```typescript
export class PrismaAssetRepository implements IAssetRepository {
  constructor(private prisma: PrismaClient) {}
  
  async findAll(): Promise<Asset[]> {
    return this.prisma.assets.findMany({
      orderBy: { created_at: 'desc' }
    });
  }
  // ... other methods
}
```

#### Step 4: Create Provider Context

**New File**: `src/data/DataProvider.tsx`
```typescript
const DataContext = createContext<DataRepositories | undefined>(undefined);

export function DataProvider({ children, implementation }: Props) {
  const repositories = useMemo(() => {
    if (implementation === 'supabase') {
      return createSupabaseRepositories(supabaseClient);
    } else if (implementation === 'prisma') {
      return createPrismaRepositories(prismaClient);
    }
  }, [implementation]);
  
  return <DataContext.Provider value={repositories}>{children}</DataContext.Provider>;
}
```

#### Step 5: Update Hooks to Use Repository

**Modified**: `src/hooks/useAssets.ts`
```typescript
export function useAssets() {
  const { assetRepository } = useData(); // Get from context
  
  const loadAssets = async () => {
    const data = await assetRepository.findAll();
    setAssets(data);
  };
  
  const addAsset = async (asset: Asset) => {
    const newAsset = await assetRepository.create(asset);
    setAssets(prev => [newAsset, ...prev]);
  };
  // ...
}
```

---

### 13.5 Complete File Change Checklist

#### Files to Modify (19 files)

**Core Infrastructure (4 files)**:
- [ ] `src/integrations/supabase/client.ts` - Replace SDK
- [ ] `src/integrations/supabase/types.ts` - Regenerate types
- [ ] `src/contexts/AuthContext.tsx` - Replace auth flow
- [ ] `src/lib/session-utils.ts` - Replace RPC calls

**Data Hooks (9 files)**:
- [ ] `src/hooks/useAssets.ts` - All CRUD operations
- [ ] `src/hooks/useFXRates.ts` - FX rate operations
- [ ] `src/hooks/usePendingAssets.ts` - Pending assets CRUD
- [ ] `src/hooks/usePortfolioSnapshots.ts` - Snapshot creation
- [ ] `src/hooks/useAccountUpdateTracker.ts` - Account tracking
- [ ] `src/hooks/useLimitedLiquidityAssets.ts` - Liquidity markers
- [ ] `src/hooks/useAssetLiquidationSettings.ts` - Liquidation settings
- [ ] `src/hooks/useStockPrices.ts` - Edge function calls
- [ ] `src/hooks/useSessionAuth.ts` - Session management (can likely delete)

**Components with DB Access (1 file)**:
- [ ] `src/components/portfolio/PortfolioHistory.tsx` - Snapshot queries

**Edge Functions - Convert to New Platform (5 files)**:
- [ ] `supabase/functions/validate-password/index.ts`
- [ ] `supabase/functions/update-fx-rates/index.ts`
- [ ] `supabase/functions/update-stock-prices/index.ts`
- [ ] `supabase/functions/scheduled-stock-price-update/index.ts`
- [ ] `supabase/functions/_shared/stock-prices.ts`

---

### 13.6 Effort Estimation

| Migration Path | Estimated Effort | Complexity |
|----------------|------------------|------------|
| **PostgREST Standalone** | 2-3 days | Low - URL change + session middleware |
| **Custom REST API + ORM (Prisma/Drizzle)** | 1-2 weeks | Medium - Rewrite all queries |
| **Maximum Portability Refactor First** | 2-3 weeks | High - Full abstraction layer |
| **Different Database (e.g., MongoDB)** | 3-4 weeks | High - Schema + query rewrite |

---

### 13.7 Recommended Migration Steps

1. **Export current data** from Supabase
2. **Set up new database** with schema from Section 12
3. **Choose API approach** (PostgREST standalone vs custom API)
4. **Convert edge functions** to new serverless platform
5. **Update client.ts** with new connection
6. **Update hooks one by one**, testing each
7. **Update auth flow** last (most critical)
8. **Set up scheduled jobs** using new platform's scheduler

