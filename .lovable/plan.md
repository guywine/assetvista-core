

## Move Account Update Tracker to Assets Tab with Click-to-Filter Functionality

### Overview
Move the AccountUpdateTracker from the Pricing tab to the Assets tab and add functionality so clicking on a specific bank account (e.g., "Shimon -> Julius Bar") will automatically:
1. Filter assets to show only that entity + bank combination
2. Group the results by asset class

---

### Technical Approach

The cleanest approach is to:
1. Add an optional callback prop to `AccountUpdateTracker` for when an account is clicked
2. In `PortfolioDashboard`, handle this callback by setting the filters and grouping
3. Move the component's placement from Pricing tab to Assets tab

This keeps the AccountUpdateTracker component focused on its single responsibility while allowing the parent to control filtering/grouping behavior.

---

### Changes Required

#### 1. Update AccountUpdateTracker Component

**File: `src/components/portfolio/AccountUpdateTracker.tsx`**

Add an optional `onAccountClick` callback prop:

```tsx
interface AccountUpdateTrackerProps {
  assets: Asset[];
  onAccountClick?: (entity: AccountEntity, bank: AccountBank) => void;
}
```

Make the bank name row clickable (separate from the "Mark Updated" button):

```tsx
// In the account row, make the bank name clickable
<button
  className="flex items-center gap-4 flex-1 hover:bg-muted/30 rounded px-1 -ml-1"
  onClick={() => onAccountClick?.(entity, account.account_bank)}
>
  <span className="text-sm min-w-[120px]">{account.account_bank}</span>
  <span className={`text-sm ${statusColor}`}>
    {formatDate(lastUpdated)}
  </span>
</button>
```

---

#### 2. Update PortfolioDashboard

**File: `src/components/portfolio/PortfolioDashboard.tsx`**

Add a handler for the account click:

```tsx
const handleAccountClick = useCallback((entity: AccountEntity, bank: AccountBank) => {
  // Override filters to show only this entity + bank
  setFilters({
    account_entity: [entity],
    account_bank: [bank],
  });
  // Override grouping to group by class
  setGroupByFields(['class']);
}, []);
```

Move the AccountUpdateTracker from Pricing tab to Assets tab and pass the handler:

```tsx
<TabsContent value="assets" className="space-y-6">
  {/* Existing content */}
  <AssetSearch ... />
  
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <PortfolioFilters ... />
      <PortfolioGrouping ... />
    </div>
    {/* ... */}
  </div>
  
  {/* Add AccountUpdateTracker here, in a collapsible or as a side section */}
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <div className="lg:col-span-1">
      <AccountUpdateTracker 
        assets={assets} 
        onAccountClick={handleAccountClick}
      />
    </div>
    <div className="lg:col-span-3">
      <AssetTable ... />
    </div>
  </div>
</TabsContent>
```

Remove from Pricing tab - the Pricing tab will just have the PricingTable at full width.

---

#### 3. Update Pricing Tab Layout

**File: `src/components/portfolio/PortfolioDashboard.tsx`**

Simplify the Pricing tab now that AccountUpdateTracker is removed:

```tsx
<TabsContent value="pricing" className="space-y-6">
  <PricingTable
    groupAAssets={pricingGroupAAssets}
    groupBAssets={pricingGroupBAssets}
    onUpdateAsset={updateAsset}
  />
</TabsContent>
```

---

### Summary of Changes

| File | Change |
|------|--------|
| `AccountUpdateTracker.tsx` | Add optional `onAccountClick` prop, make bank rows clickable |
| `PortfolioDashboard.tsx` | Move component to Assets tab, add click handler, update Pricing tab layout |

---

### Behavior Summary

- Clicking on a bank name (e.g., "Julius Bar" under "Shimon") triggers the click handler
- This overrides any existing filters with: `entity = [Shimon], bank = [Julius Bar]`
- This overrides any existing grouping with: `group by = [class]`
- The "Mark Updated" button continues to work independently (no change to its behavior)
- User can still manually clear filters/grouping using the existing "Clear all" buttons

