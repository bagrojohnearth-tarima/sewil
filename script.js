// Define strict geographic boundary boxes for Mayorga, Leyte 
const mayorgaBounds = L.latLngBounds(
    [10.8500, 124.9500], 
    [10.9500, 125.0700]  
);

// 1. Initialize Map Object with strict bounds restrictions
const map = L.map('map', {
    center: [10.9031, 125.0059],
    zoom: 14, 
    minZoom: 13,                
    maxZoom: 19,                
    maxBounds: mayorgaBounds,   
    maxBoundsViscosity: 1.0,    
    zoomControl: false 
});

L.control.zoom({ position: 'topright' }).addTo(map);

// 2. Base View Layer Channels
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
});

// 3. Define Vector Category Groups
const rhuLayer = L.layerGroup().addTo(map);
const barangayLayer = L.layerGroup().addTo(map);
const pharmacyLayer = L.layerGroup().addTo(map);

// Global Variables to track filtering state
let markerList = [];
let activeCategoryFilter = "all";

// 4. Color and Icon Logo Mapper Helper
function getFacilityMeta(category) {
    switch(category) {
        case 'Hospital': 
            return { color: '#e74c3c', icon: 'local_hospital' }; 
        case 'Clinic':   
            return { color: '#e67e22', icon: 'medical_services' }; 
        case 'Pharmacy': 
            return { color: '#2ecc71', icon: 'medication' }; 
        default:         
            return { color: '#34495e', icon: 'place' };
    }
}

// Helper to calculate real-time Open/Closed Status
function getStatusBadge(hoursStr) {
    if (!hoursStr || hoursStr.toLowerCase() === '24/7' || hoursStr.toLowerCase() === '24 hours') {
        return '<span class="status-tag status-open">Open 24/7</span>';
    }
    
    try {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Parse basic format patterns like "8:00 AM - 5:00 PM"
        const timeMatch = hoursStr.match(/(\d+):?(\d+)?\s*(AM|PM)\s*-\s*(\d+):?(\d+)?\s*(AM|PM)/i);
        if (timeMatch) {
            let startHour = parseInt(timeMatch[1]);
            const startAmPm = timeMatch[3].toUpperCase();
            let endHour = parseInt(timeMatch[4]);
            const endAmPm = timeMatch[6].toUpperCase();
            
            if (startAmPm === 'PM' && startHour < 12) startHour += 12;
            if (startAmPm === 'AM' && startHour === 12) startHour = 0;
            if (endAmPm === 'PM' && endHour < 12) endHour += 12;
            if (endAmPm === 'AM' && endHour === 12) endHour = 0;
            
            if (currentHour >= startHour && currentHour < endHour) {
                return '<span class="status-tag status-open">Open Now</span>';
            } else {
                return '<span class="status-tag status-closed">Closed</span>';
            }
        }
    } catch(e) { console.log("Time parser fallback invoked"); }
    
    return `<span class="status-tag status-unknown">${hoursStr || 'Hours Unknown'}</span>`;
}

// 5. Parse Mayorga GeoJSON Elements and Plot Custom Vector Markers
L.geoJSON(healthFacilitiesData, {
    pointToLayer: function (feature, latlng) {
        const props = feature.properties;
        const category = props.category;
        const meta = getFacilityMeta(category);
        
        const customHtmlIcon = L.divIcon({
            html: `<div class="custom-marker-pin" style="background-color: ${meta.color};"><span class="material-icons">${meta.icon}</span></div>`,
            className: 'custom-leaflet-icon',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -15]
        });

        const geoMarker = L.marker(latlng, { icon: customHtmlIcon });

        // Extract extra fallback attributes safely if missing from JSON data profile
        const hours = props.operating_hours || "8:00 AM - 5:00 PM";
        const staff = props.medical_staff || "Nurses / Standard Personnel";
        const image = props.image_url || "https://placehold.co/240x120?text=No+Photo+Available";
        const contact = props.contact || "None Registered";

        markerList.push({
            id: props.id || Math.random(),
            name: props.name,
            category: category,
            desc: props.desc,
            hours: hours,
            staff: staff,
            markerInstance: geoMarker,
            coords: latlng
        });

        // Expanded Popup Content Interface layout (Native Redirection Feature Integrated)
        const popupContent = `
            <div class="custom-popup">
                <div class="popup-title">${props.name}</div>
                <div style="display:flex; gap:6px; margin: 4px 0 10px 0; align-items:center;">
                    <span class="popup-badge" style="background-color:${meta.color};">${category}</span>
                    ${getStatusBadge(hours)}
                </div>
                
                <div class="popup-image-wrap">
                    <img src="${image}" alt="${props.name}" onerror="this.onerror=null; this.src='https://placehold.co/240x120?text=No+Photo+Available';">
                </div>

                <p class="popup-desc">${props.desc}</p>
                
                <div class="popup-info-row">
                    <span class="material-icons">schedule</span>
                    <span><b>Hours:</b> ${hours}</span>
                </div>
                <div class="popup-info-row">
                    <span class="material-icons">badge</span>
                    <span><b>Staff:</b> ${staff}</span>
                </div>
                <div class="popup-info-row">
                    <span class="material-icons">contact_phone</span>
                    <span><b>Contact:</b> ${contact}</span>
                </div>

                <a href="https://www.google.com/maps/dir/?api=1&destination=${latlng.lat},${latlng.lng}" target="_blank" class="native-route-btn shadow-glow">
                    <span class="material-icons">directions</span> Get Directions (GPS)
                </a>
            </div>
        `;
        
        geoMarker.bindPopup(popupContent, {
            maxWidth: 270,
            autoPanPadding: L.point(15, 15) 
        });

        if (category === 'Hospital') { rhuLayer.addLayer(geoMarker); }
        else if (category === 'Clinic') { barangayLayer.addLayer(geoMarker); }
        else if (category === 'Pharmacy') { pharmacyLayer.addLayer(geoMarker); }

        return geoMarker;
    }
});

const baseMaps = { "<span style='font-size: 0.85rem; font-weight:500;'>Street View</span>": openStreetMap, "<span style='font-size: 0.85rem; font-weight:500;'>Satellite View</span>": satelliteMap };
const overlayMaps = { " Main RHU": rhuLayer, " Barangay Stations": barangayLayer, " Pharmacies": pharmacyLayer };

L.control.layers(baseMaps, overlayMaps, { collapsed: true, position: 'topright' }).addTo(map);

// 6. User Live Geo-Tracking Target Control
const locateControl = L.control({ position: 'topright' });
locateControl.onAdd = function() {
    const btnContainer = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    btnContainer.innerHTML = `
        <button id="map-locate-btn" title="Find My Location" style="background: white; border: none; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px;">
            <span class="material-icons" style="color: #4a5568; font-size: 20px;">my_location</span>
        </button>
    `;
    return btnContainer;
};
locateControl.addTo(map);

document.getElementById('map-locate-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    map.locate({setView: true, maxZoom: 16});
});

map.on('locationfound', function(e) {
    if (mayorgaBounds.contains(e.latlng)) {
        L.circle(e.latlng, e.accuracy).addTo(map);
        L.marker(e.latlng).addTo(map).bindPopup("You are here").openPopup();
    } else {
        alert("Your device location falls outside the mapping boundary parameters set for Mayorga.");
    }
});

// 7. Interactive Sidebar Drawer Window
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = document.getElementById('sidebar');

function setSidebarState(isOpen) {
    if (isOpen) {
        sidebar.classList.remove('sidebar-hidden');
        sidebar.classList.add('sidebar-visible');
        toggleSidebarBtn.innerHTML = '<span class="material-icons">close</span>';
    } else {
        sidebar.classList.remove('sidebar-visible');
        sidebar.classList.add('sidebar-hidden');
        toggleSidebarBtn.innerHTML = '<span class="material-icons">menu</span>';
    }
}

toggleSidebarBtn.addEventListener('click', () => {
    const isCurrentlyVisible = sidebar.classList.contains('sidebar-visible');
    setSidebarState(!isCurrentlyVisible);
});

// 8. Directory Render & Filtering Infrastructure
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const directoryList = document.getElementById('directory-list');

function focusOnFacility(coords, markerInstance) {
    if (window.innerWidth <= 768) {
        map.setView(coords, 17);
        setTimeout(() => {
            markerInstance.openPopup();
            map.panBy([0, -80]); 
        }, 300);
        setSidebarState(false);
    } else {
        map.setView(coords, 16);
        markerInstance.openPopup();
    }
}

function renderDirectory(filterText = "") {
    directoryList.innerHTML = "";
    const cleanFilter = filterText.toLowerCase().trim();
    
    const matches = markerList.filter(item => {
        // Evaluate text search
        const matchesText = item.name.toLowerCase().includes(cleanFilter) || 
                            item.category.toLowerCase().includes(cleanFilter) ||
                            item.desc.toLowerCase().includes(cleanFilter);
        
        // Evaluate pill category constraint selection
        const matchesPill = (activeCategoryFilter === "all" || item.category === activeCategoryFilter);
        
        return matchesText && matchesPill;
    });

    if (matches.length === 0) {
        directoryList.innerHTML = '<p class="no-results">No facilities discovered matching this filter.</p>';
        return;
    }

    matches.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'directory-card';
        const meta = getFacilityMeta(item.category);
        
        itemCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background-color: ${meta.color}; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <span class="material-icons" style="font-size: 18px;">${meta.icon}</span>
                </div>
                <div style="overflow: hidden;">
                    <div class="card-name">${item.name}</div>
                    <div class="card-meta">${item.category} • <span style="color:#718096;">${item.hours}</span></div>
                </div>
            </div>
            <span class="material-icons card-arrow">near_me</span>
        `;
        
        itemCard.addEventListener('click', () => focusOnFacility(item.coords, item.markerInstance));
        directoryList.appendChild(itemCard);
    });
}

// Monitor User Input Actions Inside Text Search Bar
searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    val.length > 0 ? clearSearchBtn.classList.remove('hidden') : clearSearchBtn.classList.add('hidden');
    renderDirectory(val);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = "";
    clearSearchBtn.classList.add('hidden');
    renderDirectory("");
});

// Click Interactions For Quick Filter Pill Array
document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        activeCategoryFilter = e.target.getAttribute('data-category');
        renderDirectory(searchInput.value);
    });
});

renderDirectory("");