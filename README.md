# 📍 Liberia Community Locator

A browser-based household and resident directory built for community enumeration
in **Liberia** — no server, no build step, no account. Enumerators tap a point on
the map, record a household, and the data stays on the device until it is
exported as CSV or JSON.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## Why it exists

Field teams in Liberia often work with paper forms, landmark directions and
spreadsheets that are hard to map. This tool puts each household on a map,
records the Liberian administrative hierarchy (**county → district → community →
clan**), and produces data that can be handed to a supervisor as a CSV at the end
of the day.

It is a static site: `index.html`, `styles.css`, `app.js`. Open it from a laptop,
a phone, or a USB stick — no installation and no database.

---

## What's inside

### 🗺️ Map built for Liberia
- Opens on **Monrovia** (`6.3156, -10.8074`) instead of a world view
- **Street map + satellite imagery** toggle (OSM / Esri World Imagery) — OpenStreetMap
  coverage is thin outside Monrovia, so satellite is often the only usable reference
- **Place search** limited to Liberia (Nominatim) for streets, communities and towns
- **Jump to county** menu with all 15 counties and their capitals
- **Fit all** households, and **My location** with an accuracy circle
- Markers colored by occupancy (owner, renter, caretaker, vacant, business),
  with hover tooltips and popups
- Tap the map → “Register household here” → the form opens with coordinates and a
  reverse-geocoded address already filled in

### 🇱🇷 Liberian data model
| Group | Fields |
|---|---|
| Administration | County (15), district, community / quarter / town, clan (rural), zone / enumeration area, enumeration area code |
| Structure | Type (concrete bungalow, storey building, mud “country” house, zinc/makeshift, compound, apartment, commercial), wall material, roof material, condition, year built, floors, rooms |
| Household | House / structure ID, plot, block, street, nearest landmark |
| Head | Name, sex, age, marital status, nationality, livelihood, mobile number (+231), email |
| Members | Name, age, sex, relationship; totals for male, female, under-18, 60+, disability |
| Services | LWSC / kiosk / hand pump / well / river water, LEC grid / mini-grid / solar / generator, charcoal / firewood / LPG cooking fuel, internet, **MTN MoMo / Orange Money**, toilet type, waste collection (MCC / community bin / open dump) |
| Health & social | Nearest facility + distance, **NHIS**, free health care (FHCI), EPI, HIV/TB, nutrition, Social Cash Transfer, NASSCORP, disability support |
| Survey | Enumerated by, survey date, consent, remarks |

### ✅ Data quality guardrails
- Required: household ID, county, coordinates, and a head name (unless vacant)
- Liberian mobile numbers are normalised to `+231 77 123 4567`; odd numbers get a warning
- Points outside Liberia's bounding box trigger a confirmation before saving
- Duplicate check: the same household ID recorded within 25 m of an existing one
- Count warnings when male + female, or under-18 + 60+, exceed total persons
- Consent is recorded per household and shown on the detail panel and printout
- All user-entered text is HTML-escaped before rendering (no injected markup)

### 💾 Data you can actually take away
- **CSV export** (Excel-ready, UTF-8 BOM, ~55 labelled columns, members flattened)
- **JSON backup** and **import** (merge or replace), with migration of older records
- **Print a directory** of the current filtered list, or **print one household record**
- **Load 10 demo households** to explore the app, and clear them any time
- Delete-all requires typing `DELETE`
- Storage stays in `localStorage`; the sidebar shows how much space is used

### 📱 Working in the field
- Responsive layout: sidebar + map on desktop, stacked with a full-screen detail
  panel on phones
- Big tap targets and 16px form text to stop iOS zooming
- Shortcuts: `Ctrl/⌘ + K` search, `N` new household, `Esc` close panels
- Detail panel quick actions: call, WhatsApp, copy GPS, print
- "FHH" badge marks female-headed households at a glance

---

## Run it

No build tools are required.

```bash
# Option 1 — open the file
xdg-open index.html      # Linux
open index.html          # macOS
start index.html         # Windows

# Option 2 — local server (recommended, avoids file:// restrictions)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Internet is needed for map tiles, place search and reverse geocoding. Data entry
itself (list, form, export, print) works without a connection.

### Optional: pre-cache tiles for offline field days
Open the area you need at the zoom levels you use while still online; the browser
caches recently viewed tiles. For guaranteed offline maps, host your own tile set
and change the `street` layer URL in `app.js`.

---

## Project structure

```
.
├── index.html     # Markup: header, directory, map, form, detail panel, print area
├── styles.css     # Design system, components, responsive rules, print styles
├── app.js         # LIBERIA reference data + CommunityLocator class
├── LICENSE        # MIT
└── README.md
```

| File | Purpose |
|---|---|
| `index.html` | App shell, four-tab household form, data menu, datalists, print container |
| `styles.css` | CSS variables, layout, components, mobile + print rules |
| `app.js` | Map, form logic, storage, filters, validation, export/import, printing |

---

## Using it

### Register a household
1. Tap the map where the house is, then **Register household here**
   (or press **Add Household** / `N`).
2. **House** tab: structure ID and county are required. District, community, clan
   and street have Liberia-aware suggestions as you type.
3. **Residents** tab: head details, then add members. Set the totals so health and
   social teams can plan for under-18s, over-60s and people with disabilities.
4. **Location** tab: coordinates come from the map. Add a landmark — most Liberian
   addresses are landmark-based.
5. **Services** tab: water, electricity, cooking fuel, mobile money, sanitation,
   programs, enumerator name, consent.
6. **Save household** — the map flies to the record.

### Find a household
- Search by name, phone, community, county, landmark or member name.
- Filter by county, district, status or street; markers for non-matches dim.
- Select a result to fly to it, or open **View** in its popup for full details.

### Hand over data
- **Data → Export CSV** for Excel / supervisor reports (respects current filters).
- **Data → Export JSON backup** for a full, re-importable copy.
- **Print directory** for a paper list, or **Print** in a household's detail panel.

---

## Data storage

Data is stored in the browser under `liberiaCommunityLocator.v2`. Records from
the older version of this app (stored under `communityLocatorData`) are migrated
once on first load — old barangay/purok values are mapped to community, PhilHealth
to NHIS, Meralco to LEC, and so on, without deleting the original fields.

Sample record:

```json
{
  "id": "hh_1793000000000_ab12cd34e",
  "houseNumber": "SKR-014",
  "houseLot": "Plot 14",
  "houseBlock": "Block B",
  "houseStreet": "Tubman Boulevard",
  "houseClan": "",
  "county": "Montserrado",
  "district": "Greater Monrovia",
  "community": "Sinkor",
  "houseType": "concrete_storey",
  "houseStatus": "owner",
  "wallMaterial": "concrete_block",
  "roofMaterial": "zinc",
  "structureCondition": "good",
  "yearBuilt": "1998",
  "floorCount": "2",
  "roomCount": "6",
  "head": {
    "firstName": "Emmanuel",
    "lastName": "Kollie",
    "age": "48",
    "gender": "male",
    "civilStatus": "married",
    "nationality": "liberian",
    "occupation": "Civil servant",
    "contact": "+231 77 123 4567",
    "email": ""
  },
  "totalPersons": 5,
  "totalMale": 2,
  "totalFemale": 3,
  "totalMinors": 2,
  "totalSenior": 1,
  "totalPwd": 0,
  "members": [
    { "firstName": "Mamie", "lastName": "Kollie", "age": "43", "gender": "female", "relation": "Spouse" }
  ],
  "lat": 6.2884,
  "lng": -10.7816,
  "fullAddress": "Tubman Boulevard, Sinkor, Monrovia, Montserrado County",
  "landmark": "Opposite the Total filling station",
  "zone": "Zone 3",
  "enumArea": "LR-MO-014",
  "incomeClass": "non_poor",
  "mobileMoney": "mtn_momo",
  "waterSource": "lwsc_piped",
  "electricitySource": "lec_grid",
  "cookingFuel": "charcoal",
  "internetAccess": "mobile",
  "toiletType": "flush",
  "wasteDisposal": "mcc",
  "nearestClinic": "JFK Memorial Hospital",
  "clinicDistance": "2.4",
  "healthPrograms": ["nhis", "epi"],
  "remarks": "",
  "surveyedBy": "A. Doe",
  "surveyDate": "2026-10-12",
  "consent": true,
  "createdAt": "2026-10-12T09:15:00.000Z",
  "updatedAt": "2026-10-12T09:15:00.000Z"
}
```

### Backups matter
`localStorage` is per browser and per device. Clearing browser data, using a
private window, or switching phones will lose records. Export JSON/CSV at the end
of every field day.

---

## Customising

All reference data lives at the top of `app.js` in the `LIBERIA` object:

```js
const LIBERIA = {
    center: [6.3156, -10.8074],                      // Monrovia
    zoom: 13,
    bounds: { minLat: 4.25, maxLat: 8.60,
              minLng: -11.60, maxLng: -7.30 },       // used to flag points outside Liberia
    counties: [ /* 15 counties + capitals + map centres */ ],
    districts: { Montserrado: [ /* 5 districts */ ] },
    communities: { Montserrado: [ /* Monrovia quarters */ ], /* … */ },
    streets: [ /* Monrovia street suggestions */ ]
};
```

- **Add districts for another county** under `districts`. The form shows them as
  autocomplete suggestions; enumerators can always type a district by hand, so no
  county is blocked by a missing list.
- **Add communities or streets** to improve autocomplete.
- **Adjust validation** in `saveHousehold()` (required fields, phone format,
  duplicate radius) and `formatPhone()` (prefixes).
- **Rebrand** colors in the `:root` block of `styles.css` (`--primary`, status colors).
- **Change programs, water, power or fuel options** in `index.html` and add the
  matching labels to `LABELS` in `app.js` — the detail panel and CSV export use them.

### Reference data used
- 15 counties and capitals; Montserrado's five districts
- Monrovia quarters (Sinkor, Paynesville, West Point, Clara Town, New Kru Town,
  Gardnersville, Congo Town, Brewerville, Johnsonville, Caldwell, Barnesville, …)
- Utility and service providers: **LEC**, **LWSC**, **MCC**, MTN MoMo, Orange Money
- Health & social programs: **NHIS**, **FHCI**, **EPI**, HIV/TB care, nutrition,
  **Social Cash Transfer**, **NASSCORP**, disability support

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl / ⌘ + K` | Focus the search box |
| `N` | New household (when not typing) |
| `Esc` | Close the form, detail panel, menus or temp marker |
| `Enter` / `Space` | Open the focused household card |

---

## Browser support

| Browser | Supported |
|---|---|
| Chrome / Edge 90+ | ✅ |
| Firefox 90+ | ✅ |
| Safari 15+ (macOS / iOS) | ✅ |
| Chrome on Android | ✅ |
| Internet Explorer | ❌ |

Geolocation requires `https://` or `localhost` and the user's permission.

---

## Known limitations

| Limitation | Notes |
|---|---|
| Local-only storage | No sync between devices — export/import JSON to move data |
| Browser storage cap | Roughly 5 MB per origin; records are small, so thousands fit |
| Map tiles need internet | Pre-cache areas or host your own tiles for offline days |
| Place search needs internet | Nominatim public service; respect its usage policy (no bulk queries) |
| District lists | Curated for Montserrado only; other counties accept free text |
| No user accounts | Anyone with the device can read the directory — protect the device |
| Consent | Recorded per household; honour withdrawal requests and delete records |

---

## Roadmap

- [ ] Marker clustering for dense Monrovia neighborhoods
- [ ] Offline tile pack + service worker for full offline use
- [ ] Optional PIN lock and encrypted export
- [ ] Import CSV as well as JSON
- [ ] Photo of the structure (compressed, stored locally)
- [ ] County/district summary report (coverage, WASH and programme indicators)
- [ ] Curated district lists for all 15 counties
- [ ] Sync to a shared server when a connection is available

---

## Contributing

```bash
git checkout -b feature/your-change
# edit index.html / styles.css / app.js
# test on desktop and a phone, online and offline
git commit -m "feat: describe the change"
```

Please keep the app dependency-free (Leaflet + Font Awesome via CDN only) and
test that old backups still import.

---

## Acknowledgements

| Resource | Purpose |
|---|---|
| [Leaflet](https://leafletjs.com/) | Mapping library |
| [OpenStreetMap](https://www.openstreetmap.org/) | Street tiles |
| [Esri World Imagery](https://www.arcgis.com/) | Satellite tiles |
| [Nominatim](https://nominatim.org/) | Place search and reverse geocoding |
| [Font Awesome](https://fontawesome.com/) | Icons |
| [Google Fonts](https://fonts.google.com/) | Inter typeface |

---

## License

MIT © 2026 lifeemotorola. See [LICENSE](LICENSE).

<div align="center">

Built for community enumerators in Liberia 🇱🇷

</div>
