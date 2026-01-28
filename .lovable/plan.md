

## Style "M" Suffix and Update Column Header

### Changes Required

**File: `src/components/portfolio/PortfolioSummary.tsx`**

#### 1. Update Column Header (Line 1415)

Change header text from "Company Value (M)" to "Company Value (Factored, M)":

```tsx
<TableHead className="text-right bg-card text-muted-foreground text-xs w-32">
  Company Value (Factored, M)
</TableHead>
```

#### 2. Style "M" Suffix Distinctly (Lines 1433-1437)

Wrap the "M" in a span with lighter/smaller styling to visually separate it from the number:

```tsx
<TableCell className="text-right font-mono text-muted-foreground text-xs">
  {item.companyValueFactored !== undefined 
    ? <>{(item.companyValueFactored / 1000000).toFixed(0)}<span className="text-muted-foreground/60 ml-0.5">M</span></>
    : '-'}
</TableCell>
```

---

### Result

| Element | Before | After |
|---------|--------|-------|
| Header | "Company Value (M)" | "Company Value (Factored, M)" |
| Value display | `5M` | `5` with lighter `M` suffix |

The "M" will appear slightly faded with a small gap from the number, making it clear it's a unit indicator rather than part of the value.

