

## Redesign Account Update Tracker as Full-Width Horizontal Bar

### Problem
The Account Update Tracker currently sits in a 1/4-width sidebar (`lg:grid-cols-4` with `lg:col-span-1`), squeezing the Assets table into 3/4 width and forcing horizontal scrolling.

### Solution
Move the tracker above the table at full width, redesigning it as a compact horizontal card where each entity is displayed as an inline expandable column/chip.

### New Layout

```text
Before:
+------------------+----------------------------------------------+
| Account Tracker  |                                              |
| (1/4 width)      |          Assets Table (3/4 width)            |
|  Entity A        |          (needs horizontal scroll)           |
|    - Bank 1      |                                              |
|    - Bank 2      |                                              |
|  Entity B        |                                              |
|    - Bank 3      |                                              |
+------------------+----------------------------------------------+

After:
+---------------------------------------------------------------------+
| Account Update Tracker                                          [3] |
| [Entity A *] [Entity B *] [Entity C *]  (clickable chips)          |
|  v Entity A expanded:  Bank1 - Jan 15 [Mark] | Bank2 - Feb 01 [Mark]|
+---------------------------------------------------------------------+
|                                                                     |
|              Assets Table (FULL WIDTH - no scroll)                  |
|                                                                     |
+---------------------------------------------------------------------+
```

### Design Details

Each entity becomes a horizontal chip/badge showing:
- Entity name + status dot (worst color of its banks)
- Clicking a chip expands a row below showing that entity's banks in a horizontal flow
- Banks display inline: `BankName - LastUpdated [Mark Updated]`
- Multiple entities can be expanded simultaneously
- "Mark All" button appears next to the entity name when expanded

### Technical Changes

**File 1: `src/components/portfolio/PortfolioDashboard.tsx`**
- Remove the `grid grid-cols-1 lg:grid-cols-4` wrapper
- Place `AccountUpdateTracker` above `AssetTable` at full width (stacked vertically)
- `AssetTable` gets full width with no grid constraint

**File 2: `src/components/portfolio/AccountUpdateTracker.tsx`**
- Replace the vertical collapsible list layout with a horizontal design:
  - Card header stays compact (single row with title + count badge)
  - Entity list becomes a horizontal flex row of clickable chips/badges
  - Each chip shows: entity name + colored status dot
  - Expanded content appears below the chips row as a horizontal flow of bank items
  - Bank items laid out with `flex-wrap` so they flow naturally across the full width
  - Each bank item: `BankName - Date [Mark Updated]` in a compact inline format
  - "Mark All for Entity" button moves inline next to the entity name in the expanded section
  - Confirmation dialogs remain unchanged

### Visual Spec

- Chips: Use existing `Badge` component with `variant="outline"`, add status dot, cursor-pointer
- Active/expanded chip: slightly different background (`bg-muted`)
- Expanded bank row: light border-top, `flex flex-wrap gap-3`, compact items
- Each bank item: small text, status-colored date, small "Mark Updated" button
