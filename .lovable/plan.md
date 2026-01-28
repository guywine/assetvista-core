
## Fix Sticky Header Background in Private Equity Holdings Table

### Problem
The sticky header is set up, but the individual column header cells (`TableHead`) don't have their own background color, so content may show through when scrolling.

---

### Change Required

**File: `src/components/portfolio/PortfolioSummary.tsx`** (Lines 1407-1422)

Add `bg-card` to each `TableHead` cell so they have a solid background that covers content when scrolling:

```tsx
<TableHeader className="sticky top-0 z-10">
  <TableRow>
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 bg-card"
      onClick={() => handlePESort('name')}
    >
      Asset Name {peSortColumn === 'name' && (peSortDirection === 'asc' ? '↑' : '↓')}
    </TableHead>
    <TableHead className="text-right bg-card">Holding %</TableHead>
    <TableHead className="text-right bg-card">Company Value (Factored)</TableHead>
    <TableHead 
      className="text-right cursor-pointer hover:bg-muted/50 bg-card"
      onClick={() => handlePESort('value')}
    >
      Value (Factored) {peSortColumn === 'value' && (peSortDirection === 'asc' ? '↑' : '↓')}
    </TableHead>
  </TableRow>
</TableHeader>
```

---

### Result
- Each column header cell will have a solid background
- Content won't show through the header when scrolling
- Column names remain visible at all times
