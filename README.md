# README.md

```markdown
# 📍 Person Locator

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white)

> A fully interactive, browser-based platform that allows you to pin people's
> details and data to specific locations on a world map — no backend required.

---

## 📸 Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  📍 Person Locator          🔍 Search people...    [+ Add Person]│
├──────────────────────┬──────────────────────────────────────────┤
│  👥 People Directory │                                          │
│  ─────────────────── │            🗺️  Interactive Map           │
│  🔵 John Doe         │                                          │
│     friend           │         📍        📍                     │
│  🟡 Jane Smith       │                                          │
│     colleague        │              📍                          │
│  🔴 Bob Johnson      │                                          │
│     family           │                    📍                    │
│                      │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [How to Use](#-how-to-use)
- [Tech Stack](#-tech-stack)
- [Configuration](#-configuration)
- [Data Storage](#-data-storage)
- [Categories](#-categories)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Browser Support](#-browser-support)
- [Known Limitations](#-known-limitations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🗺️ Map Features
- **Interactive World Map** powered by Leaflet.js and OpenStreetMap
- **Click-to-Pin** — click anywhere on the map to place a person
- **Custom Color-Coded Markers** based on person category
- **Fly-to Animation** when selecting a person from the sidebar
- **Marker Popup** with quick actions (View, Delete)
- **Marker Opacity Filtering** when searching or filtering

### 👤 Person Management
- **Add People** with full personal details
- **Edit** any existing person's information
- **Delete** people with confirmation prompt
- **Photo Upload** — supports JPG, PNG, GIF (max 2MB)
- **Profile Avatars** with auto-generated initials as fallback

### 📋 Person Details
| Field        | Type     | Required |
|--------------|----------|----------|
| First Name   | Text     | ✅ Yes   |
| Last Name    | Text     | ✅ Yes   |
| Email        | Email    | ❌ No    |
| Phone        | Tel      | ❌ No    |
| Age          | Number   | ❌ No    |
| Category     | Select   | ❌ No    |
| Latitude     | Decimal  | ✅ Yes   |
| Longitude    | Decimal  | ✅ Yes   |
| Address      | Text     | ❌ No    |
| Notes        | Textarea | ❌ No    |
| Photo        | Image    | ❌ No    |

### 🔍 Search & Filter
- **Real-Time Search** across name, email, phone, and address
- **Category Filter** to view specific groups
- **Combined Filtering** — search and category filter work together
- **Visual Dimming** of non-matching markers on the map

### 📍 Location Tools
- **Click on Map** to auto-fill coordinates
- **Current Location** button using browser Geolocation API
- **Reverse Geocoding** via Nominatim API to auto-fill address
- **Manual Coordinate Entry** with lat/lng input fields

### 💾 Data & Storage
- **LocalStorage Persistence** — data survives page refreshes
- **No Backend Required** — fully client-side
- **JSON-Based** data structure

### 🎨 UI/UX
- **Responsive Design** — works on desktop and mobile
- **Slide-Out Detail Panel** for viewing full person profiles
- **Toast Notifications** for all user actions
- **Smooth Animations** throughout the interface
- **Modal Forms** for adding and editing
- **Keyboard Shortcuts** for common actions

---

## 📁 Project Structure

```
person-locator/
│
├── index.html              # Main HTML file — app entry point
│
├── css/
│   └── styles.css          # All styles, variables, and responsive rules
│
├── js/
│   └── app.js              # Core application logic (PersonLocator class)
│
└── README.md               # Project documentation (this file)
```

### File Breakdown

| File | Size (approx.) | Purpose |
|------|----------------|---------|
| `index.html` | ~150 lines | App structure, modals, sidebar, map container |
| `css/styles.css` | ~600 lines | Full styling with CSS custom properties |
| `js/app.js` | ~450 lines | Application class with all business logic |

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- An internet connection (for map tiles and reverse geocoding)
- No installation, framework, or build tools required

### Option 1 — Open Directly (Simplest)

```bash
# 1. Download or clone the project
git clone https://github.com/yourusername/person-locator.git

# 2. Navigate into the folder
cd person-locator

# 3. Open index.html in your browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Option 2 — Use a Local Server (Recommended)

Using **Node.js / npx**:
```bash
npx serve .
# Visit: http://localhost:3000
```

Using **Python**:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Visit: http://localhost:8000
```

Using **VS Code Live Server**:
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html`
3. Select **"Open with Live Server"**

Using **PHP**:
```bash
php -S localhost:8000
# Visit: http://localhost:8000
```

---

## 📖 How to Use

### ➕ Adding a Person

**Method 1 — Click on the Map**
1. Click anywhere on the map
2. A temporary grey marker appears with a popup
3. Click **"Add Person Here"** in the popup
4. The form opens with coordinates pre-filled
5. Fill in the person's details and click **"Save Person"**

**Method 2 — Use the Add Button**
1. Click the **"+ Add Person"** button in the header
2. Fill in the form fields
3. Enter coordinates manually or click **"Use My Current Location"**
4. Click **"Save Person"**

---

### 👁️ Viewing a Person

**From the Sidebar:**
- Click any person card in the left sidebar
- The map flies to their location and opens the marker popup
- The card highlights in purple

**From the Map:**
- Click any marker on the map
- A popup shows quick info
- Click **"View Details"** to open the full detail panel

---

### ✏️ Editing a Person

1. Open the detail panel (click a marker → "View Details")
2. Click the **"Edit"** button
3. Modify any fields in the form
4. Click **"Save Person"** to apply changes

---

### 🗑️ Deleting a Person

**Option A** — From the detail panel:
1. Click **"Delete"** button in the panel
2. Confirm the deletion in the prompt

**Option B** — From the map popup:
1. Click a marker on the map
2. Click **"Delete"** in the popup
3. Confirm the deletion

---

### 🔍 Searching & Filtering

**Search by name, email, phone, or address:**
```
Type in the search bar at the top → results update in real time
```

**Filter by category:**
```
Use the dropdown in the sidebar → select a category
```

**Combine both:**
```
Use search + category filter simultaneously
```

---

### 📍 Location Features

**Auto-detect your location:**
1. Open the Add/Edit form
2. Click **"Use My Current Location"**
3. Allow browser location access
4. Coordinates and address are auto-filled

**Reverse Geocoding:**
- Happens automatically when you click on the map
- Also triggered when using current location
- Fills the address field from coordinates

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **HTML5** | — | App structure and semantic markup |
| **CSS3** | — | Styling, animations, responsive layout |
| **JavaScript (ES6+)** | — | Application logic, DOM manipulation |
| **Leaflet.js** | 1.9.4 | Interactive map rendering and marker management |
| **OpenStreetMap** | — | Free and open map tile provider |
| **Nominatim API** | — | Free reverse geocoding (coordinates → address) |
| **Font Awesome** | 6.5.0 | Icons throughout the interface |
| **Google Fonts (Inter)** | — | Typography |
| **LocalStorage API** | — | Client-side data persistence |
| **Geolocation API** | — | Browser-based GPS location |
| **FileReader API** | — | Client-side photo upload and preview |

### External CDN Dependencies

```html
<!-- Leaflet Map -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Font Awesome Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## ⚙️ Configuration

You can customize the app by editing these values at the top of `js/app.js`:

### Default Map Center & Zoom
```javascript
this.map = L.map('map', {
    center: [20, 0],   // [latitude, longitude] — change to your region
    zoom: 3,           // 1 = world view, 18 = street level
});
```

### Map Tile Provider
```javascript
// Default: OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { ... });

// Alternative: CartoDB Light (minimalist)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { ... });

// Alternative: CartoDB Dark
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { ... });

// Alternative: Stamen Terrain
L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', { ... });
```

### Max Photo Size
```javascript
// In handlePhotoUpload()
if (file.size > 2 * 1024 * 1024) {   // Change 2 to any MB limit
    this.showToast('Photo must be less than 2MB.', 'error');
}
```

### CSS Color Theme
```css
/* In css/styles.css — :root section */
:root {
    --primary: #4F46E5;        /* Main brand color */
    --primary-dark: #4338CA;   /* Hover state */
    --success: #10B981;        /* Success toasts */
    --danger: #EF4444;         /* Delete actions */
    --warning: #F59E0B;        /* Warning toasts */
}
```

---

## 💾 Data Storage

All data is stored in the browser's **LocalStorage** under the key:

```
personLocatorData
```

### Data Structure

Each person is stored as a JSON object:

```json
{
  "id": "person_1700000000000_abc123xyz",
  "firstName": "Emmanuel",
  "lastName": "suah",
  "email": "mr.suah19@gmail.com",
  "phone": "0778662590",
  "category": "friend",
  "age": "28",
  "lat": 40.712776,
  "lng": -74.005974,
  "address": "Brewerville City, Liberia",
  "notes": "Met at the conference in 2023.",
  "photo": "data:image/jpeg;base64,...",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "updatedAt": "2026-01-20T14:22:00.000Z"
}
```

### Viewing Stored Data

Open your browser's DevTools and run:

```javascript
// View all people
JSON.parse(localStorage.getItem('personLocatorData'));

// Count people
JSON.parse(localStorage.getItem('personLocatorData')).length;

// Clear all data (⚠️ irreversible)
localStorage.removeItem('personLocatorData');
```

### Exporting Data

Run this in the browser console to download your data as JSON:

```javascript
const data = localStorage.getItem('personLocatorData');
const blob = new Blob([data], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'person-locator-backup.json';
a.click();
```

### Importing Data

```javascript
// Paste your JSON array string here
const imported = '[{"id":"person_...","firstName":"John",...}]';
localStorage.setItem('personLocatorData', imported);
location.reload(); // Refresh to load imported data
```

---

## 🏷️ Categories

| Category | Color | Badge Color | Use Case |
|----------|-------|-------------|----------|
| 👨‍👩‍👧 **Family** | Pink `#EC4899` | Pink | Relatives |
| 👫 **Friend** | Blue `#3B82F6` | Blue | Personal friends |
| 💼 **Colleague** | Amber `#F59E0B` | Amber | Work contacts |
| 🤝 **Client** | Green `#10B981` | Green | Business clients |
| 🔮 **Other** | Purple `#8B5CF6` | Purple | Everything else |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close modal or detail panel |
| `Enter` | Submit the form (when focused) |
| `Tab` | Navigate between form fields |

---

## 🌐 Browser Support

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome 80+ | ✅ Full | Recommended |
| Firefox 75+ | ✅ Full | |
| Edge 80+ | ✅ Full | |
| Safari 13+ | ✅ Full | |
| Opera 67+ | ✅ Full | |
| IE 11 | ❌ No | ES6+ not supported |
| Chrome Android | ✅ Full | Mobile |
| Safari iOS | ✅ Full | Mobile |

---

## ⚠️ Known Limitations

| Limitation | Description | Workaround |
|------------|-------------|------------|
| **LocalStorage Size** | Browser limit ~5MB | Photos increase size significantly; keep images small |
| **No Cloud Sync** | Data is browser-specific | Use the export/import method to transfer data |
| **Photo Size** | Max 2MB per photo | Compress images before uploading |
| **Geocoding Rate Limit** | Nominatim has usage limits | For heavy use, consider a paid geocoding API |
| **Offline Maps** | Requires internet for map tiles | Use a cached tile provider for offline support |
| **No Multi-User** | Single browser session only | Would require a backend for multi-user support |

---

## 🗺️ Roadmap

### Version 1.1
- [ ] Export people list as CSV or PDF
- [ ] Import people from CSV
- [ ] Drag-and-drop markers to update location
- [ ] Cluster markers for dense areas

### Version 1.2
- [ ] Dark mode toggle
- [ ] Multiple map tile themes
- [ ] Distance calculator between two people
- [ ] Draw radius circle around a person

### Version 2.0
- [ ] Backend integration (Node.js + MongoDB)
- [ ] User authentication and accounts
- [ ] Cloud data sync
- [ ] Share a person's location via link
- [ ] Group/Team management
- [ ] Bulk import/export
- [ ] Advanced search with date filters

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/yourusername/person-locator.git

# 3. Create a new branch
git checkout -b feature/your-feature-name

# 4. Make your changes
# (edit HTML, CSS, or JS files)

# 5. Test in multiple browsers

# 6. Commit your changes
git add .
git commit -m "feat: add your feature description"

# 7. Push to your fork
git push origin feature/your-feature-name

# 8. Open a Pull Request on GitHub
```

### Commit Message Convention

```
feat:     New feature
fix:      Bug fix
style:    CSS/UI changes
refactor: Code restructuring
docs:     Documentation updates
chore:    Maintenance tasks
```

---

## 📄 License

```
MIT License

Copyright (c) 2026 lifeemotorola

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgements

| Resource | Purpose |
|----------|---------|
| [Leaflet.js](https://leafletjs.com/) | Open-source interactive maps |
| [OpenStreetMap](https://www.openstreetmap.org/) | Free map tile data |
| [Nominatim](https://nominatim.org/) | Free reverse geocoding API |
| [Font Awesome](https://fontawesome.com/) | Icon library |
| [Google Fonts](https://fonts.google.com/) | Inter typeface |

---

<div align="center">

Made with ❤️ using pure HTML, CSS, and JavaScript

⭐ Star this repo if you found it useful!

</div>
```
