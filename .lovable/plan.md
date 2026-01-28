

## Freeze Header Row in Private Equity Holdings Table

### Overview
Make the table header sticky so it remains visible when scrolling through the table.

---

### Changes Required

**File: `src/components/portfolio/PortfolioSummary.tsx`** (Lines ~1404-1444)

#### 1. Wrap Table in Scrollable Container

Add a container with a max-height and overflow to enable scrolling:

```tsx
<CardContent>
  <div className="max-h-[400px] overflow-auto">
    <Table>
      ...
    </Table>
  </div>
</CardContent>
```

#### 2. Add Sticky Header Styling

Add sticky positioning and background to `TableHeader`:

```tsx
<TableHeader className="sticky top-0 bg-card z-10">
  <TableRow>
    ...
  </TableRow>
</TableHeader>
```

---

### Result
- Table will have a fixed height of 400px maximum
- Header row stays pinned at the top when scrolling
- Background color ensures header doesn't become transparent over content

