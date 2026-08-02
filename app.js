// ===========================
// PERSON LOCATOR APPLICATION
// ===========================

class PersonLocator {
    constructor() {
        this.people = this.loadFromStorage();
        this.map = null;
        this.markers = {};
        this.editingId = null;
        this.tempMarker = null;

        this.init();
    }

    // ---- INITIALIZATION ----
    init() {
        this.initMap();
        this.bindEvents();
        this.renderPeople();
        this.renderMarkers();
        this.updateCount();
    }

    // ---- MAP SETUP ----
    initMap() {
        this.map = L.map('map', {
            center: [20, 0],
            zoom: 3,
            zoomControl: true,
            attributionControl: true
        });

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Click on map to add person
        this.map.on('click', (e) => {
            this.onMapClick(e.latlng);
        });
    }

    // ---- EVENT BINDING ----
    bindEvents() {
        // Add person button
        document.getElementById('addPersonBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Modal close
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Form submit
        document.getElementById('personForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePerson();
        });

        // Photo upload
        document.getElementById('photoInput').addEventListener('change', (e) => {
            this.handlePhotoUpload(e);
        });

        // Current location button
        document.getElementById('useCurrentLocation').addEventListener('click', () => {
            this.useCurrentLocation();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterPeople(e.target.value, document.getElementById('filterCategory').value);
        });

        // Filter by category
        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.filterPeople(document.getElementById('searchInput').value, e.target.value);
        });

        // Close detail panel
        document.getElementById('closeDetail').addEventListener('click', () => {
            this.closeDetailPanel();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDetailPanel();
            }
        });
    }

    // ---- MAP CLICK HANDLER ----
    onMapClick(latlng) {
        // Remove temp marker if exists
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }

        // Add temporary marker
        this.tempMarker = L.marker(latlng, {
            icon: this.createTempIcon()
        }).addTo(this.map);

        this.tempMarker.bindPopup(`
            <div class="popup-content">
                <h3>📍 New Location</h3>
                <p>Lat: ${latlng.lat.toFixed(6)}</p>
                <p>Lng: ${latlng.lng.toFixed(6)}</p>
                <div class="popup-actions">
                    <button class="popup-btn-view" onclick="app.addPersonAtLocation(${latlng.lat}, ${latlng.lng})">
                        Add Person Here
                    </button>
                </div>
            </div>
        `).openPopup();
    }

    addPersonAtLocation(lat, lng) {
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
        this.openModal(null, lat, lng);
    }

    // ---- MODAL OPERATIONS ----
    openModal(person = null, lat = null, lng = null) {
        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');

        this.resetForm();

        if (person) {
            // Edit mode
            this.editingId = person.id;
            title.innerHTML = '<i class="fas fa-user-edit"></i> Edit Person';
            this.populateForm(person);
        } else {
            // Add mode
            this.editingId = null;
            title.innerHTML = '<i class="fas fa-user-plus"></i> Add New Person';

            if (lat !== null && lng !== null) {
                document.getElementById('latitude').value = lat.toFixed(6);
                document.getElementById('longitude').value = lng.toFixed(6);
                this.reverseGeocode(lat, lng);
            }
        }

        overlay.classList.add('active');
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        this.editingId = null;
        this.resetForm();
    }

    resetForm() {
        document.getElementById('personForm').reset();
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = '<i class="fas fa-user"></i>';
    }

    populateForm(person) {
        document.getElementById('firstName').value = person.firstName || '';
        document.getElementById('lastName').value = person.lastName || '';
        document.getElementById('email').value = person.email || '';
        document.getElementById('phone').value = person.phone || '';
        document.getElementById('category').value = person.category || 'friend';
        document.getElementById('age').value = person.age || '';
        document.getElementById('latitude').value = person.lat || '';
        document.getElementById('longitude').value = person.lng || '';
        document.getElementById('address').value = person.address || '';
        document.getElementById('notes').value = person.notes || '';

        if (person.photo) {
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${person.photo}" alt="Photo">`;
        }
    }

    // ---- SAVE PERSON ----
    savePerson() {
        const person = {
            id: this.editingId || this.generateId(),
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            category: document.getElementById('category').value,
            age: document.getElementById('age').value,
            lat: parseFloat(document.getElementById('latitude').value),
            lng: parseFloat(document.getElementById('longitude').value),
            address: document.getElementById('address').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            photo: this.currentPhoto || null,
            createdAt: this.editingId
                ? this.people.find(p => p.id === this.editingId)?.createdAt || new Date().toISOString()
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validate coordinates
        if (isNaN(person.lat) || isNaN(person.lng)) {
            this.showToast('Please provide valid coordinates.', 'error');
            return;
        }

        if (this.editingId) {
            // Update existing
            const index = this.people.findIndex(p => p.id === this.editingId);
            if (index !== -1) {
                // Preserve photo if not changed
                if (!person.photo && this.people[index].photo) {
                    person.photo = this.people[index].photo;
                }
                this.people[index] = person;
            }
            this.showToast(`${person.firstName} ${person.lastName} updated!`, 'success');
        } else {
            // Add new
            this.people.push(person);
            this.showToast(`${person.firstName} ${person.lastName} added!`, 'success');
        }

        this.saveToStorage();
        this.renderPeople();
        this.renderMarkers();
        this.updateCount();
        this.closeModal();

        // Fly to location
        this.map.flyTo([person.lat, person.lng], 14, { duration: 1.5 });

        this.currentPhoto = null;
    }

    // ---- DELETE PERSON ----
    deletePerson(id) {
        const person = this.people.find(p => p.id === id);
        if (!person) return;

        if (confirm(`Are you sure you want to remove ${person.firstName} ${person.lastName}?`)) {
            this.people = this.people.filter(p => p.id !== id);
            this.saveToStorage();
            this.renderPeople();
            this.renderMarkers();
            this.updateCount();
            this.closeDetailPanel();
            this.showToast(`${person.firstName} ${person.lastName} removed.`, 'warning');
        }
    }

    // ---- RENDER SIDEBAR LIST ----
    renderPeople(filtered = null) {
        const list = document.getElementById('personList');
        const emptyState = document.getElementById('emptyState');
        const data = filtered || this.people;

        if (data.length === 0) {
            list.innerHTML = '';
            list.appendChild(this.createEmptyState(filtered ? 'No matches found.' : null));
            return;
        }

        list.innerHTML = data.map(person => `
            <div class="person-card" data-id="${person.id}" onclick="app.selectPerson('${person.id}')">
                <div class="person-card-top">
                    <div class="person-avatar" style="background: ${this.getCategoryColor(person.category)}">
                        ${person.photo
                            ? `<img src="${person.photo}" alt="${person.firstName}">`
                            : this.getInitials(person.firstName, person.lastName)
                        }
                    </div>
                    <div class="person-info">
                        <div class="person-name">${person.firstName} ${person.lastName}</div>
                        <div class="person-location">
                            <i class="fas fa-map-pin"></i>
                            ${person.address || `${person.lat.toFixed(4)}, ${person.lng.toFixed(4)}`}
                        </div>
                    </div>
                    <span class="category-badge ${person.category}">${person.category}</span>
                </div>
            </div>
        `).join('');
    }

    createEmptyState(message) {
        const div = document.createElement('div');
        div.className = 'empty-state';
        div.innerHTML = `
            <i class="fas fa-user-plus"></i>
            <p>${message || 'No people added yet.'}</p>
            ${!message ? '<p>Click on the map or use the "Add Person" button to get started.</p>' : ''}
        `;
        return div;
    }

    // ---- RENDER MAP MARKERS ----
    renderMarkers() {
        // Remove existing markers
        Object.values(this.markers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = {};

        // Add markers for each person
        this.people.forEach(person => {
            const icon = this.createCustomIcon(person.category);
            const marker = L.marker([person.lat, person.lng], { icon })
                .addTo(this.map);

            marker.bindPopup(this.createPopupContent(person));

            marker.on('click', () => {
                this.highlightCard(person.id);
            });

            this.markers[person.id] = marker;
        });
    }

    createCustomIcon(category) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin ${category}"></div>`,
            iconSize: [36, 48],
            iconAnchor: [18, 48],
            popupAnchor: [0, -48]
        });
    }

    createTempIcon() {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin" style="background: #6B7280;"></div>`,
            iconSize: [36, 48],
            iconAnchor: [18, 48],
            popupAnchor: [0, -48]
        });
    }

    createPopupContent(person) {
        return `
            <div class="popup-content">
                <h3>${person.firstName} ${person.lastName}</h3>
                ${person.address ? `<p><i class="fas fa-map-pin"></i> ${person.address}</p>` : ''}
                ${person.phone ? `<p><i class="fas fa-phone"></i> ${person.phone}</p>` : ''}
                <span class="category-badge ${person.category}">${person.category}</span>
                <div class="popup-actions">
                    <button class="popup-btn-view" onclick="app.showPersonDetail('${person.id}')">
                        View Details
                    </button>
                    <button class="popup-btn-delete" onclick="app.deletePerson('${person.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    // ---- SELECT / HIGHLIGHT ----
    selectPerson(id) {
        const person = this.people.find(p => p.id === id);
        if (!person) return;

        // Fly to location
        this.map.flyTo([person.lat, person.lng], 15, { duration: 1 });

        // Open popup
        if (this.markers[id]) {
            this.markers[id].openPopup();
        }

        // Highlight card
        this.highlightCard(id);
    }

    highlightCard(id) {
        document.querySelectorAll('.person-card').forEach(card => {
            card.classList.remove('active');
        });
        const card = document.querySelector(`.person-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ---- DETAIL PANEL ----
    showPersonDetail(id) {
        const person = this.people.find(p => p.id === id);
        if (!person) return;

        const panel = document.getElementById('detailPanel');
        const content = document.getElementById('detailContent');

        content.innerHTML = `
            <div class="detail-avatar" style="background: ${this.getCategoryColor(person.category)}">
                ${person.photo
                    ? `<img src="${person.photo}" alt="${person.firstName}">`
                    : this.getInitials(person.firstName, person.lastName)
                }
            </div>
            <div class="detail-name">${person.firstName} ${person.lastName}</div>
            <div class="detail-category">
                <span class="category-badge ${person.category}">${person.category}</span>
            </div>

            <div class="detail-section">
                <h3>Contact Information</h3>
                ${person.email ? `
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Email</div>
                            <div class="detail-item-value">${person.email}</div>
                        </div>
                    </div>
                ` : ''}
                ${person.phone ? `
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Phone</div>
                            <div class="detail-item-value">${person.phone}</div>
                        </div>
                    </div>
                ` : ''}
                ${person.age ? `
                    <div class="detail-item">
                        <i class="fas fa-birthday-cake"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Age</div>
                            <div class="detail-item-value">${person.age} years old</div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h3>Location</h3>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Coordinates</div>
                        <div class="detail-item-value">${person.lat.toFixed(6)}, ${person.lng.toFixed(6)}</div>
                    </div>
                </div>
                ${person.address ? `
                    <div class="detail-item">
                        <i class="fas fa-home"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Address</div>
                            <div class="detail-item-value">${person.address}</div>
                        </div>
                    </div>
                ` : ''}
            </div>

            ${person.notes ? `
                <div class="detail-section">
                    <h3>Notes</h3>
                    <div class="detail-item">
                        <i class="fas fa-sticky-note"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-value">${person.notes}</div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Added</div>
                        <div class="detail-item-value">${new Date(person.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}</div>
                    </div>
                </div>
            </div>

            <div class="detail-actions">
                <button class="btn btn-primary" onclick="app.openModal(app.people.find(p=>p.id==='${person.id}'))">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="app.deletePerson('${person.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        panel.classList.add('active');

        // Close map popup
        this.map.closePopup();
    }

    closeDetailPanel() {
        document.getElementById('detailPanel').classList.remove('active');
    }

    // ---- FILTER / SEARCH ----
    filterPeople(searchTerm, category) {
        let filtered = [...this.people];

        if (category && category !== 'all') {
            filtered = filtered.filter(p => p.category === category);
        }

        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(p =>
                p.firstName.toLowerCase().includes(term) ||
                p.lastName.toLowerCase().includes(term) ||
                (p.email && p.email.toLowerCase().includes(term)) ||
                (p.phone && p.phone.includes(term)) ||
                (p.address && p.address.toLowerCase().includes(term))
            );
        }

        this.renderPeople(filtered);

        // Update markers visibility
        Object.keys(this.markers).forEach(id => {
            const isVisible = filtered.some(p => p.id === id);
            if (isVisible) {
                this.markers[id].setOpacity(1);
            } else {
                this.markers[id].setOpacity(0.2);
            }
        });
    }

    // ---- PHOTO HANDLING ----
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            this.showToast('Photo must be less than 2MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentPhoto = e.target.result;
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }

    // ---- GEOLOCATION ----
    useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        this.showToast('Getting your location...', 'success');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                document.getElementById('latitude').value = latitude.toFixed(6);
                document.getElementById('longitude').value = longitude.toFixed(6);
                this.reverseGeocode(latitude, longitude);
                this.showToast('Location detected!', 'success');
            },
            (error) => {
                this.showToast('Unable to get your location.', 'error');
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true }
        );
    }

    // ---- REVERSE GEOCODE ----
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en'
                    }
                }
            );
            const data = await response.json();
            if (data.display_name) {
                document.getElementById('address').value = data.display_name;
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
        }
    }

    // ---- UTILITIES ----
    generateId() {
        return 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getInitials(firstName, lastName) {
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    getCategoryColor(category) {
        const colors = {
            family: '#EC4899',
            friend: '#3B82F6',
            colleague: '#F59E0B',
            client: '#10B981',
            other: '#8B5CF6'
        };
        return colors[category] || colors.other;
    }

    updateCount() {
        document.getElementById('personCount').textContent = `${this.people.length} ${this.people.length === 1 ? 'person' : 'people'}`;
    }

    // ---- TOAST NOTIFICATIONS ----
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ---- LOCAL STORAGE ----
    saveToStorage() {
        try {
            localStorage.setItem('personLocatorData', JSON.stringify(this.people));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            this.showToast('Failed to save data. Storage might be full.', 'error');
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('personLocatorData');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return [];
        }
    }
}

// ===========================
// INITIALIZE APPLICATION
// ===========================
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PersonLocator();
});
