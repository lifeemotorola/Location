// ============================================
// COMMUNITY LOCATOR — HOUSEHOLD MAPPING SYSTEM
// ============================================

class CommunityLocator {
    constructor() {
        this.households = this.loadFromStorage();
        this.map = null;
        this.markers = {};
        this.editingId = null;
        this.tempMarker = null;
        this.activeTab = 'house';

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
    // MAP
    // ─────────────────────────────────────────
    initMap() {
        this.map = L.map('map', {
            center: [14.5995, 120.9842],
            zoom: 13,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.map.on('click', (e) => this.onMapClick(e.latlng));
    }

    onMapClick(latlng) {
        if (this.tempMarker) this.map.removeLayer(this.tempMarker);

        this.tempMarker = L.marker(latlng, {
            icon: this.createMarkerIcon('vacant')
        }).addTo(this.map);

        this.tempMarker.bindPopup(`
            <div class="popup-header">
                <div class="popup-house-num">📍 New Location</div>
                <div class="popup-street">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn-view"
                    onclick="app.addHouseholdAtLocation(${latlng.lat}, ${latlng.lng})">
                    Register Household Here
                </button>
            </div>
        `).openPopup();
    }

    addHouseholdAtLocation(lat, lng) {
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
        this.openModal(null, lat, lng);
    }

    // ─────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────
    bindEvents() {
        // Header buttons
        document.getElementById('addHouseBtn').addEventListener('click', () => this.openModal());

        // Modal close
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Form submit
        document.getElementById('houseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHousehold();
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.addMemberRow();
        });

        // Current location
        document.getElementById('useCurrentLocation').addEventListener('click', () => {
            this.useCurrentLocation();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.applyFilters();
        });

        // Filters
        document.getElementById('filterStatus').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterStreet').addEventListener('change', () => this.applyFilters());

        // Detail panel close
        document.getElementById('closeDetail').addEventListener('click', () => this.closeDetailPanel());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDetailPanel();
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
    }

    // ─────────────────────────────────────────
    // MODAL
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

            if (lat !== null && lng !== null) {
                document.getElementById('latitude').value = lat.toFixed(6);
                document.getElementById('longitude').value = lng.toFixed(6);
                this.reverseGeocode(lat, lng);
            }

            // Default survey date to today
            document.getElementById('surveyDate').value = new Date().toISOString().split('T')[0];
        }

        document.getElementById('modalOverlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        this.editingId = null;
        this.resetForm();
    }

    resetForm() {
        document.getElementById('houseForm').reset();
        document.getElementById('membersList').innerHTML = '';

        // Uncheck all checkboxes
        document.querySelectorAll('input[name="healthProgram"]').forEach(cb => {
            cb.checked = false;
        });
    }

    populateForm(h) {
        // House Info
        this.setVal('houseNumber', h.houseNumber);
        this.setVal('houseLot', h.houseLot);
        this.setVal('houseBlock', h.houseBlock);
        this.setVal('houseStreet', h.houseStreet);
        this.setVal('houseBarangay', h.houseBarangay);
        this.setVal('houseMunicipality', h.houseMunicipality);
        this.setVal('houseType', h.houseType);
        this.setVal('houseStatus', h.houseStatus);
        this.setVal('yearBuilt', h.yearBuilt);
        this.setVal('houseColor', h.houseColor);
        this.setVal('floorCount', h.floorCount);
        this.setVal('roomCount', h.roomCount);

        // Household Head
        this.setVal('headFirstName', h.head?.firstName);
        this.setVal('headLastName', h.head?.lastName);
        this.setVal('headAge', h.head?.age);
        this.setVal('headGender', h.head?.gender);
        this.setVal('headCivilStatus', h.head?.civilStatus);
        this.setVal('headOccupation', h.head?.occupation);
        this.setVal('headContact', h.head?.contact);
        this.setVal('headEmail', h.head?.email);

        // Member counts
        this.setVal('totalPersons', h.totalPersons);
        this.setVal('totalMale', h.totalMale);
        this.setVal('totalFemale', h.totalFemale);
        this.setVal('totalMinors', h.totalMinors);
        this.setVal('totalSenior', h.totalSenior);
        this.setVal('totalPwd', h.totalPwd);

        // Individual members
        if (h.members && h.members.length > 0) {
            h.members.forEach(m => this.addMemberRow(m));
        }

        // Location
        this.setVal('latitude', h.lat);
        this.setVal('longitude', h.lng);
        this.setVal('fullAddress', h.fullAddress);
        this.setVal('landmark', h.landmark);
        this.setVal('zone', h.zone);
        this.setVal('precinct', h.precinct);

        // Others
        this.setVal('incomeClass', h.incomeClass);
        this.setVal('waterSource', h.waterSource);
        this.setVal('electricitySource', h.electricitySource);
        this.setVal('internetAccess', h.internetAccess);
        this.setVal('toiletType', h.toiletType);
        this.setVal('wasteDisposal', h.wasteDisposal);
        this.setVal('remarks', h.remarks);
        this.setVal('surveyedBy', h.surveyedBy);
        this.setVal('surveyDate', h.surveyDate);

        // Checkboxes
        if (h.healthPrograms) {
            h.healthPrograms.forEach(prog => {
                const cb = document.querySelector(`input[name="healthProgram"][value="${prog}"]`);
                if (cb) cb.checked = true;
            });
        }
    }

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null) el.value = value;
    }

    // ─────────────────────────────────────────
    // MEMBERS
    // ─────────────────────────────────────────
    addMemberRow(data = null) {
        const template = document.getElementById('memberRowTemplate');
        const clone = template.content.cloneNode(true);
        const row = clone.querySelector('.member-row');

        if (data) {
            row.querySelector('.member-firstname').value = data.firstName || '';
            row.querySelector('.member-lastname').value = data.lastName || '';
            row.querySelector('.member-age').value = data.age || '';
            row.querySelector('.member-gender').value = data.gender || 'male';
            row.querySelector('.member-relation').value = data.relation || '';
        }

        row.querySelector('.btn-remove-member').addEventListener('click', () => {
            row.remove();
        });

        document.getElementById('membersList').appendChild(row);
    }

    getMembers() {
        const rows = document.querySelectorAll('#membersList .member-row');
        return Array.from(rows).map(row => ({
            firstName: row.querySelector('.member-firstname').value.trim(),
            lastName: row.querySelector('.member-lastname').value.trim(),
            age: row.querySelector('.member-age').value,
            gender: row.querySelector('.member-gender').value,
            relation: row.querySelector('.member-relation').value.trim()
        })).filter(m => m.firstName || m.lastName);
    }

    getHealthPrograms() {
        return Array.from(document.querySelectorAll('input[name="healthProgram"]:checked'))
            .map(cb => cb.value);
    }

    // ─────────────────────────────────────────
    // SAVE HOUSEHOLD
    // ─────────────────────────────────────────
    saveHousehold() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);

        if (isNaN(lat) || isNaN(lng)) {
            this.showToast('Please set a location for this household.', 'error');
            this.switchTab('location');
            return;
        }

        const household = {
            id: this.editingId || this.generateId(),

            // House Info
            houseNumber: document.getElementById('houseNumber').value.trim(),
            houseLot: document.getElementById('houseLot').value.trim(),
            houseBlock: document.getElementById('houseBlock').value.trim(),
            houseStreet: document.getElementById('houseStreet').value.trim(),
            houseBarangay: document.getElementById('houseBarangay').value.trim(),
            houseMunicipality: document.getElementById('houseMunicipality').value.trim(),
            houseType: document.getElementById('houseType').value,
            houseStatus: document.getElementById('houseStatus').value,
            yearBuilt: document.getElementById('yearBuilt').value,
            houseColor: document.getElementById('houseColor').value.trim(),
            floorCount: document.getElementById('floorCount').value,
            roomCount: document.getElementById('roomCount').value,

            // Head
            head: {
                firstName: document.getElementById('headFirstName').value.trim(),
                lastName: document.getElementById('headLastName').value.trim(),
                age: document.getElementById('headAge').value,
                gender: document.getElementById('headGender').value,
                civilStatus: document.getElementById('headCivilStatus').value,
                occupation: document.getElementById('headOccupation').value.trim(),
                contact: document.getElementById('headContact').value.trim(),
                email: document.getElementById('headEmail').value.trim()
            },

            // Residents summary
            totalPersons: parseInt(document.getElementById('totalPersons').value) || 0,
            totalMale: parseInt(document.getElementById('totalMale').value) || 0,
            totalFemale: parseInt(document.getElementById('totalFemale').value) || 0,
            totalMinors: parseInt(document.getElementById('totalMinors').value) || 0,
            totalSenior: parseInt(document.getElementById('totalSenior').value) || 0,
            totalPwd: parseInt(document.getElementById('totalPwd').value) || 0,

            // Individual members
            members: this.getMembers(),

            // Location
            lat,
            lng,
            fullAddress: document.getElementById('fullAddress').value.trim(),
            landmark: document.getElementById('landmark').value.trim(),
            zone: document.getElementById('zone').value.trim(),
            precinct: document.getElementById('precinct').value.trim(),

            // Others
            incomeClass: document.getElementById('incomeClass').value,
            waterSource: document.getElementById('waterSource').value,
            electricitySource: document.getElementById('electricitySource').value,
            internetAccess: document.getElementById('internetAccess').value,
            toiletType: document.getElementById('toiletType').value,
            wasteDisposal: document.getElementById('wasteDisposal').value,
            healthPrograms: this.getHealthPrograms(),
            remarks: document.getElementById('remarks').value.trim(),
            surveyedBy: document.getElementById('surveyedBy').value.trim(),
            surveyDate: document.getElementById('surveyDate').value,

            createdAt: this.editingId
                ? (this.households.find(h => h.id === this.editingId)?.createdAt || new Date().toISOString())
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
        this.map.flyTo([household.lat, household.lng], 17, { duration: 1.5 });
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────
    deleteHousehold(id) {
        const h = this.households.find(h => h.id === id);
        if (!h) return;

        if (confirm(`Remove House #${h.houseNumber} on ${h.houseStreet}?`)) {
            this.households = this.households.filter(h => h.id !== id);
            this.saveToStorage();
            this.renderHouseholds();
            this.renderAllMarkers();
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
        const list = document.getElementById('houseList');
        const items = data !== null ? data : this.households;

        if (items.length === 0) {
            list.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `
                <i class="fas fa-home"></i>
                <p>${data !== null ? 'No matching households found.' : 'No households recorded yet.'}</p>
                ${data === null ? '<p>Click on the map or use "Add Household" to get started.</p>' : ''}
            `;
            list.appendChild(empty);
            return;
        }

        list.innerHTML = items.map(h => `
            <div class="house-card" data-id="${h.id}" onclick="app.selectHousehold('${h.id}')">
                <div class="house-card-header">
                    <div class="house-icon ${h.houseStatus}">
                        <i class="fas fa-${this.getStatusIcon(h.houseStatus)}"></i>
                    </div>
                    <div class="house-info">
                        <div class="house-number">
                            ${h.houseNumber}
                            ${h.houseLot ? `<span style="font-weight:400;font-size:12px;color:var(--secondary)"> · Lot ${h.houseLot}</span>` : ''}
                            ${h.houseBlock ? `<span style="font-weight:400;font-size:12px;color:var(--secondary)"> · Blk ${h.houseBlock}</span>` : ''}
                        </div>
                        <div class="house-head">
                            <i class="fas fa-user-tie" style="color:var(--primary-light);font-size:10px;margin-right:3px;"></i>
                            ${h.head?.firstName || ''} ${h.head?.lastName || 'No Head Recorded'}
                        </div>
                        <div class="house-street">
                            <i class="fas fa-road"></i> ${h.houseStreet || 'No street recorded'}
                            ${h.houseBarangay ? `, ${h.houseBarangay}` : ''}
                        </div>
                    </div>
                </div>
                <div class="house-card-footer">
                    <div class="residents-badge">
                        <i class="fas fa-users"></i>
                        ${h.totalPersons || 0} person${h.totalPersons !== 1 ? 's' : ''}
                    </div>
                    ${h.zone ? `<div class="residents-badge"><i class="fas fa-map"></i> ${h.zone}</div>` : ''}
                    <span class="status-badge ${h.houseStatus}">${this.getStatusLabel(h.houseStatus)}</span>
                </div>
            </div>
        `).join('');
    }

    // ─────────────────────────────────────────
    // MARKERS
    // ─────────────────────────────────────────
    renderAllMarkers() {
        Object.values(this.markers).forEach(m => this.map.removeLayer(m));
        this.markers = {};

        this.households.forEach(h => {
            const icon = this.createMarkerIcon(h.houseStatus);
            const marker = L.marker([h.lat, h.lng], { icon }).addTo(this.map);
            marker.bindPopup(this.buildPopup(h));
            this.markers[h.id] = marker;
        });
    }

    createMarkerIcon(status) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin ${status}"></div>`,
            iconSize: [32, 44],
            iconAnchor: [16, 44],
            popupAnchor: [0, -44]
        });
    }

    buildPopup(h) {
        return `
            <div class="popup-header">
                <div class="popup-house-num">
                    House #${h.houseNumber}
                    ${h.houseLot ? ` · Lot ${h.houseLot}` : ''}
                </div>
                <div class="popup-street">${h.houseStreet || ''}${h.houseBarangay ? `, ${h.houseBarangay}` : ''}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row">
                    <i class="fas fa-user-tie"></i>
                    ${h.head?.firstName || ''} ${h.head?.lastName || 'No Head'}
                </div>
                <div class="popup-row">
                    <i class="fas fa-users"></i>
                    ${h.totalPersons || 0} resident(s) · ${h.totalMale || 0}M / ${h.totalFemale || 0}F
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
                <button class="popup-btn-view" onclick="app.showDetail('${h.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="popup-btn-edit" onclick="app.openModal(app.households.find(x=>x.id==='${h.id}'))">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // SELECT
    // ─────────────────────────────────────────
    selectHousehold(id) {
        const h = this.households.find(h => h.id === id);
        if (!h) return;

        this.map.flyTo([h.lat, h.lng], 17, { duration: 1 });

        if (this.markers[id]) this.markers[id].openPopup();

        document.querySelectorAll('.house-card').forEach(c => c.classList.remove('active'));
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

            <!-- Banner -->
            <div class="detail-house-banner">
                <div class="detail-house-num">🏠 House #${h.houseNumber}</div>
                <div class="detail-house-street">
                    ${[h.houseStreet, h.houseBarangay, h.houseMunicipality].filter(Boolean).join(', ')}
                </div>
                <div class="detail-house-meta">
                    <span class="detail-badge">${this.getStatusLabel(h.houseStatus)}</span>
                    ${h.houseType ? `<span class="detail-badge">${h.houseType}</span>` : ''}
                    ${h.zone ? `<span class="detail-badge">${h.zone}</span>` : ''}
                    ${h.precinct ? `<span class="detail-badge">Precinct ${h.precinct}</span>` : ''}
                </div>
            </div>

            <!-- Population Stats -->
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-box-num">${h.totalPersons || 0}</div>
                    <div class="stat-box-label">Total</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-num">${h.totalMale || 0}</div>
                    <div class="stat-box-label">Male</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-num">${h.totalFemale || 0}</div>
                    <div class="stat-box-label">Female</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-num">${h.totalMinors || 0}</div>
                    <div class="stat-box-label">Minors</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-num">${h.totalSenior || 0}</div>
                    <div class="stat-box-label">Senior</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-num">${h.totalPwd || 0}</div>
                    <div class="stat-box-label">PWD</div>
                </div>
            </div>

            <!-- Household Head -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-user-tie"></i> Household Head
                </div>
                <div class="resident-cards">
                    <div class="resident-card">
                        <div class="resident-avatar" style="background:${statusColors[h.houseStatus]}">
                            ${this.getInitials(h.head?.firstName, h.head?.lastName)}
                        </div>
                        <div class="resident-info">
                            <div class="resident-name">${h.head?.firstName || ''} ${h.head?.lastName || 'N/A'}</div>
                            <div class="resident-meta">
                                ${[h.head?.age ? `Age ${h.head.age}` : '', h.head?.gender, h.head?.civilStatus, h.head?.occupation].filter(Boolean).join(' · ')}
                            </div>
                            ${h.head?.contact ? `<div class="resident-meta"><i class="fas fa-phone" style="font-size:10px"></i> ${h.head.contact}</div>` : ''}
                        </div>
                        <span class="resident-head-badge">HEAD</span>
                    </div>
                </div>
            </div>

            <!-- Other Members -->
            ${h.members && h.members.length > 0 ? `
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
                                    ${[m.age ? `Age ${m.age}` : '', m.gender, m.relation].filter(Boolean).join(' · ')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- House Details -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-building"></i> House Details
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Lot Number', h.houseLot)}
                    ${this.detailItem('Block Number', h.houseBlock)}
                    ${this.detailItem('House Type', h.houseType)}
                    ${this.detailItem('Year Built', h.yearBuilt)}
                    ${this.detailItem('Floors', h.floorCount)}
                    ${this.detailItem('Rooms', h.roomCount)}
                    ${this.detailItem('Color', h.houseColor)}
                    ${this.detailItem('Barangay', h.houseBarangay)}
                    ${this.detailItem('Municipality', h.houseMunicipality)}
                </div>
            </div>

            <!-- Location -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-map-marker-alt"></i> Location
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Coordinates', `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`)}
                    ${this.detailItem('Zone / Purok', h.zone)}
                    ${this.detailItem('Precinct', h.precinct)}
                    ${this.detailItem('Landmark', h.landmark)}
                </div>
                ${h.fullAddress ? `<div class="detail-item" style="margin-top:10px">
                    <div class="detail-item-label">Full Address</div>
                    <div class="detail-item-value">${h.fullAddress}</div>
                </div>` : ''}
            </div>

            <!-- Social & Economic -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-hand-holding-heart"></i> Social & Economic
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Income Class', h.incomeClass)}
                    ${this.detailItem('Water Source', h.waterSource)}
                    ${this.detailItem('Electricity', h.electricitySource)}
                    ${this.detailItem('Internet', h.internetAccess)}
                    ${this.detailItem('Toilet', h.toiletType)}
                    ${this.detailItem('Waste Disposal', h.wasteDisposal)}
                </div>
                ${h.healthPrograms && h.healthPrograms.length > 0 ? `
                <div style="margin-top:10px">
                    <div class="detail-item-label">Health Programs</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">
                        ${h.healthPrograms.map(p => `
                            <span class="detail-badge" style="background:rgba(16,185,129,0.1);color:#10B981;border-radius:50px;padding:2px 10px;font-size:11px;font-weight:600;">${p.toUpperCase()}</span>
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>

            <!-- Survey Info -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-clipboard-check"></i> Survey Information
                </div>
                <div class="detail-grid">
                    ${this.detailItem('Surveyed By', h.surveyedBy)}
                    ${this.detailItem('Survey Date', h.surveyDate ? new Date(h.surveyDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric'}) : '')}
                    ${this.detailItem('Date Added', new Date(h.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric'}))}
                    ${this.detailItem('Last Updated', new Date(h.updatedAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric'}))}
                </div>
                ${h.remarks ? `
                <div style="margin-top:10px;background:var(--light);border-radius:8px;padding:12px;">
                    <div class="detail-item-label" style="margin-bottom:5px">Remarks</div>
                    <div style="font-size:13px;color:var(--dark);line-height:1.6">${h.remarks}</div>
                </div>` : ''}
            </div>
        `;

        // Inject action buttons
        const actions = document.getElementById('detailPanel').querySelector('.detail-actions');
        if (actions) {
            actions.innerHTML = `
                <button class="btn btn-primary-dark" onclick="app.openModal(app.households.find(x=>x.id==='${h.id}'))">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="app.deleteHousehold('${h.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;
        }

        this.map.closePopup();
        document.getElementById('detailPanel').classList.add('active');
        this.selectHousehold(id);
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

        if (status !== 'all') filtered = filtered.filter(h => h.houseStatus === status);
        if (street !== 'all') filtered = filtered.filter(h => h.houseStreet === street);

        if (search) {
            filtered = filtered.filter(h =>
                h.houseNumber?.toLowerCase().includes(search) ||
                h.houseStreet?.toLowerCase().includes(search) ||
                h.houseBarangay?.toLowerCase().includes(search) ||
                h.houseMunicipality?.toLowerCase().includes(search) ||
                h.head?.firstName?.toLowerCase().includes(search) ||
                h.head?.lastName?.toLowerCase().includes(search) ||
                h.head?.contact?.includes(search) ||
                h.zone?.toLowerCase().includes(search) ||
                h.houseLot?.toLowerCase().includes(search) ||
                h.houseBlock?.toLowerCase().includes(search) ||
                h.fullAddress?.toLowerCase().includes(search)
            );
        }

        this.renderHouseholds(filtered);

        Object.keys(this.markers).forEach(id => {
            const visible = filtered.some(h => h.id === id);
            this.markers[id].setOpacity(visible ? 1 : 0.15);
        });
    }

    populateStreetFilter() {
        const streets = [...new Set(this.households.map(h => h.houseStreet).filter(Boolean))].sort();
        const select = document.getElementById('filterStreet');
        const current = select.value;

        select.innerHTML = '<option value="all">All Streets</option>' +
            streets.map(s => `<option value="${s}">${s}</option>`).join('');

        if (streets.includes(current)) select.value = current;
    }

    // ─────────────────────────────────────────
    // STATS
    // ─────────────────────────────────────────
    updateStats() {
        const total = this.households.length;
        const totalResidents = this.households.reduce((sum, h) => sum + (h.totalPersons || 0), 0);
        const streets = new Set(this.households.map(h => h.houseStreet).filter(Boolean)).size;

        document.getElementById('totalHouses').textContent = total;
        document.getElementById('totalResidents').textContent = totalResidents;
        document.getElementById('totalStreets').textContent = streets;
        document.getElementById('houseCount').textContent = `${total} household${total !== 1 ? 's' : ''}`;

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
    // GEOLOCATION
    // ─────────────────────────────────────────
    useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation not supported.', 'error');
            return;
        }

        this.showToast('Detecting location...', 'success');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                document.getElementById('latitude').value = latitude.toFixed(6);
                document.getElementById('longitude').value = longitude.toFixed(6);
                this.reverseGeocode(latitude, longitude);
                this.showToast('Location set!', 'success');
            },
            () => this.showToast('Unable to get location.', 'error'),
            { enableHighAccuracy: true }
        );
    }

    async reverseGeocode(lat, lng) {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            if (data.display_name) {
                document.getElementById('fullAddress').value = data.display_name;
            }
        } catch (e) {
            console.warn('Reverse geocoding failed:', e);
        }
    }

    // ─────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────
    generateId() {
        return 'hh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getInitials(first = '', last = '') {
        return ((first.charAt(0) || '') + (last.charAt(0) || '')).toUpperCase() || '?';
    }

    getStatusIcon(status) {
        const icons = { owner: 'home', renter: 'key', vacant: 'door-open', business: 'store' };
        return icons[status] || 'home';
    }

    getStatusLabel(status) {
        const labels = { owner: 'Owner', renter: 'Renter', vacant: 'Vacant', business: 'Business' };
        return labels[status] || status;
    }

    // ─────────────────────────────────────────
    // STORAGE
    // ─────────────────────────────────────────
    saveToStorage() {
        try {
            localStorage.setItem('communityLocatorData', JSON.stringify(this.households));
        } catch (e) {
            this.showToast('Storage full! Cannot save.', 'error');
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('communityLocatorData');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    // ─────────────────────────────────────────
    // TOAST
    // ─────────────────────────────────────────
    showToast(message, type = 'success') {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="${icons[type]}"></i><span>${message}</span>`;

        document.getElementById('toastContainer').appendChild(toast);

        setTimeout(() => {
            toast.style.cssText = 'opacity:0;transform:translateX(100%);transition:all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Inject detail actions container
    const panel = document.getElementById('detailPanel');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'detail-actions';
    panel.appendChild(actionsDiv);

    app = new CommunityLocator();
});
