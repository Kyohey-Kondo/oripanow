# Quickstart: Region Filter Tabs

## Files to change

| File | Change |
|------|--------|
| `apps/web/lib/regions.ts` | **NEW** — REGIONS config + helpers |
| `apps/web/lib/posts.ts` | Add optional `regionAreas?` param to `getTodayOnSalePosts` |
| `apps/web/app/oripa/page.tsx` | Read `?region` param; render 2-tier tabs; pass regionAreas to getTodayOnSalePosts |
| `apps/web/app/oripa/oripa.module.css` | Add `.regionTabs` styles (mirrors `.areaTabs`) |

## Local dev

```bash
pnpm --filter @oripa-now/web dev
# Visit http://localhost:3000/oripa
# Test: /oripa?region=kanto  → only Kanto area tabs shown
# Test: /oripa?region=kansai → only Kansai area tabs shown
# Test: /oripa?region=kanto&area=akihabara → Kanto tabs, Akihabara active
# Test: /oripa  → all area tabs (全国)
```

## Verification checklist

- [ ] 全国 tab shows all 7 area tabs
- [ ] 関東 tab shows 5 area tabs (秋葉原・池袋・新宿・川越・大宮)
- [ ] 関西 tab shows 2 area tabs (なんば・梅田)
- [ ] Selecting a region with no area shows cards from all areas in that region
- [ ] Existing `?area=akihabara` URL still works (region param absent = 全国)
- [ ] `?region=kanto&area=akihabara` deep-link works
- [ ] Playwright screenshot at mobile (390px) and desktop (1280px) widths
