

## Fix Sticky Header in Private Equity Holdings Table

### Root Cause
The `Table` component wraps the table in its own `<div className="overflow-auto">`. This creates a nested scroll context that breaks `position: sticky` - even though the inner div doesn't actually scroll.

### Solution
Remove our outer scroll container and instead apply the max-height constraint directly to the Table's wrapper using Tailwind's child selector.

---

### Change Required

**File: `src/components/portfolio/PortfolioSummary.tsx`** (Lines ~1404-1446)

Replace the current structure:

```tsx
<CardContent>
  <div className="max-h-[400px] overflow-auto">
    <Table>
      ...
    </Table>
  </div>
</CardContent>
```

With this (using `[&>div]` to target Table's wrapper):

```tsx
<CardContent className="[&>div]:max-h-[400px]">
  <Table>
    <TableHeader className="sticky top-0 z-10">
      <TableRow>
        <TableHead className="cursor-pointer hover:bg-muted/50 bg-card" onClick={() => handlePESort('name')}>
          Asset Name {peSortColumn === 'name' && (peSortDirection === 'asc' ? '↑' : '↓')}
        </TableHead>
        <TableHead className="text-right bg-card">Holding %</TableHead>
        <TableHead className="text-right bg-card">Company Value (Factored)</TableHead>
        <TableHead className="text-right cursor-pointer hover:bg-muted/50 bg-card" onClick={() => handlePESort('value')}>
          Value (Factored) {peSortColumn === 'value' && (peSortDirection === 'asc' ? '↑' : '↓')}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      ...
    </TableBody>
  </Table>
</CardContent>
```

---

### How It Works
- `[&>div]:max-h-[400px]` applies max-height to the Table's internal wrapper div
- The Table's wrapper already has `overflow-auto`, so it becomes the scroll container
- With only ONE scroll container, `sticky top-0` works correctly
- The `bg-card` on each TableHead ensures solid background when scrolling

---

### Result
- Single scroll context - no more nested overflow containers
- Header row stays pinned at top when scrolling
- Column names remain visible with opaque background
