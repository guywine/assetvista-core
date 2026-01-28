

## Fix Private Equity Holdings Table

### Changes Required

**File: `src/components/portfolio/PortfolioSummary.tsx`**

---

### 1. Fix Percentage Display (Line ~1383)

Remove the `* 100` multiplication since the value is already stored as a percentage:

**Current:**
```tsx
{item.holdingPercentage !== undefined 
  ? `${(item.holdingPercentage * 100).toFixed(2)}%` 
  : '-'}
```

**Fixed:**
```tsx
{item.holdingPercentage !== undefined 
  ? `${item.holdingPercentage.toFixed(2)}%` 
  : '-'}
```

---

### 2. Aggregate Holding Percentage (Line ~392-397)

Change the logic to **sum** holding percentages instead of keeping first non-null value:

**Current:**
```typescript
// Keep the holding percentage if available (use first non-null value)
if (asset.pe_holding_percentage !== undefined && acc[asset.name].holdingPercentage === undefined) {
  acc[asset.name].holdingPercentage = asset.pe_holding_percentage;
}
```

**Fixed:**
```typescript
// Sum holding percentages for multiple holdings in same firm
if (asset.pe_holding_percentage !== undefined) {
  acc[asset.name].holdingPercentage = (acc[asset.name].holdingPercentage || 0) + asset.pe_holding_percentage;
}
```

---

### 3. Add Sortable Columns

**Add state variables** (after existing state declarations around line 50):
```typescript
const [peSortColumn, setPeSortColumn] = useState<'name' | 'value'>('value');
const [peSortDirection, setPeSortDirection] = useState<'asc' | 'desc'>('desc');
```

**Update sort logic in useMemo** (line ~402-403):
```typescript
// Sort based on selected column and direction
return Object.values(aggregated).sort((a, b) => {
  if (peSortColumn === 'name') {
    return peSortDirection === 'asc' 
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  }
  return peSortDirection === 'asc' 
    ? a.factoredValue - b.factoredValue
    : b.factoredValue - a.factoredValue;
});
```

**Add sort toggle function**:
```typescript
const handlePESort = (column: 'name' | 'value') => {
  if (peSortColumn === column) {
    setPeSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setPeSortColumn(column);
    setPeSortDirection(column === 'name' ? 'asc' : 'desc');
  }
};
```

**Update table headers** to be clickable with sort indicators:
```tsx
<TableHead 
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => handlePESort('name')}
>
  Asset Name {peSortColumn === 'name' && (peSortDirection === 'asc' ? '↑' : '↓')}
</TableHead>
<TableHead className="text-right">Holding %</TableHead>
<TableHead 
  className="text-right cursor-pointer hover:bg-muted/50"
  onClick={() => handlePESort('value')}
>
  Value (Factored) {peSortColumn === 'value' && (peSortDirection === 'asc' ? '↑' : '↓')}
</TableHead>
```

---

### Summary of Changes

| Change | Description |
|--------|-------------|
| Remove `* 100` | Percentage is already stored as a percentage, not decimal |
| Sum holding percentages | Aggregate multiple holdings in same firm by summing `pe_holding_percentage` |
| Add sort state | Track which column and direction to sort |
| Clickable headers | Allow clicking Asset Name or Value columns to sort |

