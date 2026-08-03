// ============================================
// COMMUNITY LOCATOR — FIXED LOCATION TRACKER
// ============================================

class CommunityLocator {
    constructor() {
        this.households   = this.loadFromStorage();
        this.map          = null;
        this.markers      = {};
        this.editingId    = null;
        this.tempMarker   = null;
        this.activeTab    = 'house';
        this.pendingLatLng = null; // ← stores clicked coordinates safely

        this.init();
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        this.initMap();
        this.bindEvents();
        this.renderHouseholds();
        this.renderAllMarkers();
        this.updateStats();
        this.populateStreetFilter();
    }

    // ─────────────────────────────────────────
    // MAP INITIALIZATION
    // ─────────────────────────────────────────
    initMap() {
        // Prevent double-initialization
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.map = L.map('map', {
            center: [14.5995, 120.9842],
            zoom: 14,
            zoomControl: true,
            preferCanvas: false
        });

        // Tile layer with error handling
        const tileLayer = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19,
                errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
            }
        );

        tileLayer.on('tileerror', () => {
            this.showToast('Some map tiles failed to load. Check your internet.', 'warning');
        });

        tileLayer.addTo(this.map);

        // ✅ FIX: map click uses arrow function — safe `this` reference
        this.map.on('click', (e) => {
            this.onMapClick(e.latlng);
        });

        // Invalidate map size after render (fixes blank map issue)
        setTimeout(() => {
            this.map.invalidateSize();
        }, 300);
    }

    // ─────────────────────────────────────────
    // MAP CLICK → PLACE TEMP MARKER
    // ─────────────────────────────────────────
    onMapClick(latlng) {
        // Remove old temp marker safely
        this.removeTempMarker();

        // Store coordinates safely — no inline onclick dependency
        this.pendingLatLng = { lat: latlng.lat, lng: latlng.lng };

        // Create temp marker
        this.tempMarker = L.marker([latlng.lat, latlng.lng], {
            icon: this.createMarkerIcon('vacant'),
            zIndexOffset: 1000
        }).addTo(this.map);

        // ✅ FIX: Use bound button ID in popup, not inline onclick with app reference
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
            <div class="popup-header">
                <div class="popup-house-num">📍 New Location</div>
                <div class="popup-street">
                    ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}
                </div>
            </div>
            <div class="popup-body">
                <div class="popup-row">
                    <i class="fas fa-info-circle"></i>
                    Click the button below to register a household here.
                </div>
            </div>
            <div class="popup-actions">
                <button id="registerHereBtn" class="popup-btn-view">
                    🏠 Register Household Here
                </button>
                <button id="cancelTempBtn" class="popup-btn-edit">
                    Cancel
                </button>
            </div>
        `;

        // Bind popup events AFTER popup is opened
        this.tempMarker.bindPopup(popupContent, {
            maxWidth: 280,
            className: 'community-popup'
        });

        this.tempMarker.on('popupopen', () => {
            const regBtn    = document.getElementById('registerHereBtn');
            const cancelBtn = document.getElementById('cancelTempBtn');

            if (regBtn) {
                regBtn.addEventListener('click', () => {
                    this.registerAtPendingLocation();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.removeTempMarker();
                    this.map.closePopup();
                });
            }
        });

        this.tempMarker.openPopup();

        // ✅ FIX: Reverse geocode and update popup subtitle
        this.reverseGeocodeQuiet(latlng.lat, latlng.lng, (address) => {
            if (this.tempMarker) {
                const street = popupContent.querySelector('.popup-street');
                if (street) {
                    street.textContent = address
                        ? address.split(',').slice(0, 3).join(',')
                        : `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
                }
            }
        });
    }

    // ─────────────────────────────────────────
    // OPEN MODAL FROM PENDING LOCATION
    // ─────────────────────────────────────────
    registerAtPendingLocation() {
        if (!this.pendingLatLng) {
            this.showToast('No location selected. Click on the map first.', 'error');
            return;
        }

        const { lat, lng } = this.pendingLatLng;
        this.removeTempMarker();
        this.map.closePopup();
        this.openModal(null, lat, lng);
    }

    // ─────────────────────────────────────────
    // REMOVE TEMP MARKER SAFELY
    // ─────────────────────────────────────────
    removeTempMarker() {
        if (this.tempMarker) {
            try {
                this.map.removeLayer(this.tempMarker);
            } catch (e) {
                console.warn('Could not remove temp marker:', e);
            }
            this.tempMarker = null;
        }
        this.pendingLatLng = null;
    }

    // ─────────────────────────────────────────
    // EVENT BINDINGS
    // ─────────────────────────────────────────
    bindEvents() {
        // Add household button
        document.getElementById('addHouseBtn')
            .addEventListener('click', () => this.openModal());

        // Modal close buttons
        document.getElementById('modalClose')
            .addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn')
            .addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay')
            .addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this.closeModal();
            });

        // Form submit
        document.getElementById('houseForm')
            .addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveHousehold();
            });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Add member
        document.getElementById('addMemberBtn')
            .addEventListener('click', () => this.addMemberRow());

        // ✅ FIX: Location buttons properly bound
        document.getElementById('useCurrentLocation')
            .addEventListener('click', () => this.useCurrentLocation());

        document.getElementById('pickFromMap')
            .addEventListener('click', () => this.startPickFromMap());

        // ✅ FIX: Coordinate inputs — manually typing lat/lng places a preview marker
        document.getElementById('latitude')
            .addEventListener('change', () => this.onCoordinateInput());
        document.getElementById('longitude')
            .addEventListener('change', () => this.onCoordinateInput());

        // Search & filter
        document.getElementById('searchInput')
            .addEventListener('input', () => this.applyFilters());
        document.getElementById('filterStatus')
            .addEventListener('change', () => this.applyFilters());
        document.getElementById('filterStreet')
            .addEventListener('change', () => this.applyFilters());

        // Detail panel close
        document.getElementById('closeDetail')
            .addEventListener('click', () => this.closeDetailPanel());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDetailPanel();
                this.removeTempMarker();
            }
        });
    }

    // ─────────────────────────────────────────
    // TABS
    // ─────────────────────────────────────────
    switchTab(tabName) {
        this.activeTab = tabName;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.toggle('active', tab.id === `tab-${tabName}`);
        });

        // Refresh map size when location tab is opened
        if (tabName === 'location' && this.modalMiniMap) {
            setTimeout(() => this.modalMiniMap.invalidateSize(), 200);
        }
    }

    // ─────────────────────────────────────────
    // MODAL OPEN / CLOSE
    // ─────────────────────────────────────────
    openModal(household = null, lat = null, lng = null) {
        this.resetForm();
        this.switchTab('house');

        const title = document.getElementById('modalTitle');

        if (household) {
            this.editingId = household.id;
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Household';
            this.populateForm(household);
        } else {
            this.editingId = null;
            title.innerHTML = '<i class="fas fa-home"></i> Register Household';
            document.getElementById('surveyDate').value =
                new Date().toISOString().split('T')[0];

            if (lat !== null && lng !== null) {
                this.setCoordinates(lat, lng);
            }
        }

        document.getElementById('modalOverlay').classList.add('active');

        // ✅ FIX: Invalidate map size after modal opens
        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 400);
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        this.editingId = null;
        this.resetForm();
    }

    resetForm() {
        document.getElementById('houseForm').reset();
        document.getElementById('membersList').innerHTML = '';
        document.querySelectorAll('input[name="healthProgram"]')
            .forEach(cb => (cb.checked = false));

        // Clear coordinate preview
        this.clearCoordinatePreview();
    }

    // ─────────────────────────────────────────
    // SET COORDINATES — SINGLE SOURCE OF TRUTH
    // ─────────────────────────────────────────
    setCoordinates(lat, lng) {
        document.getElementById('latitude').value  = parseFloat(lat).toFixed(6);
        document.getElementById('longitude').value = parseFloat(lng).toFixed(6);
        this.updateCoordinateDisplay(lat, lng);
        this.reverseGeocodeToAddress(lat, lng);
    }

    updateCoordinateDisplay(lat, lng) {
        const display = document.getElementById('coordinateDisplay');
        if (display) {
            display.innerHTML = `
                <i class="fas fa-check-circle" style="color:var(--success)"></i>
                Location set: <strong>${parseFloat(lat).toFixed(5)},
                ${parseFloat(lng).toFixed(5)}</strong>
            `;
            display.className = 'coordinate-display set';
        }
    }

    clearCoordinatePreview() {
        const display = document.getElementById('coordinateDisplay');
        if (display) {
            display.innerHTML = `
                <i class="fas fa-exclamation-circle" style="color:var(--warning)"></i>
                No location set. Click on the map or use the buttons below.
            `;
            display.className = 'coordinate-display';
        }
        document.getElementById('latitude').value  = '';
        document.getElementById('longitude').value = '';
        document.getElementById('fullAddress').value = '';
    }

    // ─────────────────────────────────────────
    // COORDINATE INPUT (manual typing)
    // ─────────────────────────────────────────
    onCoordinateInput() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);

        if (!isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180) {
            this.updateCoordinateDisplay(lat, lng);
        }
    }

    // ─────────────────────────────────────────
    // PICK FROM MAP (while modal is open)
    // ─────────────────────────────────────────
    startPickFromMap() {
        this.closeModal();
        this.showToast('Click anywhere on the map to set the location.', 'success');

        // Show a visual indicator on the map
        const indicator = document.createElement('div');
        indicator.id = 'pickingIndicator';
        indicator.innerHTML = `
            <i class="fas fa-crosshairs"></i>
            Picking mode — Click anywhere on the map
            <button id="cancelPickBtn">Cancel</button>
        `;
        indicator.style.cssText = `
            position: absolute;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary);
            color: white;
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 600;
            z-index: 999;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--shadow-lg);
            font-family: 'Inter', sans-serif;
        `;

        const mapWrapper = document.querySelector('.map-wrapper');
        mapWrapper.style.position = 'relative';
        mapWrapper.appendChild(indicator);

        // Style the cancel button inside indicator
        const cancelPickBtn = document.getElementById('cancelPickBtn');
        if (cancelPickBtn) {
            cancelPickBtn.style.cssText = `
                background: rgba(255,255,255,0.3);
                border: none;
                color: white;
                padding: 4px 12px;
                border-radius: 50px;
                cursor: pointer;
                font-size: 12px;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
            `;

            cancelPickBtn.addEventListener('click', () => {
                this.stopPickFromMap();
                this.openModal(
                    this.editingId
                        ? this.households.find(h => h.id === this.editingId)
                        : null
                );
            });
        }

        // Add cursor style to map
        this.map.getContainer().style.cursor = 'crosshair';

        // One-time click listener for picking
        this._pickHandler = (e) => {
            this.stopPickFromMap();
            this.pendingLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
            this.openModal(
                this.editingId
                    ? this.households.find(h => h.id === this.editingId)
                    : null,
                e.latlng.lat,
                e.latlng.lng
            );
            this.switchTab('location');
        };

        this.map.once('click', this._pickHandler);
    }

    stopPickFromMap() {
        const indicator = document.getElementById('pickingIndicator');
        if (indicator) indicator.remove();

        this.map.getContainer().style.cursor = '';

        if (this._pickHandler) {
            this.map.off('click', this._pickHandler);
            this._pickHandler = null;
        }
    }

    // ─────────────────────────────────────────
    // GEOLOCATION — CURRENT LOCATION
    // ─────────────────────────────────────────
    useCurrentLocation() {
        // ✅ FIX: Full geolocation with all error codes handled
        if (!navigator.geolocation) {
            this.showToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        const btn = document.getElementById('useCurrentLocation');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
        }

        this.showToast('Detecting your location...', 'success');

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,       // 10 second timeout
            maximumAge: 30000     // Accept 30-second cached position
        };

        navigator.geolocation.getCurrentPosition(
            // ✅ SUCCESS
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                this.setCoordinates(latitude, longitude);
                this.map.flyTo([latitude, longitude], 17, { duration: 1.5 });

                this.showToast(
                    `Location detected! Accuracy: ±${Math.round(accuracy)}m`,
                    'success'
                );

                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Current Location';
                }

                // Switch to location tab to show result
                this.switchTab('location');
            },

            // ✅ ERROR — handle all cases
            (error) => {
                let message = 'Unable to get your location.';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied. Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable. Try again or enter coordinates manually.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out. Check your GPS signal and try again.';
                        break;
                    default:
                        message = `Location error: ${error.message}`;
                }

                this.showToast(message, 'error');
                console.error('Geolocation error:', error.code, error.message);

                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Current Location';
                }
            },
            options
        );
    }

    // ─────────────────────────────────────────
    // REVERSE GEOCODING
    // ─────────────────────────────────────────

    // ✅ FIX: Used inside modal — fills address field
    async reverseGeocodeToAddress(lat, lng) {
        const addressField = document.getElementById('fullAddress');
        if (!addressField) return;

        addressField.value = 'Fetching address...';
        addressField.disabled = true;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: { 'Accept-Language': 'en' },
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data && data.display_name) {
                addressField.value = data.display_name;

                // Auto-fill barangay and municipality if fields are empty
                if (data.address) {
                    const bar = document.getElementById('houseBarangay');
                    const mun = document.getElementById('houseMunicipality');
                    const str = document.getElementById('houseStreet');

                    if (bar && !bar.value && (data.address.suburb || data.address.village)) {
                        bar.value = data.address.suburb || data.address.village || '';
                    }
                    if (mun && !mun.value && (data.address.city || data.address.town)) {
                        mun.value = data.address.city || data.address.town || '';
                    }
                    if (str && !str.value && data.address.road) {
                        str.value = data.address.road || '';
                    }
                }
            } else {
                addressField.value = '';
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error.message);
            addressField.value = '';

            if (error.name !== 'AbortError') {
                this.showToast('Could not fetch address. Enter manually.', 'warning');
            }
        } finally {
            addressField.disabled = false;
        }
    }

    // ✅ FIX: Used in popup — quiet version with callback
    async reverseGeocodeQuiet(lat, lng, callback) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
                {
                    headers: { 'Accept-Language': 'en' },
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            callback(data?.display_name || null);
        } catch (e) {
            callback(null);
        }
    }

    // ─────────────────────────────────────────
    // POPULATE FORM (for edit)
    // ─────────────────────────────────────────
    populateForm(h) {
        this.setVal('houseNumber',      h.houseNumber);
        this.setVal('houseLot',         h.houseLot);
        this.setVal('houseBlock',       h.houseBlock);
        this.setVal('houseStreet',      h.houseStreet);
        this.setVal('houseBarangay',    h.houseBarangay);
        this.setVal('houseMunicipality',h.houseMunicipality);
        this.setVal('houseType',        h.houseType);
        this.setVal('houseStatus',      h.houseStatus);
        this.setVal('yearBuilt',        h.yearBuilt);
        this.setVal('houseColor',       h.houseColor);
        this.setVal('floorCount',       h.floorCount);
        this.setVal('roomCount',        h.roomCount);

        this.setVal('headFirstName',    h.head?.firstName);
        this.setVal('headLastName',     h.head?.lastName);
        this.setVal('headAge',          h.head?.age);
        this.setVal('headGender',       h.head?.gender);
        this.setVal('headCivilStatus',  h.head?.civilStatus);
        this.setVal('headOccupation',   h.head?.occupation);
        this.setVal('headContact',      h.head?.contact);
        this.setVal('headEmail',        h.head?.email);

        this.setVal('totalPersons',     h.totalPersons);
        this.setVal('totalMale',        h.totalMale);
        this.setVal('totalFemale',      h.totalFemale);
        this.setVal('totalMinors',      h.totalMinors);
        this.setVal('totalSenior',      h.totalSenior);
        this.setVal('totalPwd',         h.totalPwd);

        if (h.members?.length > 0) {
            h.members.forEach(m => this.addMemberRow(m));
        }

        // ✅ FIX: Use setCoordinates so display updates too
        if (h.lat && h.lng) {
            this.setCoordinates(h.lat, h.lng);
        }

        this.setVal('fullAddress',      h.fullAddress);
        this.setVal('landmark',         h.landmark);
        this.setVal('zone',             h.zone);
        this.setVal('precinct',         h.precinct);

        this.setVal('incomeClass',      h.incomeClass);
        this.setVal('waterSource',      h.waterSource);
        this.setVal('electricitySource',h.electricitySource);
        this.setVal('internetAccess',   h.internetAccess);
        this.setVal('toiletType',       h.toiletType);
        this.setVal('wasteDisposal',    h.wasteDisposal);
        this.setVal('remarks',          h.remarks);
        this.setVal('surveyedBy',       h.surveyedBy);
        this.setVal('surveyDate',       h.surveyDate);

        if (h.healthPrograms) {
            h.healthPrograms.forEach(prog => {
                const cb = document.querySelector(
                    `input[name="healthProgram"][value="${prog}"]`
                );
                if (cb) cb.checked = true;
            });
        }
    }

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null && value !== '') {
            el.value = value;
        }
    }

    // ─────────────────────────────────────────
    // MEMBERS
    // ─────────────────────────────────────────
    addMemberRow(data = null) {
        const template = document.getElementById('memberRowTemplate');
        const clone    = template.content.cloneNode(true);
        const row      = clone.querySelector('.member-row');

        if (data) {
            row.querySelector('.member-firstname').value = data.firstName || '';
            row.querySelector('.member-lastname').value  = data.lastName  || '';
            row.querySelector('.member-age').value       = data.age       || '';
            row.querySelector('.member-gender').value    = data.gender    || 'male';
            row.querySelector('.member-relation').value  = data.relation  || '';
        }

        row.querySelector('.btn-remove-member')
            .addEventListener('click', () => row.remove());

        document.getElementById('membersList').appendChild(row);
    }

    getMembers() {
        return Array.from(document.querySelectorAll('#membersList .member-row'))
            .map(row => ({
                firstName: row.querySelector('.member-firstname').value.trim(),
                lastName:  row.querySelector('.member-lastname').value.trim(),
                age:       row.querySelector('.member-age').value,
                gender:    row.querySelector('.member-gender').value,
                relation:  row.querySelector('.member-relation').value.trim()
            }))
            .filter(m => m.firstName || m.lastName);
    }

    getHealthPrograms() {
        return Array.from(
            document.querySelectorAll('input[name="healthProgram"]:checked')
        ).map(cb => cb.value);
    }

    // ─────────────────────────────────────────
    // SAVE HOUSEHOLD
    // ─────────────────────────────────────────
    saveHousehold() {
        // ✅ FIX: Validate BEFORE collecting data
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);

        if (isNaN(lat) || isNaN(lng)) {
            this.showToast(
                'Location is required. Go to the Location tab and set coordinates.',
                'error'
            );
            this.switchTab('location');
            return;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.showToast('Invalid coordinates. Latitude must be -90 to 90, Longitude -180 to 180.', 'error');
            this.switchTab('location');
            return;
        }

        const houseNumber = document.getElementById('houseNumber').value.trim();
        if (!houseNumber) {
            this.showToast('House number is required.', 'error');
            this.switchTab('house');
            return;
        }

        const household = {
            id: this.editingId || this.generateId(),

            houseNumber,
            houseLot:         document.getElementById('houseLot').value.trim(),
            houseBlock:       document.getElementById('houseBlock').value.trim(),
            houseStreet:      document.getElementById('houseStreet').value.trim(),
            houseBarangay:    document.getElementById('houseBarangay').value.trim(),
            houseMunicipality:document.getElementById('houseMunicipality').value.trim(),
            houseType:        document.getElementById('houseType').value,
            houseStatus:      document.getElementById('houseStatus').value,
            yearBuilt:        document.getElementById('yearBuilt').value,
            houseColor:       document.getElementById('houseColor').value.trim(),
            floorCount:       document.getElementById('floorCount').value,
            roomCount:        document.getElementById('roomCount').value,

            head: {
                firstName:   document.getElementById('headFirstName').value.trim(),
                lastName:    document.getElementById('headLastName').value.trim(),
                age:         document.getElementById('headAge').value,
                gender:      document.getElementById('headGender').value,
                civilStatus: document.getElementById('headCivilStatus').value,
                occupation:  document.getElementById('headOccupation').value.trim(),
                contact:     document.getElementById('headContact').value.trim(),
                email:       document.getElementById('headEmail').value.trim()
            },

            totalPersons: parseInt(document.getElementById('totalPersons').value) || 0,
            totalMale:    parseInt(document.getElementById('totalMale').value)    || 0,
            totalFemale:  parseInt(document.getElementById('totalFemale').value)  || 0,
            totalMinors:  parseInt(document.getElementById('totalMinors').value)  || 0,
            totalSenior:  parseInt(document.getElementById('totalSenior').value)  || 0,
            totalPwd:     parseInt(document.getElementById('totalPwd').value)     || 0,
            members:      this.getMembers(),

            lat, lng,
            fullAddress:  document.getElementById('fullAddress').value.trim(),
            landmark:     document.getElementById('landmark').value.trim(),
            zone:         document.getElementById('zone').value.trim(),
            precinct:     document.getElementById('precinct').value.trim(),

            incomeClass:       document.getElementById('incomeClass').value,
            waterSource:       document.getElementById('waterSource').value,
            electricitySource: document.getElementById('electricitySource').value,
            internetAccess:    document.getElementById('internetAccess').value,
            toiletType:        document.getElementById('toiletType').value,
            wasteDisposal:     document.getElementById('wasteDisposal').value,
            healthPrograms:    this.getHealthPrograms(),
            remarks:           document.getElementById('remarks').value.trim(),
            surveyedBy:        document.getElementById('surveyedBy').value.trim(),
            surveyDate:        document.getElementById('surveyDate').value,

            createdAt: this.editingId
                ? (this.households.find(h => h.id === this.editingId)?.createdAt
                    || new Date().toISOString())
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingId) {
            const idx = this.households.findIndex(h => h.id === this.editingId);
            if (idx !== -1) this.households[idx] = household;
            this.showToast(`House #${household.houseNumber} updated!`, 'success');
        } else {
            this.households.push(household);
            this.showToast(`House #${household.houseNumber} registered!`, 'success');
        }

        this.saveToStorage();
        this.renderHouseholds();
        this.renderAllMarkers();
        this.updateStats();
        this.populateStreetFilter();
        this.closeModal();

        // ✅ FIX: Fly to saved location
        setTimeout(() => {
            this.map.flyTo([lat, lng], 17, { duration: 1.5 });

            // Open marker popup after fly
            setTimeout(() => {
                if (this.markers[household.id]) {
                    this.markers[household.id].openPopup();
                }
            }, 1700);
        }, 300);
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────
    deleteHousehold(id) {
        const h = this.households.find(h => h.id === id);
        if (!h) return;

        if (confirm(`Remove House #${h.houseNumber} on ${h.houseStreet || 'unknown street'}?`)) {
            // ✅ FIX: Remove marker from map before deleting from array
            if (this.markers[id]) {
                this.map.removeLayer(this.markers[id]);
                delete this.markers[id];
            }

            this.households = this.households.filter(h => h.id !== id);
            this.saveToStorage();
            this.renderHouseholds();
            this.updateStats();
            this.populateStreetFilter();
            this.closeDetailPanel();
            this.showToast(`House #${h.houseNumber} removed.`, 'warning');
        }
    }

    // ─────────────────────────────────────────
    // RENDER SIDEBAR
    // ─────────────────────────────────────────
    renderHouseholds(data = null) {
        const list  = document.getElementById('houseList');
        const items = data !== null ? data : this.households;

        if (items.length === 0) {
            list.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `
                <i class="fas fa-home"></i>
                <p>${data !== null
                    ? 'No matching households found.'
                    : 'No households recorded yet.'
                }</p>
                ${data === null
                    ? '<p>Click on the map or press "+ Add Household" to begin.</p>'
                    : ''
                }
            `;
            list.appendChild(empty);
            return;
        }

        list.innerHTML = items.map(h => `
            <div class="house-card" data-id="${h.id}"
                onclick="app.selectHousehold('${h.id}')">
                <div class="house-card-header">
                    <div class="house-icon ${h.houseStatus}">
                        <i class="fas fa-${this.getStatusIcon(h.houseStatus)}"></i>
                    </div>
                    <div class="house-info">
                        <div class="house-number">
                            ${h.houseNumber}
                            ${h.houseLot
                                ? `<span style="font-weight:400;font-size:12px;
                                   color:var(--secondary)"> · Lot ${h.houseLot}</span>`
                                : ''}
                            ${h.houseBlock
                                ? `<span style="font-weight:400;font-size:12px;
                                   color:var(--secondary)"> · Blk ${h.houseBlock}</span>`
                                : ''}
                        </div>
                        <div class="house-head">
                            <i class="fas fa-user-tie"
                               style="color:var(--primary-light);font-size:10px;
                               margin-right:3px;"></i>
                            ${h.head?.firstName || ''} ${h.head?.lastName || 'No Head Recorded'}
                        </div>
                        <div class="house-street">
                            <i class="fas fa-road"></i>
                            ${h.houseStreet || 'No street recorded'}
                            ${h.houseBarangay ? `, ${h.houseBarangay}` : ''}
                        </div>
                    </div>
                </div>
                <div class="house-card-footer">
                    <div class="residents-badge">
                        <i class="fas fa-users"></i>
                        ${h.totalPersons || 0} person${h.totalPersons !== 1 ? 's' : ''}
                    </div>
                    ${h.zone
                        ? `<div class="residents-badge">
                               <i class="fas fa-map"></i> ${h.zone}
                           </div>`
                        : ''}
                    <span class="status-badge ${h.houseStatus}">
                        ${this.getStatusLabel(h.houseStatus)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // ─────────────────────────────────────────
    // MARKERS
    // ─────────────────────────────────────────
    renderAllMarkers() {
        // ✅ FIX: Clear markers properly
        Object.values(this.markers).forEach(m => {
            try { this.map.removeLayer(m); } catch(e) {}
        });
        this.markers = {};

        this.households.forEach(h => {
            this.addMarker(h);
        });
    }

    addMarker(h) {
        if (isNaN(h.lat) || isNaN(h.lng)) {
            console.warn(`Household ${h.id} has invalid coordinates.`);
            return;
        }

        const icon   = this.createMarkerIcon(h.houseStatus);
        const marker = L.marker([h.lat, h.lng], { icon, riseOnHover: true })
            .addTo(this.map);

        marker.bindPopup(this.buildPopup(h), {
            maxWidth: 280,
            className: 'community-popup'
        });

        // ✅ FIX: Use closure to capture id — safe reference
        const id = h.id;
        marker.on('click', () => {
            this.highlightCard(id);
        });

        this.markers[h.id] = marker;
    }

    createMarkerIcon(status) {
        const colors = {
            owner:    '#4F46E5',
            renter:   '#10B981',
            vacant:   '#F59E0B',
            business: '#EC4899'
        };
        const color = colors[status] || '#64748B';

        return L.divIcon({
            className: '',
            html: `
                <div style="
                    width: 30px;
                    height: 30px;
                    background: ${color};
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                    position: relative;
                ">
                    <div style="
                        width: 10px;
                        height: 10px;
                        background: white;
                        border-radius: 50%;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(45deg);
                    "></div>
                </div>
            `,
            iconSize:   [30, 42],
            iconAnchor: [15, 42],
            popupAnchor:[0, -44]
        });
    }

    buildPopup(h) {
        // ✅ FIX: Use data attributes — no inline onclick with app references
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="popup-header">
                <div class="popup-house-num">🏠 House #${h.houseNumber}
                    ${h.houseLot ? ` · Lot ${h.houseLot}` : ''}
                </div>
                <div class="popup-street">
                    ${h.houseStreet || ''}${h.houseBarangay ? `, ${h.houseBarangay}` : ''}
                </div>
            </div>
            <div class="popup-body">
                <div class="popup-row">
                    <i class="fas fa-user-tie"></i>
                    ${h.head?.firstName || ''} ${h.head?.lastName || 'No Head'}
                </div>
                <div class="popup-row">
                    <i class="fas fa-users"></i>
                    ${h.totalPersons || 0} resident(s) ·
                    ${h.totalMale || 0}M / ${h.totalFemale || 0}F
                </div>
                ${h.head?.contact ? `
                <div class="popup-row">
                    <i class="fas fa-phone"></i> ${h.head.contact}
                </div>` : ''}
                ${h.zone ? `
                <div class="popup-row">
                    <i class="fas fa-map"></i> ${h.zone}
                </div>` : ''}
            </div>
            <div class="popup-actions">
                <button class="popup-btn-view" data-action="view" data-id="${h.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="popup-btn-edit" data-action="edit" data-id="${h.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;

        // ✅ FIX: Bind events on DOM elements — not inline strings
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id     = btn.dataset.id;
                if (action === 'view') this.showDetail(id);
                if (action === 'edit') {
                    const found = this.households.find(x => x.id === id);
                    if (found) this.openModal(found);
                }
            });
        });

        return container;
    }

    // ─────────────────────────────────────────
    // SELECT / HIGHLIGHT
    // ─────────────────────────────────────────
    selectHousehold(id) {
        const h = this.households.find(h => h.id === id);
        if (!h) return;

        // ✅ FIX: Check marker exists before flying
        if (this.markers[id]) {
            this.map.flyTo([h.lat, h.lng], 17, { duration: 1 });
            setTimeout(() => {
                if (this.markers[id]) this.markers[id].openPopup();
            }, 1100);
        }

        this.highlightCard(id);
    }

    highlightCard(id) {
        document.querySelectorAll('.house-card')
            .forEach(c => c.classList.remove('active'));
        const card = document.querySelector(`.house-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ─────────────────────────────────────────
    // DETAIL PANEL
    // ─────────────────────────────────────────
    showDetail(id) {
        const h = this.households.find(h => h.id === id);
        if (!h) return;

        const statusColors = {
            owner: '#4F46E5', renter: '#10B981',
            vacant: '#F59E0B', business: '#EC4899'
        };

        document.getElementById('detailTitle').textContent = `House #${h.houseNumber}`;

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="detail-house-banner">
                <div class="detail-house-num">🏠 House #${h.houseNumber}</div>
                <div class="detail-house-street">
                    ${[h.houseStreet, h.houseBarangay, h.houseMunicipality]
                        .filter(Boolean).join(', ')}
                </div>
                <div class="detail-house-meta">
                    <span class="detail-badge">${this.getStatusLabel(h.houseStatus)}</span>
                    ${h.houseType   ? `<span class="detail-badge">${h.houseType}</span>` : ''}
                    ${h.zone        ? `<span class="detail-badge">${h.zone}</span>` : ''}
                    ${h.precinct    ? `<span class="detail-badge">Precinct ${h.precinct}</span>` : ''}
                </div>
            </div>

            <div class="stats-row">
                ${[
                    ['Total', h.totalPersons],
                    ['Male', h.totalMale],
                    ['Female', h.totalFemale],
                    ['Minors', h.totalMinors],
                    ['Senior', h.totalSenior],
                    ['PWD', h.totalPwd]
                ].map(([label, val]) => `
                    <div class="stat-box">
                        <div class="stat-box-num">${val || 0}</div>
                        <div class="stat-box-label">${label}</div>
                    </div>
                `).join('')}
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-user-tie"></i> Household Head
                </div>
                <div class="resident-cards">
                    <div class="resident-card">
                        <div class="resident-avatar"
                             style="background:${statusColors[h.houseStatus]}">
                            ${this.getInitials(h.head?.firstName, h.head?.lastName)}
                        </div>
                        <div class="resident-info">
                            <div class="resident-name">
                                ${h.head?.firstName || ''} ${h.head?.lastName || 'N/A'}
                            </div>
                            <div class="resident-meta">
                                ${[
                                    h.head?.age        ? `Age ${h.head.age}` : '',
                                    h.head?.gender,
                                    h.head?.civilStatus,
                                    h.head?.occupation
                                ].filter(Boolean).join(' · ')}
                            </div>
                            ${h.head?.contact
                                ? `<div class="resident-meta">
                                       <i class="fas fa-phone" style="font-size:10px"></i>
                                       ${h.head.contact}
                                   </div>`
                                : ''}
                        </div>
                        <span class="resident-head-badge">HEAD</span>
                    </div>
                </div>
            </div>

            ${h.members?.length > 0 ? `
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-users"></i> Other Members (${h.members.length})
                </div>
                <div class="resident-cards">
                    ${h.members.map(m => `
                        <div class="resident-card">
                            <div class="resident-avatar" style="background:#8B5CF6">
                                ${this.getInitials(m.firstName, m.lastName)}
                            </div>
                            <div class="resident-info">
                                <div class="resident-name">${m.firstName} ${m.lastName}</div>
                                <div class="resident-meta">
                                    ${[
                                        m.age      ? `Age ${m.age}` : '',
                                        m.gender,
                                        m.relation
                                    ].filter(Boolean).join(' · ')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-building"></i> House Details
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Lot Number',   h.houseLot)}
                    ${this.detailItem('Block Number', h.houseBlock)}
                    ${this.detailItem('House Type',   h.houseType)}
                    ${this.detailItem('Year Built',   h.yearBuilt)}
                    ${this.detailItem('Floors',       h.floorCount)}
                    ${this.detailItem('Rooms',        h.roomCount)}
                    ${this.detailItem('Color',        h.houseColor)}
                    ${this.detailItem('Barangay',     h.houseBarangay)}
                    ${this.detailItem('Municipality', h.houseMunicipality)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-map-marker-alt"></i> Location
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Coordinates',
                        `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`)}
                    ${this.detailItem('Zone / Purok', h.zone)}
                    ${this.detailItem('Precinct',     h.precinct)}
                    ${this.detailItem('Landmark',     h.landmark)}
                </div>
                ${h.fullAddress ? `
                <div class="detail-item" style="margin-top:10px">
                    <div class="detail-item-label">Full Address</div>
                    <div class="detail-item-value">${h.fullAddress}</div>
                </div>` : ''}
                <button class="btn btn-secondary btn-sm"
                        style="margin-top:12px"
                        data-action="flyto"
                        data-lat="${h.lat}"
                        data-lng="${h.lng}">
                    <i class="fas fa-map-pin"></i> Show on Map
                </button>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-hand-holding-heart"></i> Social & Economic
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Income Class',  h.incomeClass)}
                    ${this.detailItem('Water Source',  h.waterSource)}
                    ${this.detailItem('Electricity',   h.electricitySource)}
                    ${this.detailItem('Internet',      h.internetAccess)}
                    ${this.detailItem('Toilet',        h.toiletType)}
                    ${this.detailItem('Waste Disposal',h.wasteDisposal)}
                </div>
                ${h.healthPrograms?.length > 0 ? `
                <div style="margin-top:10px">
                    <div class="detail-item-label">Health Programs</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">
                        ${h.healthPrograms.map(p => `
                            <span style="background:rgba(16,185,129,0.1);color:#10B981;
                                border-radius:50px;padding:2px 10px;font-size:11px;
                                font-weight:600;">${p.toUpperCase()}</span>
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-clipboard-check"></i> Survey Information
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Surveyed By',  h.surveyedBy)}
                    ${this.detailItem('Survey Date',
                        h.surveyDate
                            ? new Date(h.surveyDate + 'T00:00:00')
                                .toLocaleDateString('en-US',
                                    { year:'numeric', month:'long', day:'numeric' })
                            : '')}
                    ${this.detailItem('Date Added',
                        new Date(h.createdAt)
                            .toLocaleDateString('en-US',
                                { year:'numeric', month:'short', day:'numeric' }))}
                    ${this.detailItem('Last Updated',
                        new Date(h.updatedAt)
                            .toLocaleDateString('en-US',
                                { year:'numeric', month:'short', day:'numeric' }))}
                </div>
                ${h.remarks ? `
                <div style="margin-top:10px;background:var(--light);
                    border-radius:8px;padding:12px;">
                    <div class="detail-item-label" style="margin-bottom:5px">Remarks</div>
                    <div style="font-size:13px;color:var(--dark);
                        line-height:1.6">${h.remarks}</div>
                </div>` : ''}
            </div>
        `;

        // ✅ FIX: Bind detail panel buttons properly
        content.querySelector('[data-action="flyto"]')
            ?.addEventListener('click', (e) => {
                const lat = parseFloat(e.currentTarget.dataset.lat);
                const lng = parseFloat(e.currentTarget.dataset.lng);
                this.map.flyTo([lat, lng], 18, { duration: 1.5 });
                if (this.markers[id]) {
                    setTimeout(() => this.markers[id].openPopup(), 1600);
                }
            });

        // ✅ FIX: Rebuild action buttons safely
        let actions = document.querySelector('.detail-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'detail-actions';
            document.getElementById('detailPanel').appendChild(actions);
        }

        actions.innerHTML = '';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-primary-dark';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.addEventListener('click', () => {
            const found = this.households.find(x => x.id === id);
            if (found) this.openModal(found);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        delBtn.addEventListener('click', () => this.deleteHousehold(id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        this.map.closePopup();
        document.getElementById('detailPanel').classList.add('active');
        this.highlightCard(id);
    }

    detailItem(label, value) {
        if (!value && value !== 0) return '';
        return `
            <div class="detail-item">
                <div class="detail-item-label">${label}</div>
                <div class="detail-item-value">${value}</div>
            </div>
        `;
    }

    closeDetailPanel() {
        document.getElementById('detailPanel').classList.remove('active');
    }

    // ─────────────────────────────────────────
    // FILTERS & SEARCH
    // ─────────────────────────────────────────
    applyFilters() {
        const search = document.getElementById('searchInput').value.toLowerCase().trim();
        const status = document.getElementById('filterStatus').value;
        const street = document.getElementById('filterStreet').value;

        let filtered = [...this.households];

        if (status !== 'all') {
            filtered = filtered.filter(h => h.houseStatus === status);
        }
        if (street !== 'all') {
            filtered = filtered.filter(h => h.houseStreet === street);
        }
        if (search) {
            filtered = filtered.filter(h =>
                h.houseNumber?.toLowerCase().includes(search)     ||
                h.houseStreet?.toLowerCase().includes(search)     ||
                h.houseBarangay?.toLowerCase().includes(search)   ||
                h.houseMunicipality?.toLowerCase().includes(search)||
                h.head?.firstName?.toLowerCase().includes(search) ||
                h.head?.lastName?.toLowerCase().includes(search)  ||
                h.head?.contact?.includes(search)                 ||
                h.zone?.toLowerCase().includes(search)            ||
                h.houseLot?.toLowerCase().includes(search)        ||
                h.houseBlock?.toLowerCase().includes(search)      ||
                h.fullAddress?.toLowerCase().includes(search)
            );
        }

        this.renderHouseholds(filtered);

        // Dim non-matching markers
        Object.keys(this.markers).forEach(id => {
            const visible = filtered.some(h => h.id === id);
            this.markers[id].setOpacity(visible ? 1 : 0.15);
        });
    }

    populateStreetFilter() {
        const streets = [
            ...new Set(this.households.map(h => h.houseStreet).filter(Boolean))
        ].sort();

        const select  = document.getElementById('filterStreet');
        const current = select.value;

        select.innerHTML = '<option value="all">All Streets</option>' +
            streets.map(s => `<option value="${s}">${s}</option>`).join('');

        if (streets.includes(current)) select.value = current;
    }

    // ─────────────────────────────────────────
    // STATS
    // ─────────────────────────────────────────
    updateStats() {
        const total         = this.households.length;
        const totalResidents= this.households.reduce(
            (s, h) => s + (h.totalPersons || 0), 0
        );
        const streets       = new Set(
            this.households.map(h => h.houseStreet).filter(Boolean)
        ).size;

        document.getElementById('totalHouses').textContent    = total;
        document.getElementById('totalResidents').textContent = totalResidents;
        document.getElementById('totalStreets').textContent   = streets;
        document.getElementById('houseCount').textContent     =
            `${total} household${total !== 1 ? 's' : ''}`;

        document.getElementById('ownerCount').textContent =
            this.households.filter(h => h.houseStatus === 'owner').length;
        document.getElementById('renterCount').textContent =
            this.households.filter(h => h.houseStatus === 'renter').length;
        document.getElementById('vacantCount').textContent =
            this.households.filter(h => h.houseStatus === 'vacant').length;
        document.getElementById('businessCount').textContent =
            this.households.filter(h => h.houseStatus === 'business').length;
    }

    // ─────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────
    generateId() {
        return 'hh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getInitials(first = '', last = '') {
        return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
    }

    getStatusIcon(status) {
        return { owner:'home', renter:'key', vacant:'door-open', business:'store' }[status] || 'home';
    }

    getStatusLabel(status) {
        return { owner:'Owner', renter:'Renter', vacant:'Vacant', business:'Business' }[status] || status;
    }

    // ─────────────────────────────────────────
    // STORAGE
    // ─────────────────────────────────────────
    saveToStorage() {
        try {
            localStorage.setItem('communityLocatorData', JSON.stringify(this.households));
        } catch (e) {
            this.showToast('Storage full! Export your data.', 'error');
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem('communityLocatorData');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load data:', e);
            return [];
        }
    }

    // ─────────────────────────────────────────
    // TOAST
    // ─────────────────────────────────────────
    showToast(message, type = 'success') {
        const icons = {
            success: 'fas fa-check-circle',
            error:   'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="${icons[type]}"></i><span>${message}</span>`;
        document.getElementById('toastContainer').appendChild(toast);

        setTimeout(() => {
            toast.style.cssText =
                'opacity:0;transform:translateX(110%);transition:all 0.3s ease;';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// ─────────────────────────────────────────
// BOOT — wait for full DOM
// ─────────────────────────────────────────
let app;

document.addEventListener('DOMContentLoaded', () => {
    // Ensure detail actions container exists
    const panel = document.getElementById('detailPanel');
    if (!panel.querySelector('.detail-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'detail-actions';
        panel.appendChild(actionsDiv);
    }

    app = new CommunityLocator();

    console.log('✅ Community Locator initialized.');
});
