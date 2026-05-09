# Feature Recommendations

Tracked suggestions and design decisions for future implementation. Each entry includes context, recommended approach, and open questions.

---

## Vehicle Make/Model Smart Selection

**Area:** Vehicle Add Wizard — Step 2 (Details)

**Problem:** Currently, Company and Model are free-text fields. Users must type everything manually, leading to inconsistent data (e.g., "RE", "Royal Enfield", "royal enfield" all meaning the same thing) and more effort per entry.

**Proposed UX:**
1. User selects a company from a searchable dropdown (e.g., Royal Enfield, Hero, Honda, Bajaj, TVS, Yamaha, Maruti Suzuki…)
2. Once a company is selected, the Model field becomes a searchable select filtered to that company's known models
3. Both dropdowns include an **"Other (type manually)"** fallback so users are never blocked
4. Variant and Color remain free-text — too many combinations to enumerate meaningfully

**Recommended Implementation:** Static bundled JSON

- A local `src/data/vehicleCatalog.json` with curated Indian makes and their models
- No external API, no latency, no API key, works offline
- Covers ~90% of users with ~20–30 popular makes
- Easy to update: just edit the JSON file

**Alternative Considered:** External API (e.g., NHTSA or India-specific vehicle DB)
- Rejected for initial implementation: adds network dependency, latency on every search, API key management, and cost — not justified for relatively stable make/model data

**Affected Files:**
- `src/components/vehicles/AddVehicleWizard.tsx` — Step 2 component
- `src/components/vehicles/EditVehicleForm.tsx` — same fields exist here, should stay in sync
- New: `src/data/vehicleCatalog.json` — the curated data file

**Open Questions Before Implementation:**
- Scope: 2-wheelers only, or also 4-wheelers and trucks?
- Should model selection also auto-populate the `name` field (Step 1), or leave it manual?
- Does selecting a make/model auto-fill the vehicle `name` in Step 1 as a convenience?

**Status:** Pending — awaiting scope confirmation from user
