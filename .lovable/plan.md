

## Make All Maturity Table Rows Expandable

### Overview

Currently, bonds with only one holding are not expandable, so users cannot see which account holds that bond. This change will make ALL rows expandable regardless of holding count, showing the Entity and Bank information for every bond.

---

### Current Behavior (Problem)

```text
| > Treasury 2026      | Mar 15, 26  | 36    | $125,000  |  <-- Expandable (2 holdings)
|   |- Roy | Poalim    |             |       | $75,000   |
|   |- Roni | IBI      |             |       | $50,000   |
| Corporate Bond XYZ   | Apr 20, 26  | 72    | $80,000   |  <-- NOT expandable (1 holding)
```

### New Behavior (Fixed)

```text
| > Treasury 2026      | Mar 15, 26  | 36    | $125,000  |  <-- Expandable (2 holdings)
|   |- Roy | Poalim    |             |       | $75,000   |
|   |- Roni | IBI      |             |       | $50,000   |
| > Corporate Bond XYZ | Apr 20, 26  | 72    | $80,000   |  <-- NOW expandable (1 holding)
|   |- Guy | IBI       |             |       | $80,000   |
```

---

### Technical Changes

**File:** `src/components/portfolio/PortfolioSummary.tsx`

Remove the `hasMultipleHoldings` condition from:

1. **Row cursor styling** (line 1179): Remove conditional `cursor-pointer` class - all rows should be clickable
2. **Expand icon** (lines 1181-1191): Remove `hasMultipleHoldings &&` check - always show chevron
3. **Bond name trigger** (lines 1194-1200): Remove conditional - always make name clickable
4. **Expanded content** (lines 1213-1231): Remove `hasMultipleHoldings &&` check - always render holdings

---

### Code Changes Summary

| Location | Change |
|----------|--------|
| Line 1179 | Remove `hasMultipleHoldings ? ` from className |
| Lines 1181-1191 | Remove `{hasMultipleHoldings && (...)}` wrapper |
| Lines 1194-1200 | Always use CollapsibleTrigger for bond name |
| Lines 1213-1231 | Remove `{hasMultipleHoldings && (...)}` wrapper |

