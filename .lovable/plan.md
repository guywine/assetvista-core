

## Round Company Value to Whole Numbers

### Change Required

**File: `src/components/portfolio/PortfolioSummary.tsx`** (Line 1435)

Change `.toFixed(1)` to `.toFixed(0)` to remove decimal places:

```tsx
// Before
? `${(item.companyValueFactored / 1000000).toFixed(1)}M`

// After
? `${(item.companyValueFactored / 1000000).toFixed(0)}M`
```

---

### Result

| Before | After |
|--------|-------|
| 5.2M | 5M |
| 12.7M | 13M |
| 0.8M | 1M |

Values will be rounded to the nearest whole million.

