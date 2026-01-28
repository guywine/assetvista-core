

## Fix Percentage Display in Private Equity Holdings Table

### Overview
Change the holding percentage display to show the number as entered, rather than forcing exactly 2 decimal places.

---

### Change Required

**File: `src/components/portfolio/PortfolioSummary.tsx`** (Line 1430)

**Current:**
```tsx
{item.holdingPercentage !== undefined 
  ? `${item.holdingPercentage.toFixed(2)}%` 
  : '-'}
```

**Fixed:**
```tsx
{item.holdingPercentage !== undefined 
  ? `${item.holdingPercentage}%` 
  : '-'}
```

---

### Result
- If value is `5`, displays as `5%`
- If value is `12.5`, displays as `12.5%`  
- If value is `3.125`, displays as `3.125%`

