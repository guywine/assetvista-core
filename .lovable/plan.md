
## Add Private Equity Holdings Table to Summary Tab

### Overview
Add a new table at the bottom of the Summary tab that displays all Private Equity holdings aggregated by asset name, showing the holding percentage (when available) and factored value.

---

### Table Structure

| Column | Description |
|--------|-------------|
| **Asset Name** | Name of the Private Equity investment |
| **Holding %** | `pe_holding_percentage` field (display "-" if not available) |
| **Value (Factored)** | The factored display value from `calculateAssetValue` |

Default sort: By value (factored), descending

---

### Implementation Details

**File: `src/components/portfolio/PortfolioSummary.tsx`**

#### Step 1: Calculate Aggregated Private Equity Data

Add a new calculation block after the existing calculations (around line 350):

```typescript
// Private Equity holdings aggregated by name
const privateEquityByName = useMemo(() => {
  const peAssets = assets.filter(asset => asset.class === 'Private Equity');
  
  const aggregated = peAssets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const factoredValue = calc?.display_value || 0;
    
    if (!acc[asset.name]) {
      acc[asset.name] = {
        name: asset.name,
        holdingPercentage: asset.pe_holding_percentage,
        factoredValue: 0,
      };
    }
    acc[asset.name].factoredValue += factoredValue;
    
    // Keep the holding percentage if available (use first non-null value)
    if (asset.pe_holding_percentage !== undefined && acc[asset.name].holdingPercentage === undefined) {
      acc[asset.name].holdingPercentage = asset.pe_holding_percentage;
    }
    
    return acc;
  }, {} as Record<string, { name: string; holdingPercentage?: number; factoredValue: number }>);
  
  // Sort by factored value descending
  return Object.values(aggregated).sort((a, b) => b.factoredValue - a.factoredValue);
}, [assets, calculations]);
```

#### Step 2: Add Table Component at Bottom of Return JSX

Add after the "General Asset Class Charts" section (after line 1329):

```tsx
{/* Private Equity Holdings Table */}
{privateEquityByName.length > 0 && (
  <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
    <CardHeader>
      <CardTitle className="text-lg font-bold text-financial-primary">
        Private Equity Holdings
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Aggregated by asset name, sorted by factored value
      </p>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead className="text-right">Holding %</TableHead>
            <TableHead className="text-right">Value (Factored)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {privateEquityByName.map((item) => (
            <TableRow key={item.name}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right font-mono">
                {item.holdingPercentage !== undefined 
                  ? `${(item.holdingPercentage * 100).toFixed(2)}%` 
                  : '-'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(item.factoredValue, viewCurrency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}
```

---

### Technical Notes

- Uses existing `calculations` Map which already contains factored values via `calculateAssetValue`
- The `pe_holding_percentage` is stored as a decimal (e.g., 0.05 for 5%), so multiply by 100 for display
- Table styling matches existing tables in the Summary tab (using Card wrapper with gradient background)
- Only renders if there are Private Equity assets in the portfolio

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/portfolio/PortfolioSummary.tsx` | Add privateEquityByName calculation and table component |
