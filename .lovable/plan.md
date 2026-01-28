

## Add Company Value (Factored) Column to Private Equity Holdings Table

### Overview
Add a new column "Company Value (Factored)" to the Private Equity Holdings table that displays the company value multiplied by the factor for companies that have a holding percentage.

---

### Changes Required

**File: `src/components/portfolio/PortfolioSummary.tsx`**

#### 1. Update Aggregation Logic (Lines ~389-404)

Add `companyValueFactored` to the aggregated data structure. Since a company might have multiple holdings with different factors, we'll need to calculate the factored company value from each asset:

```typescript
const aggregated = peAssets.reduce((acc, asset) => {
  const calc = calculations.get(asset.id);
  const factoredValue = calc?.display_value || 0;
  
  if (!acc[asset.name]) {
    acc[asset.name] = {
      name: asset.name,
      holdingPercentage: undefined as number | undefined,
      factoredValue: 0,
      companyValueFactored: undefined as number | undefined,
    };
  }
  acc[asset.name].factoredValue += factoredValue;
  
  // Sum holding percentages for multiple holdings in same firm
  if (asset.pe_holding_percentage !== undefined) {
    acc[asset.name].holdingPercentage = (acc[asset.name].holdingPercentage || 0) + asset.pe_holding_percentage;
  }
  
  // Calculate factored company value (pe_company_value * factor)
  if (asset.pe_company_value !== undefined && asset.factor !== undefined) {
    const factoredCompanyValue = asset.pe_company_value * asset.factor;
    // Use the latest/highest factored company value (since it's the same company)
    if (acc[asset.name].companyValueFactored === undefined || factoredCompanyValue > acc[asset.name].companyValueFactored) {
      acc[asset.name].companyValueFactored = factoredCompanyValue;
    }
  }
  
  return acc;
}, {} as Record<string, { name: string; holdingPercentage?: number; factoredValue: number; companyValueFactored?: number }>);
```

#### 2. Update Table Headers (Lines ~1395-1413)

Add the new column header between "Holding %" and "Value (Factored)":

```tsx
<TableHeader>
  <TableRow>
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handlePESort('name')}
    >
      Asset Name {peSortColumn === 'name' && (peSortDirection === 'asc' ? '↑' : '↓')}
    </TableHead>
    <TableHead className="text-right">Holding %</TableHead>
    <TableHead className="text-right">Company Value (Factored)</TableHead>
    <TableHead 
      className="text-right cursor-pointer hover:bg-muted/50"
      onClick={() => handlePESort('value')}
    >
      Value (Factored) {peSortColumn === 'value' && (peSortDirection === 'asc' ? '↑' : '↓')}
    </TableHead>
  </TableRow>
</TableHeader>
```

#### 3. Update Table Body (Lines ~1414-1425)

Add the new cell to display the factored company value:

```tsx
<TableBody>
  {privateEquityByName.map((item) => (
    <TableRow key={item.name}>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="text-right font-mono">
        {item.holdingPercentage !== undefined 
          ? `${item.holdingPercentage.toFixed(2)}%` 
          : '-'}
      </TableCell>
      <TableCell className="text-right font-mono">
        {item.companyValueFactored !== undefined 
          ? formatCurrency(item.companyValueFactored, viewCurrency)
          : '-'}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(item.factoredValue, viewCurrency)}
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

---

### Summary

| Change | Description |
|--------|-------------|
| Add `companyValueFactored` field | Track `pe_company_value * factor` for each company |
| New table column | "Company Value (Factored)" between Holding % and Value |
| Display logic | Show formatted currency or "-" if not available |

