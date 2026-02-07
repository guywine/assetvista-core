

## Add Upcoming Maturity Table to Fixed Income Section

### Overview

Add an expandable table to the Fixed Income section in the Summary tab that displays all bonds maturing within the next 365 days. Each row shows aggregated bond data and can be expanded to reveal individual holdings across different accounts.

### Location

The table will be placed in the **Fixed Income Dedicated Section** (around line 960-1051 in PortfolioSummary.tsx), after the existing pie chart and YTW summary cards.

---

### Data Structure

**Main Table Row (aggregated by bond name):**
| Column | Description |
|--------|-------------|
| Bond Name | Asset name |
| Maturity Date | Formatted date (e.g., "Mar 15, 2026") |
| Days to Maturity | Number with color coding |
| Total Value | Sum of all holdings in view currency |

**Expanded Row (individual holdings):**
| Column | Description |
|--------|-------------|
| Entity | Account entity (Roy, Roni, etc.) |
| Bank | Account bank |
| Value | Individual holding value |

---

### Color Coding Logic for "Days to Maturity"

```text
Days <= 14     -> RED (text-red-500)
Days <= 60     -> YELLOW (text-yellow-500)  
Days > 60      -> Normal text (no color)
```

---

### Technical Implementation

#### 1. Add New Utility Function

**File:** `src/lib/portfolio-utils.ts`

Add a helper function to calculate days until maturity:

```typescript
export function calculateDaysToMaturity(maturityDate: string | undefined): number | null {
  if (!maturityDate || maturityDate === 'none') return null;
  
  try {
    const maturity = parseISO(maturityDate);
    const today = new Date();
    const diffTime = maturity.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
```

#### 2. Modify PortfolioSummary Component

**File:** `src/components/portfolio/PortfolioSummary.tsx`

**a) Add imports:**
- Import `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from `@/components/ui/collapsible`
- Import `ChevronDown`, `ChevronRight` from `lucide-react`
- Import the new `calculateDaysToMaturity` function

**b) Add state for expanded rows:**
```typescript
const [expandedBonds, setExpandedBonds] = useState<Set<string>>(new Set());
```

**c) Add computed data for maturing bonds (using `useMemo`):**
- Filter Fixed Income assets with maturity within 365 days
- Group by bond name (since same bond can be held in multiple accounts)
- Calculate total value per bond
- Find the soonest maturity date per bond
- Sort by days to maturity (ascending - closest first)
- Include individual holdings for expansion

**d) Add the table component after the YTW card:**
- Use the existing Collapsible pattern from AccountUpdateTracker
- Color-code the "Days to Maturity" column based on urgency
- Format dates using date-fns `format` function

---

### Visual Layout

```text
+------------------------------------------------------------------+
|  FIXED INCOME                                                     |
+------------------------------------------------------------------+
|  [Pie Chart Card]    |    [YTW Card]                             |
+----------------------+-------------------------------------------+
|                                                                   |
|  Upcoming Maturities (Next 365 Days)                             |
+------------------------------------------------------------------+
| > Bond Name          | Maturity    | Days  | Total Value         |
|-------------------------------------------------------------------+
| > Treasury 2026      | Mar 15, 26  | 36    | $125,000            |
|   |- Roy | Poalim    |             |       | $75,000             |
|   |- Roni | IBI      |             |       | $50,000             |
|-------------------------------------------------------------------+
| > Corporate Bond XYZ | Apr 20, 26  | 72    | $80,000             |
+------------------------------------------------------------------+
```

---

### Code Changes Summary

| File | Change |
|------|--------|
| `src/lib/portfolio-utils.ts` | Add `calculateDaysToMaturity()` function |
| `src/components/portfolio/PortfolioSummary.tsx` | Add imports, state, memoized data, and new table component in Fixed Income section |

---

### Reusing Existing Logic

The implementation leverages:
- Existing `isMaturityWithinYear()` function for filtering
- Existing `calculateAssetValue()` for value calculations
- Existing `formatCurrency()` for display formatting
- Existing Collapsible pattern from `AccountUpdateTracker.tsx`
- Existing table styling from `@/components/ui/table`

