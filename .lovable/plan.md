

## Style "Company Value (Factored)" Column

### Overview
Make the column smaller, grey, and display values in millions for better readability.

---

### Changes Required

**File: `src/components/portfolio/PortfolioSummary.tsx`**

#### 1. Style the Column Header (Line 1415)

Add muted/grey text color and smaller width:

```tsx
<TableHead className="text-right bg-card text-muted-foreground text-xs w-32">
  Company Value (M)
</TableHead>
```

#### 2. Style the Column Cells (Lines 1433-1437)

Add muted styling and format in millions:

```tsx
<TableCell className="text-right font-mono text-muted-foreground text-xs">
  {item.companyValueFactored !== undefined 
    ? `${(item.companyValueFactored / 1000000).toFixed(1)}M`
    : '-'}
</TableCell>
```

---

### Changes Summary

| Element | Before | After |
|---------|--------|-------|
| Header text | "Company Value (Factored)" | "Company Value (M)" |
| Text color | Default | `text-muted-foreground` (grey) |
| Text size | Default | `text-xs` (smaller) |
| Column width | Auto | `w-32` (narrower) |
| Value format | "$5,200,000" | "5.2M" |

---

### Result
- Column appears more subtle/secondary compared to main Value column
- Values are easier to scan in millions format
- Cleaner, less cluttered table appearance

