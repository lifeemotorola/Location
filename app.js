// ============================================
// LIBERIA COMMUNITY LOCATOR
// Household & resident directory — Republic of Liberia
// Pure HTML/CSS/JS · data stays in the browser
// ============================================

// ---------------------------------------------
// LIBERIA REFERENCE DATA
// ---------------------------------------------
const LIBERIA = {
    // Monrovia city center
    center: [6.3156, -10.8074],
    zoom: 13,

    // Rough national bounding box — used to flag points outside the country
    bounds: { minLat: 4.25, maxLat: 8.60, minLng: -11.60, maxLng: -7.30 },

    counties: [
        { name: 'Bomi',           capital: 'Tubmanburg',   lat: 6.87,  lng: -10.82 },
        { name: 'Bong',           capital: 'Gbarnga',      lat: 7.00,  lng: -9.47  },
        { name: 'Gbarpolu',       capital: 'Bopolu',       lat: 7.07,  lng: -10.49 },
        { name: 'Grand Bassa',    capital: 'Buchanan',     lat: 5.88,  lng: -10.05 },
        { name: 'Grand Cape Mount', capital: 'Robertsport', lat: 6.75, lng: -11.37 },
        { name: 'Grand Gedeh',    capital: 'Zwedru',       lat: 6.07,  lng: -8.13  },
        { name: 'Grand Kru',      capital: 'Barclayville', lat: 4.68,  lng: -8.23  },
        { name: 'Lofa',           capital: 'Voinjama',     lat: 8.42,  lng: -9.75  },
        { name: 'Margibi',        capital: 'Kakata',       lat: 6.53,  lng: -10.35 },
        { name: 'Maryland',       capital: 'Harper',       lat: 4.38,  lng: -7.72  },
        { name: 'Montserrado',    capital: 'Bensonville',  lat: 6.45,  lng: -10.61 },
        { name: 'Nimba',          capital: 'Sanniquellie', lat: 7.36,  lng: -8.71  },
        { name: 'River Cess',     capital: 'Cestos City',  lat: 5.46,  lng: -9.58  },
        { name: 'River Gee',      capital: 'Fish Town',    lat: 5.20,  lng: -7.88  },
        { name: 'Sinoe',          capital: 'Greenville',   lat: 5.01,  lng: -9.04  }
    ],

    // District suggestions are provided where they are confidently known
    // (Montserrado, where the national directory starts). Other counties
    // accept free text so enumerators are never blocked.
    districts: {
        Montserrado: ['Greater Monrovia', 'Commonwealth', 'Careysburg', 'St. Paul River', 'Todee']
    },

    communities: {
        Montserrado: [
            'Sinkor', 'Paynesville', 'West Point', 'Clara Town', 'New Kru Town',
            'Gardnersville', 'Congo Town', 'Brewerville', 'Johnsonville', 'Caldwell',
            'Barnesville', 'Red Light', 'Duport Road', 'Chocolate City', 'Peace Island',
            'Bensonville', 'Careysburg', 'Todee'
        ],
        Margibi: ['Kakata', 'Harbel', 'Cotton Tree', 'Firestone'],
        Bong: ['Gbarnga', 'Suakoko', 'Salala', 'Phebe', 'Totota'],
        Nimba: ['Sanniquellie', 'Ganta', 'Tappita', 'Saclepea', 'Bahn'],
        'Grand Bassa': ['Buchanan', 'Owensgrove', 'St. John River City', 'Little Bassa'],
        Lofa: ['Voinjama', 'Zorzor', 'Foya', 'Kolahun'],
        'Grand Cape Mount': ['Robertsport', 'Sinje', 'Tienii', 'Bendu'],
        Bomi: ['Tubmanburg', 'Klay', 'Suehn', 'Belefanai'],
        Gbarpolu: ['Bopolu', 'Kongba', 'Belle Yellah'],
        'Grand Gedeh': ['Zwedru', 'Toe Town', 'B\'hai', 'Putu'],
        'Grand Kru': ['Barclayville', 'Buah', 'Grand Cess'],
        Maryland: ['Harper', 'Pleebo', 'Karloken'],
        'River Cess': ['Cestos City', 'Timbo', 'Yarpah'],
        'River Gee': ['Fish Town', 'Kanweaken', 'Webbo'],
        Sinoe: ['Greenville', 'Juarzon', 'Butaw', 'Lexington']
    },

    streets: [
        'Broad Street', 'Randall Street', 'Gurley Street', 'Carey Street',
        'Benson Street', 'Mechlin Street', 'Lynch Street', 'Water Street',
        'Camp Johnson Road', 'Tubman Boulevard', 'Somalia Drive', 'ELWA Road',
        'Duport Road', 'Gardnersville Highway', 'Kakata Highway', 'Bomi Highway',
        'Ganta Highway', 'RIA Highway', '12th Street', '24th Street'
    ]
};

// Value → human label maps (used by the detail panel and CSV export)
const LABELS = {
    status: {
        owner: 'Owner occupied', renter: 'Renter / tenant',
        caretaker: 'Caretaker / family', vacant: 'Vacant', business: 'Business'
    },
    houseType: {
        concrete_bungalow: 'Concrete block — bungalow',
        concrete_storey: 'Concrete block — storey building',
        mud_house: 'Mud / brick “country” house',
        zinc_shack: 'Zinc / makeshift structure',
        compound: 'Compound (several households)',
        apartment: 'Apartment / flat',
        commercial: 'Commercial / business',
        other: 'Other'
    },
    wall: {
        concrete_block: 'Concrete block', mud_brick: 'Mud / brick',
        wood_zinc: 'Wood / zinc', stone: 'Stone', other: 'Other'
    },
    roof: {
        zinc: 'Zinc / metal sheet', thatch: 'Thatch / palm',
        concrete_tile: 'Concrete / tile', asbestos: 'Asbestos', other: 'Other'
    },
    condition: { good: 'Good', fair: 'Fair', poor: 'Poor', dilapidated: 'Dilapidated' },
    gender: { male: 'Male', female: 'Female' },
    marital: {
        married: 'Married', cohabiting: 'Cohabiting / partner', single: 'Single',
        widowed: 'Widowed', divorced: 'Divorced / separated'
    },
    nationality: {
        liberian: 'Liberian', sierra_leonean: 'Sierra Leonean', guinean: 'Guinean',
        ivorian: 'Ivorian', ecowas_other: 'Other ECOWAS', other: 'Other'
    },
    income: {
        extreme_poor: 'Extreme poor', poor: 'Poor', non_poor: 'Non-poor',
        sct: 'Social Cash Transfer beneficiary', not_stated: 'Not stated'
    },
    mobileMoney: {
        mtn_momo: 'MTN MoMo', orange_money: 'Orange Money', both: 'MTN MoMo & Orange Money', none: 'None'
    },
    water: {
        lwsc_piped: 'LWSC piped water', kiosk: 'Public kiosk / standpipe',
        handpump: 'Hand pump / borehole', protected_well: 'Protected well',
        unprotected_well: 'Unprotected well', spring: 'Spring',
        river_creek: 'River / creek', rainwater: 'Rainwater',
        sachet_bottled: 'Sachet / bottled water', truck: 'Water truck'
    },
    electricity: {
        lec_grid: 'LEC grid', minigrid: 'Community mini-grid',
        solar: 'Solar home system', generator: 'Generator', none: 'None'
    },
    cooking: {
        charcoal: 'Charcoal', firewood: 'Firewood', lpg: 'LPG / gas',
        kerosene: 'Kerosene', electricity: 'Electricity', none: 'None / shared'
    },
    internet: { home: 'Home broadband / Wi-Fi', mobile: 'Mobile data only', none: 'No access' },
    toilet: {
        flush: 'Flush toilet', vip: 'VIP latrine', pit: 'Pit latrine',
        shared: 'Shared / public latrine', none: 'None / open defecation'
    },
    waste: {
        mcc: 'City corporation collection', community_bin: 'Community dumpster',
        burned: 'Burned', buried: 'Buried', open_dump: 'Open dumping', composting: 'Composting'
    },
    programs: {
        nhis: 'NHIS', fhci: 'Free health care (FHCI)', epi: 'Immunization (EPI)',
        hiv_tb: 'HIV / TB care', nutrition: 'Nutrition', sct: 'Social Cash Transfer',
        nasscorp: 'NASSCORP', disability: 'Disability support',
        vsla: 'VSLA / susu savings', malaria: 'Malaria / bed nets'
    }
};

const STATUS_COLORS = {
    owner: '#4F46E5', renter: '#10B981', caretaker: '#0EA5E9',
    vacant: '#F59E0B', business: '#EC4899'
};

const STORAGE_KEY = 'liberiaCommunityLocator.v2';
const LEGACY_KEY = 'communityLocatorData';

// ---------------------------------------------
// SAMPLE DATA — clearly marked, easy to clear
// ---------------------------------------------
const DEMO_HOUSEHOLDS = [
    {
        houseNumber: 'SKR-014', houseLot: 'Plot 14', houseBlock: 'Block B',
        houseStreet: 'Tubman Boulevard', houseCounty: 'Montserrado',
        houseDistrict: 'Greater Monrovia', houseCommunity: 'Sinkor',
        houseClan: '', houseType: 'concrete_storey', houseStatus: 'owner',
        wallMaterial: 'concrete_block', roofMaterial: 'zinc',
        structureCondition: 'good', yearBuilt: '1998', floorCount: '2', roomCount: '6',
        headFirstName: 'Emmanuel', headLastName: 'Kollie', headAge: '48', headGender: 'male',
        headCivilStatus: 'married', headNationality: 'liberian',
        headOccupation: 'Civil servant', headContact: '+231 77 123 4567',
        headEmail: '', totalPersons: 5, totalMale: 2, totalFemale: 3,
        totalMinors: 2, totalSenior: 1, totalPwd: 0,
        members: [
            { firstName: 'Mamie', lastName: 'Kollie', age: '43', gender: 'female', relation: 'Spouse' },
            { firstName: 'Joseph', lastName: 'Kollie', age: '16', gender: 'male', relation: 'Child' },
            { firstName: 'Grace', lastName: 'Kollie', age: '11', gender: 'female', relation: 'Child' },
            { firstName: 'Esther', lastName: 'Kollie', age: '72', gender: 'female', relation: 'Parent' }
        ],
        lat: 6.2884, lng: -10.7816,
        fullAddress: 'Tubman Boulevard, Sinkor, Monrovia, Montserrado County',
        landmark: 'Opposite the Total filling station', zone: 'Zone 3', enumArea: 'LR-MO-014',
        incomeClass: 'non_poor', mobileMoney: 'mtn_momo', waterSource: 'lwsc_piped',
        electricitySource: 'lec_grid', cookingFuel: 'charcoal', internetAccess: 'mobile',
        toiletType: 'flush', wasteDisposal: 'mcc', nearestClinic: 'JFK Memorial Hospital',
        clinicDistance: '2.4', healthPrograms: ['nhis', 'epi'],
        remarks: 'Household keeps a small shop at the front of the building.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-12', consent: true
    },
    {
        houseNumber: 'PNY-207', houseLot: 'Plot 207', houseBlock: 'Block D',
        houseStreet: 'ELWA Road', houseCounty: 'Montserrado',
        houseDistrict: 'Greater Monrovia', houseCommunity: 'Paynesville',
        houseClan: '', houseType: 'concrete_bungalow', houseStatus: 'renter',
        wallMaterial: 'concrete_block', roofMaterial: 'zinc',
        structureCondition: 'fair', yearBuilt: '2006', floorCount: '1', roomCount: '4',
        headFirstName: 'Mamie', headLastName: 'Johnson', headAge: '34', headGender: 'female',
        headCivilStatus: 'single', headNationality: 'liberian',
        headOccupation: 'Market trader', headContact: '+231 88 445 2210',
        headEmail: '', totalPersons: 4, totalMale: 1, totalFemale: 3,
        totalMinors: 3, totalSenior: 0, totalPwd: 0,
        members: [
            { firstName: 'Prince', lastName: 'Johnson', age: '9', gender: 'male', relation: 'Child' },
            { firstName: 'Fatu', lastName: 'Johnson', age: '6', gender: 'female', relation: 'Child' },
            { firstName: 'Ruth', lastName: 'Johnson', age: '2', gender: 'female', relation: 'Child' }
        ],
        lat: 6.2701, lng: -10.7104,
        fullAddress: 'ELWA Road, Paynesville, Montserrado County',
        landmark: 'Behind the ELWA junction market', zone: 'Zone 7', enumArea: 'LR-MO-107',
        incomeClass: 'poor', mobileMoney: 'orange_money', waterSource: 'kiosk',
        electricitySource: 'minigrid', cookingFuel: 'charcoal', internetAccess: 'mobile',
        toiletType: 'shared', wasteDisposal: 'community_bin', nearestClinic: 'ELWA Hospital',
        clinicDistance: '1.1', healthPrograms: ['fhci', 'sct', 'epi'],
        remarks: 'Female-headed household; three children under 10.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-14', consent: true
    },
    {
        houseNumber: 'WPT-031', houseLot: '', houseBlock: '',
        houseStreet: 'Water Street', houseCounty: 'Montserrado',
        houseDistrict: 'Greater Monrovia', houseCommunity: 'West Point',
        houseClan: '', houseType: 'zinc_shack', houseStatus: 'owner',
        wallMaterial: 'wood_zinc', roofMaterial: 'zinc',
        structureCondition: 'poor', yearBuilt: '2011', floorCount: '1', roomCount: '2',
        headFirstName: 'Musa', headLastName: 'Kamara', headAge: '39', headGender: 'male',
        headCivilStatus: 'married', headNationality: 'liberian',
        headOccupation: 'Fisher', headContact: '+231 77 908 3371',
        headEmail: '', totalPersons: 5, totalMale: 3, totalFemale: 2,
        totalMinors: 2, totalSenior: 1, totalPwd: 1,
        members: [
            { firstName: 'Hawa', lastName: 'Kamara', age: '35', gender: 'female', relation: 'Spouse' },
            { firstName: 'Ibrahim', lastName: 'Kamara', age: '12', gender: 'male', relation: 'Child' },
            { firstName: 'Aminata', lastName: 'Kamara', age: '8', gender: 'female', relation: 'Child' },
            { firstName: 'Sorie', lastName: 'Kamara', age: '61', gender: 'male', relation: 'Parent' }
        ],
        lat: 6.3129, lng: -10.8062,
        fullAddress: 'Water Street, West Point, Monrovia, Montserrado County',
        landmark: 'Near the West Point fish landing site', zone: 'Zone 1', enumArea: 'LR-MO-021',
        incomeClass: 'extreme_poor', mobileMoney: 'none', waterSource: 'sachet_bottled',
        electricitySource: 'none', cookingFuel: 'charcoal', internetAccess: 'none',
        toiletType: 'none', wasteDisposal: 'open_dump', nearestClinic: 'Redemption Hospital',
        clinicDistance: '0.8', healthPrograms: ['fhci', 'disability', 'sct'],
        remarks: 'One member with a mobility disability — follow up on assistive devices.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-15', consent: true
    },
    {
        houseNumber: 'GDS-118', houseLot: 'Plot 118', houseBlock: 'Block A',
        houseStreet: 'Gardnersville Highway', houseCounty: 'Montserrado',
        houseDistrict: 'Greater Monrovia', houseCommunity: 'Gardnersville',
        houseClan: '', houseType: 'compound', houseStatus: 'caretaker',
        wallMaterial: 'concrete_block', roofMaterial: 'zinc',
        structureCondition: 'fair', yearBuilt: '1994', floorCount: '1', roomCount: '5',
        headFirstName: 'Josephine', headLastName: 'Doe', headAge: '57', headGender: 'female',
        headCivilStatus: 'widowed', headNationality: 'liberian',
        headOccupation: 'Small shop / provisions', headContact: '+231 55 612 0944',
        headEmail: '', totalPersons: 6, totalMale: 2, totalFemale: 4,
        totalMinors: 3, totalSenior: 0, totalPwd: 0,
        members: [
            { firstName: 'Samuel', lastName: 'Doe', age: '31', gender: 'male', relation: 'Child' },
            { firstName: 'Comfort', lastName: 'Doe', age: '27', gender: 'female', relation: 'Child' },
            { firstName: 'Blessing', lastName: 'Doe', age: '14', gender: 'female', relation: 'Grandchild' },
            { firstName: 'Prince', lastName: 'Doe', age: '10', gender: 'male', relation: 'Grandchild' },
            { firstName: 'Victoria', lastName: 'Doe', age: '5', gender: 'female', relation: 'Grandchild' }
        ],
        lat: 6.3352, lng: -10.7458,
        fullAddress: 'Gardnersville Highway, Gardnersville, Montserrado County',
        landmark: 'Beside the Gardnersville town hall', zone: 'Zone 5', enumArea: 'LR-MO-088',
        incomeClass: 'poor', mobileMoney: 'mtn_momo', waterSource: 'handpump',
        electricitySource: 'solar', cookingFuel: 'charcoal', internetAccess: 'mobile',
        toiletType: 'pit', wasteDisposal: 'community_bin', nearestClinic: 'Redemption Hospital',
        clinicDistance: '3.6', healthPrograms: ['sct', 'nasscorp', 'nutrition'],
        remarks: 'Family house shared by three generations.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-16', consent: true
    },
    {
        houseNumber: 'CTN-052', houseLot: '', houseBlock: 'Block C',
        houseStreet: 'Benson Street', houseCounty: 'Montserrado',
        houseDistrict: 'Greater Monrovia', houseCommunity: 'Congo Town',
        houseClan: '', houseType: 'concrete_bungalow', houseStatus: 'vacant',
        wallMaterial: 'concrete_block', roofMaterial: 'concrete_tile',
        structureCondition: 'good', yearBuilt: '2014', floorCount: '1', roomCount: '4',
        headFirstName: '', headLastName: '', headAge: '', headGender: 'male',
        headCivilStatus: 'single', headNationality: 'liberian',
        headOccupation: '', headContact: '', headEmail: '',
        totalPersons: 0, totalMale: 0, totalFemale: 0,
        totalMinors: 0, totalSenior: 0, totalPwd: 0, members: [],
        lat: 6.2849, lng: -10.7603,
        fullAddress: 'Benson Street, Congo Town, Montserrado County',
        landmark: 'Opposite the community clinic', zone: 'Zone 4', enumArea: 'LR-MO-052',
        incomeClass: '', mobileMoney: 'none', waterSource: 'lwsc_piped',
        electricitySource: 'lec_grid', cookingFuel: 'none', internetAccess: 'none',
        toiletType: 'flush', wasteDisposal: 'mcc', nearestClinic: 'JFK Memorial Hospital',
        clinicDistance: '1.9', healthPrograms: [],
        remarks: 'Vacant — owner living abroad, caretaker checks weekly.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-16', consent: true
    },
    {
        houseNumber: 'NKT-089', houseLot: 'Plot 89', houseBlock: '',
        houseStreet: 'Lynch Street', houseCounty: 'Montserrado',
        houseDistrict: 'Greater Monrovia', houseCommunity: 'New Kru Town',
        houseClan: '', houseType: 'mud_house', houseStatus: 'renter',
        wallMaterial: 'mud_brick', roofMaterial: 'thatch',
        structureCondition: 'dilapidated', yearBuilt: '1987', floorCount: '1', roomCount: '3',
        headFirstName: 'Samuel', headLastName: 'Toe', headAge: '44', headGender: 'male',
        headCivilStatus: 'cohabiting', headNationality: 'liberian',
        headOccupation: 'Mason / carpenter', headContact: '+231 77 330 8877',
        headEmail: '', totalPersons: 5, totalMale: 3, totalFemale: 2,
        totalMinors: 3, totalSenior: 0, totalPwd: 0,
        members: [
            { firstName: 'Korto', lastName: 'Toe', age: '38', gender: 'female', relation: 'Spouse' },
            { firstName: 'Abraham', lastName: 'Toe', age: '13', gender: 'male', relation: 'Child' },
            { firstName: 'Esther', lastName: 'Toe', age: '9', gender: 'female', relation: 'Child' },
            { firstName: 'Moses', lastName: 'Toe', age: '4', gender: 'male', relation: 'Child' }
        ],
        lat: 6.3321, lng: -10.7967,
        fullAddress: 'Lynch Street, New Kru Town, Montserrado County',
        landmark: 'Near the New Kru Town market', zone: 'Zone 2', enumArea: 'LR-MO-034',
        incomeClass: 'poor', mobileMoney: 'orange_money', waterSource: 'unprotected_well',
        electricitySource: 'none', cookingFuel: 'firewood', internetAccess: 'mobile',
        toiletType: 'shared', wasteDisposal: 'burned', nearestClinic: 'Redemption Hospital',
        clinicDistance: '1.7', healthPrograms: ['fhci', 'epi'],
        remarks: 'Roof leaks in the rainy season — shelter support needed.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-17', consent: true
    },
    {
        houseNumber: 'BRW-223', houseLot: 'Plot 223', houseBlock: 'Block E',
        houseStreet: 'Bomi Highway', houseCounty: 'Montserrado',
        houseDistrict: 'St. Paul River', houseCommunity: 'Brewerville',
        houseClan: '', houseType: 'concrete_bungalow', houseStatus: 'owner',
        wallMaterial: 'concrete_block', roofMaterial: 'zinc',
        structureCondition: 'good', yearBuilt: '2009', floorCount: '1', roomCount: '5',
        headFirstName: 'Abraham', headLastName: 'Kpadeh', headAge: '52', headGender: 'male',
        headCivilStatus: 'married', headNationality: 'liberian',
        headOccupation: 'Driver', headContact: '+231 88 771 4520',
        headEmail: 'a.kpadeh@example.com', totalPersons: 5, totalMale: 2, totalFemale: 3,
        totalMinors: 1, totalSenior: 1, totalPwd: 0,
        members: [
            { firstName: 'Ruth', lastName: 'Kpadeh', age: '47', gender: 'female', relation: 'Spouse' },
            { firstName: 'Daniel', lastName: 'Kpadeh', age: '20', gender: 'male', relation: 'Child' },
            { firstName: 'Mary', lastName: 'Kpadeh', age: '15', gender: 'female', relation: 'Child' },
            { firstName: 'Korto', lastName: 'Kpadeh', age: '67', gender: 'female', relation: 'Parent' }
        ],
        lat: 6.3718, lng: -10.8789,
        fullAddress: 'Bomi Highway, Brewerville, Montserrado County',
        landmark: 'After the Brewerville junction, white gate', zone: 'Zone 9', enumArea: 'LR-MO-201',
        incomeClass: 'non_poor', mobileMoney: 'both', waterSource: 'protected_well',
        electricitySource: 'lec_grid', cookingFuel: 'lpg', internetAccess: 'home',
        toiletType: 'flush', wasteDisposal: 'collected', nearestClinic: 'St. Joseph Catholic Hospital',
        clinicDistance: '8.2', healthPrograms: ['nhis', 'nasscorp'],
        remarks: 'Has a generator for backup power.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-18', consent: true
    },
    {
        houseNumber: 'GBR-007', houseLot: 'Plot 7', houseBlock: 'Block A',
        houseStreet: 'Ganta Highway', houseCounty: 'Bong',
        houseDistrict: '', houseCommunity: 'Gbarnga',
        houseClan: 'Kpelleh Clan', houseType: 'concrete_bungalow', houseStatus: 'owner',
        wallMaterial: 'concrete_block', roofMaterial: 'zinc',
        structureCondition: 'fair', yearBuilt: '2001', floorCount: '1', roomCount: '4',
        headFirstName: 'Comfort', headLastName: 'Nyema', headAge: '41', headGender: 'female',
        headCivilStatus: 'married', headNationality: 'liberian',
        headOccupation: 'Farmer', headContact: '+231 77 265 1188',
        headEmail: '', totalPersons: 5, totalMale: 2, totalFemale: 3,
        totalMinors: 3, totalSenior: 0, totalPwd: 0,
        members: [
            { firstName: 'James', lastName: 'Nyema', age: '46', gender: 'male', relation: 'Spouse' },
            { firstName: 'Fatu', lastName: 'Nyema', age: '12', gender: 'female', relation: 'Child' },
            { firstName: 'Peter', lastName: 'Nyema', age: '8', gender: 'male', relation: 'Child' },
            { firstName: 'Hawa', lastName: 'Nyema', age: '3', gender: 'female', relation: 'Child' }
        ],
        lat: 6.9982, lng: -9.4721,
        fullAddress: 'Ganta Highway, Gbarnga, Bong County',
        landmark: 'Near the Gbarnga Central Market', zone: 'Zone 1', enumArea: 'LR-BG-007',
        incomeClass: 'poor', mobileMoney: 'mtn_momo', waterSource: 'handpump',
        electricitySource: 'solar', cookingFuel: 'firewood', internetAccess: 'mobile',
        toiletType: 'vip', wasteDisposal: 'buried', nearestClinic: 'Phebe Hospital',
        clinicDistance: '4.5', healthPrograms: ['epi', 'nutrition'],
        remarks: 'Farms upland rice and cassava.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-19', consent: true
    },
    {
        houseNumber: 'BCN-044', houseLot: 'Plot 44', houseBlock: '',
        houseStreet: 'Buchanan Main Street', houseCounty: 'Grand Bassa',
        houseDistrict: '', houseCommunity: 'Buchanan',
        houseClan: '', houseType: 'commercial', houseStatus: 'business',
        wallMaterial: 'concrete_block', roofMaterial: 'zinc',
        structureCondition: 'good', yearBuilt: '2016', floorCount: '1', roomCount: '3',
        headFirstName: 'Esther', headLastName: 'Tarr', headAge: '36', headGender: 'female',
        headCivilStatus: 'single', headNationality: 'liberian',
        headOccupation: 'Small shop / provisions', headContact: '+231 55 220 7741',
        headEmail: '', totalPersons: 2, totalMale: 0, totalFemale: 2,
        totalMinors: 1, totalSenior: 0, totalPwd: 0,
        members: [
            { firstName: 'Grace', lastName: 'Tarr', age: '7', gender: 'female', relation: 'Child' }
        ],
        lat: 5.8813, lng: -10.0461,
        fullAddress: 'Buchanan Main Street, Buchanan, Grand Bassa County',
        landmark: 'Beside the Buchanan port gate', zone: 'Zone 2', enumArea: 'LR-GB-044',
        incomeClass: 'poor', mobileMoney: 'orange_money', waterSource: 'kiosk',
        electricitySource: 'minigrid', cookingFuel: 'charcoal', internetAccess: 'mobile',
        toiletType: 'shared', wasteDisposal: 'community_bin', nearestClinic: 'Buchanan Government Hospital',
        clinicDistance: '1.3', healthPrograms: ['fhci', 'sct'],
        remarks: 'Shop and home in the same building.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-20', consent: true
    },
    {
        houseNumber: 'JHN-311', houseLot: 'Plot 311', houseBlock: 'Block F',
        houseStreet: 'Johnsonville Road', houseCounty: 'Montserrado',
        houseDistrict: 'Commonwealth', houseCommunity: 'Johnsonville',
        houseClan: '', houseType: 'mud_house', houseStatus: 'owner',
        wallMaterial: 'mud_brick', roofMaterial: 'zinc',
        structureCondition: 'fair', yearBuilt: '1992', floorCount: '1', roomCount: '4',
        headFirstName: 'Prince', headLastName: 'Weah', headAge: '63', headGender: 'male',
        headCivilStatus: 'married', headNationality: 'liberian',
        headOccupation: 'Farmer', headContact: '+231 77 512 6633',
        headEmail: '', totalPersons: 4, totalMale: 2, totalFemale: 2,
        totalMinors: 0, totalSenior: 1, totalPwd: 1,
        members: [
            { firstName: 'Martha', lastName: 'Weah', age: '59', gender: 'female', relation: 'Spouse' },
            { firstName: 'James', lastName: 'Weah', age: '29', gender: 'male', relation: 'Child' },
            { firstName: 'Alice', lastName: 'Weah', age: '24', gender: 'female', relation: 'Child' }
        ],
        lat: 6.3184, lng: -10.6817,
        fullAddress: 'Johnsonville Road, Johnsonville, Montserrado County',
        landmark: 'Near the Johnsonville palm farm', zone: 'Zone 8', enumArea: 'LR-MO-311',
        incomeClass: 'poor', mobileMoney: 'mtn_momo', waterSource: 'handpump',
        electricitySource: 'solar', cookingFuel: 'firewood', internetAccess: 'none',
        toiletType: 'pit', wasteDisposal: 'buried', nearestClinic: 'Careysburg Health Center',
        clinicDistance: '6.8', healthPrograms: ['nasscorp', 'disability'],
        remarks: 'Elderly couple — regular home-care visit recommended.',
        surveyedBy: 'Demo enumerator', surveyDate: '2026-10-20', consent: true
    }
];

// ============================================
// APPLICATION
// ============================================
class CommunityLocator {
    constructor() {
        this.households = this.loadFromStorage();
        this.map = null;
        this.markers = {};
        this.editingId = null;
        this.tempMarker = null;
        this.activeTab = 'house';
        this.pendingLatLng = null;
        this.basemaps = {};
        this.activeBasemap = 'street';
        this.locateLayer = null;
        this.filters = { county: 'all', district: 'all', status: 'all', street: 'all', search: '' };

        this.init();
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        this.initMap();
        this.fillStaticDatalists();
        this.buildCountySelects();
        this.bindEvents();
        this.renderHouseholds();
        this.renderAllMarkers();
        this.updateStats();
        this.populateFilters();
        this.updateStorageNote();
        this.updateOnlineStatus();

        // Returning users should see their records, not an empty Monrovia
        if (this.households.length > 0) {
            setTimeout(() => this.fitAll(), 500);
        }
    }

    updateOnlineStatus() {
        const banner = document.getElementById('offlineBanner');
        if (!banner) return;
        banner.hidden = navigator.onLine !== false;
    }

    // ─────────────────────────────────────────
    // MAP
    // ─────────────────────────────────────────
    initMap() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.map = L.map('map', {
            center: LIBERIA.center,
            zoom: LIBERIA.zoom,
            zoomControl: false,
            preferCanvas: false
        });

        // Bottom-left keeps the zoom buttons clear of the search tools
        if (L.control && L.control.zoom) {
            L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
        }

        this.basemaps.street = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
            }
        );

        this.basemaps.satellite = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
                maxZoom: 19
            }
        );

        this.basemaps.street.addTo(this.map);

        this.basemaps.street.on('tileerror', () => {
            if (this._tileWarned) return;
            this._tileWarned = true;
            this.showToast('Some map tiles failed to load. Check your internet connection.', 'warning');
        });

        // Map click → register a household at that point
        this.map.on('click', (e) => this.onMapClick(e.latlng));

        setTimeout(() => this.map.invalidateSize(), 300);
    }

    toggleBasemap() {
        const next = this.activeBasemap === 'street' ? 'satellite' : 'street';
        this.map.removeLayer(this.basemaps[this.activeBasemap]);
        this.basemaps[next].addTo(this.map);
        this.activeBasemap = next;

        const isSat = next === 'satellite';
        const btn = document.getElementById('basemapBtn');
        document.getElementById('basemapLabel').textContent = isSat ? 'Street map' : 'Satellite';
        btn.setAttribute('aria-pressed', String(isSat));
        btn.classList.toggle('active', isSat);
        this.showToast(isSat ? 'Satellite imagery on.' : 'Street map on.', 'success');
    }

    fitAll() {
        const points = this.households
            .filter(h => Number.isFinite(h.lat) && Number.isFinite(h.lng))
            .map(h => [h.lat, h.lng]);

        if (points.length === 0) {
            this.map.flyTo(LIBERIA.center, LIBERIA.zoom, { duration: 1 });
            this.showToast('No households yet — showing Monrovia.', 'warning');
            return;
        }

        if (points.length === 1) {
            this.map.flyTo(points[0], 17, { duration: 1 });
            return;
        }

        this.map.flyToBounds(L.latLngBounds(points).pad(0.2), { duration: 1 });
    }

    // ─────────────────────────────────────────
    // MAP CLICK → TEMP MARKER
    // ─────────────────────────────────────────
    onMapClick(latlng) {
        this.showTempMarker(latlng.lat, latlng.lng);
    }

    showTempMarker(lat, lng) {
        this.removeTempMarker();
        this.pendingLatLng = { lat, lng };

        this.tempMarker = L.marker([lat, lng], {
            icon: this.createMarkerIcon('vacant'),
            zIndexOffset: 1000
        }).addTo(this.map);

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
            <div class="popup-header">
                <div class="popup-house-num">📍 New location</div>
                <div class="popup-street">
                    ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
            </div>
            <div class="popup-body">
                <div class="popup-row">
                    <i class="fas fa-circle-info" aria-hidden="true"></i>
                    Register a household at this point.
                </div>
                ${this.outsideLiberia(lat, lng)
                    ? '<div class="popup-row popup-warn"><i class="fas fa-triangle-exclamation"></i> This point is outside Liberia.</div>'
                    : ''}
            </div>
            <div class="popup-actions">
                <button type="button" id="registerHereBtn" class="popup-btn-view">
                    🏠 Register household here
                </button>
                <button type="button" id="cancelTempBtn" class="popup-btn-edit">
                    Cancel
                </button>
            </div>
        `;

        this.tempMarker.bindPopup(popupContent, { maxWidth: 280, className: 'community-popup' });

        this.tempMarker.on('popupopen', () => {
            document.getElementById('registerHereBtn')
                ?.addEventListener('click', () => this.registerAtPendingLocation());
            document.getElementById('cancelTempBtn')
                ?.addEventListener('click', () => {
                    this.removeTempMarker();
                    this.map.closePopup();
                });
        });

        this.tempMarker.openPopup();
        this.reverseGeocodeQuiet(lat, lng, (address) => {
            if (!this.tempMarker) return;
            const street = popupContent.querySelector('.popup-street');
            if (street) {
                street.textContent = address
                    ? address.split(',').slice(0, 3).join(',')
                    : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        });
    }

    registerAtPendingLocation() {
        if (!this.pendingLatLng) {
            this.showToast('No location selected. Tap the map first.', 'error');
            return;
        }
        const { lat, lng } = this.pendingLatLng;
        this.removeTempMarker();
        this.map.closePopup();
        this.openModal(null, lat, lng);
    }

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
    // PLACE SEARCH (Nominatim, Liberia only)
    // ─────────────────────────────────────────
    async searchPlace(query) {
        const resultsBox = document.getElementById('placeResults');
        const clearBtn = document.getElementById('placeSearchClear');
        const q = query.trim();

        if (clearBtn) clearBtn.hidden = q.length === 0;

        if (q.length < 3) {
            resultsBox.hidden = true;
            resultsBox.innerHTML = '';
            return;
        }

        if (this._placeController) this._placeController.abort();
        this._placeController = new AbortController();

        try {
            const url = 'https://nominatim.openstreetmap.org/search'
                + `?format=json&limit=6&countrycodes=lr&addressdetails=1`
                + `&viewbox=${LIBERIA.bounds.minLng},${LIBERIA.bounds.maxLat},${LIBERIA.bounds.maxLng},${LIBERIA.bounds.minLat}`
                + `&bounded=1&q=${encodeURIComponent(q)}`;

            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en' },
                signal: this._placeController.signal
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (!data.length) {
                resultsBox.innerHTML = '<div class="place-empty">No place found in Liberia. Try a county or town name.</div>';
                resultsBox.hidden = false;
                return;
            }

            resultsBox.innerHTML = data.map((r, i) => {
                const parts = String(r.display_name || '').split(',');
                const title = parts.shift() || 'Unnamed place';
                return `
                    <button type="button" class="place-result" data-index="${i}">
                        <i class="fas fa-location-dot" aria-hidden="true"></i>
                        <span>
                            <strong>${this.esc(title)}</strong>
                            <small>${this.esc(parts.slice(0, 3).join(',').trim())}</small>
                        </span>
                    </button>
                `;
            }).join('');
            resultsBox.hidden = false;

            resultsBox.querySelectorAll('.place-result').forEach(btn => {
                btn.addEventListener('click', () => {
                    const r = data[Number(btn.dataset.index)];
                    this.selectPlaceResult(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                });
            });
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn('Place search failed:', err);
            resultsBox.innerHTML = '<div class="place-empty">Place search is unavailable offline. Tap the map instead.</div>';
            resultsBox.hidden = false;
        }
    }

    selectPlaceResult(lat, lng, name) {
        document.getElementById('placeResults').hidden = true;
        document.getElementById('placeSearch').value = '';

        this.map.flyTo([lat, lng], 15, { duration: 1.2 });
        this.showTempMarker(lat, lng);
        this.showToast(`Showing ${String(name || '').split(',')[0]}`, 'success');
    }

    // ─────────────────────────────────────────
    // LOCATE ME
    // ─────────────────────────────────────────
    locateMe() {
        if (!navigator.geolocation) {
            this.showToast('This browser does not support geolocation.', 'error');
            return;
        }

        const btn = document.getElementById('locateMeBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Locating…';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;

                if (this.locateLayer) {
                    this.map.removeLayer(this.locateLayer);
                    this.locateLayer = null;
                }

                const group = L.layerGroup().addTo(this.map);

                L.circle([latitude, longitude], {
                    radius: Math.max(accuracy || 0, 15),
                    color: '#4F46E5', weight: 1, fillColor: '#4F46E5', fillOpacity: 0.12
                }).addTo(group);

                L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        className: '',
                        html: '<div class="locate-dot"></div>',
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                    })
                }).addTo(group).bindPopup('You are here');

                this.locateLayer = group;
                this.map.flyTo([latitude, longitude], 17, { duration: 1.4 });

                if (this.outsideLiberia(latitude, longitude)) {
                    this.showToast('Your position is outside Liberia — check device location.', 'warning');
                } else {
                    this.showToast(`Location found · accuracy ±${Math.round(accuracy || 0)} m`, 'success');
                }

                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-location-crosshairs" aria-hidden="true"></i> My location';
            },
            (err) => {
                const messages = {
                    1: 'Location permission denied. Allow location access in your browser settings.',
                    2: 'Location unavailable. Move to an open area or enter coordinates manually.',
                    3: 'Location request timed out. Try again or pick the point on the map.'
                };
                this.showToast(messages[err.code] || 'Could not get your location.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-location-crosshairs" aria-hidden="true"></i> My location';
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
        );
    }

    // ─────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────
    bindEvents() {
        // Header & sidebar
        document.getElementById('addHouseBtn').addEventListener('click', () => this.openModal());
        document.getElementById('emptyDemoBtn')?.addEventListener('click', () => this.loadDemoData());
        document.getElementById('backupBtn').addEventListener('click', () => this.exportJSON());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());

        // Search & filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filterCounty').addEventListener('change', (e) => {
            this.filters.county = e.target.value;
            this.filters.district = 'all';
            this.populateFilters();
            this.applyFilters();
        });
        document.getElementById('filterDistrict').addEventListener('change', (e) => {
            this.filters.district = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filterStreet').addEventListener('change', (e) => {
            this.filters.street = e.target.value;
            this.applyFilters();
        });

        // Map tools
        document.getElementById('basemapBtn').addEventListener('click', () => this.toggleBasemap());
        document.getElementById('fitAllBtn').addEventListener('click', () => this.fitAll());
        document.getElementById('locateMeBtn').addEventListener('click', () => this.locateMe());

        const placeSearch = document.getElementById('placeSearch');
        let searchTimer;
        placeSearch.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => this.searchPlace(placeSearch.value), 550);
        });
        placeSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('placeResults').hidden = true;
                placeSearch.blur();
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimer);
                this.searchPlace(placeSearch.value);
            }
        });
        document.getElementById('placeSearchClear').addEventListener('click', () => {
            placeSearch.value = '';
            document.getElementById('placeResults').hidden = true;
            document.getElementById('placeSearchClear').hidden = true;
            placeSearch.focus();
        });

        document.getElementById('countyJump').addEventListener('change', (e) => this.jumpToCounty(e.target.value));

        // Close place results when clicking elsewhere
        document.addEventListener('click', (e) => {
            const wrap = document.querySelector('.place-search');
            if (wrap && !wrap.contains(e.target)) {
                document.getElementById('placeResults').hidden = true;
            }
            if (!e.target.closest('.menu-wrap')) this.closeDataMenu();
        });

        // Modal
        document.getElementById('modalClose').addEventListener('click', () => this.requestClose());
        document.getElementById('cancelBtn').addEventListener('click', () => this.requestClose());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.requestClose();
        });
        document.getElementById('houseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHousehold();
        });
        document.getElementById('houseForm').addEventListener('input', () => {
            this._formDirty = true;
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('addMemberBtn').addEventListener('click', () => this.addMemberRow());
        document.getElementById('useCurrentLocation').addEventListener('click', () => this.useCurrentLocation());
        document.getElementById('pickFromMap').addEventListener('click', () => this.startPickFromMap());
        document.getElementById('copyCoordsBtn').addEventListener('click', () => {
            const lat = document.getElementById('latitude').value;
            const lng = document.getElementById('longitude').value;
            if (!lat || !lng) {
                this.showToast('No coordinates to copy yet.', 'warning');
                return;
            }
            this.copyText(`${(+lat).toFixed(6)}, ${(+lng).toFixed(6)}`);
        });

        document.getElementById('latitude').addEventListener('change', () => this.onCoordinateInput());
        document.getElementById('longitude').addEventListener('change', () => this.onCoordinateInput());
        document.getElementById('houseCounty').addEventListener('change', (e) => this.onCountyChange(e.target.value));
        document.getElementById('headContact').addEventListener('blur', (e) => {
            const normalized = this.formatPhone(e.target.value);
            if (normalized) e.target.value = normalized;
        });

        // Detail panel
        document.getElementById('closeDetail').addEventListener('click', () => this.closeDetailPanel());

        // Data menu
        document.getElementById('dataMenuBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('dataMenu');
            const isOpen = !menu.hidden;
            this.closeDataMenu();
            if (!isOpen) {
                menu.hidden = false;
                document.getElementById('dataMenuBtn').setAttribute('aria-expanded', 'true');
            }
        });
        document.getElementById('dataMenu').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-cmd]');
            if (!btn) return;
            this.closeDataMenu();
            const actions = {
                'export-csv': () => this.exportCSV(),
                'export-json': () => this.exportJSON(),
                'summary': () => this.exportSummaryCSV(),
                'import-json': () => document.getElementById('importFile').click(),
                'print': () => this.printDirectory(),
                'demo': () => this.loadDemoData(),
                'clear': () => this.clearAllData()
            };
            actions[btn.dataset.cmd]?.();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) this.importJSON(file);
            e.target.value = '';
        });

        // Household card clicks (event delegation)
        document.getElementById('houseList').addEventListener('click', (e) => {
            const card = e.target.closest('.house-card');
            if (card) this.selectHousehold(card.dataset.id);
        });
        document.getElementById('houseList').addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target.closest('.house-card');
            if (!card) return;
            e.preventDefault();
            this.selectHousehold(card.dataset.id);
        });

        // Connection status
        window.addEventListener('online', () => {
            this.updateOnlineStatus();
            this.showToast('Back online — map tiles available again.', 'success');
        });
        window.addEventListener('offline', () => {
            this.updateOnlineStatus();
            this.showToast('Offline — records still save on this device.', 'warning');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            const typing = ['input', 'textarea', 'select'].includes(tag);

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
                return;
            }
            if (e.key === 'Escape') {
                if (document.getElementById('modalOverlay').classList.contains('active')) {
                    this.requestClose();
                } else {
                    this.closeModal();
                }
                this.closeDetailPanel();
                this.removeTempMarker();
                this.closeDataMenu();
                document.getElementById('placeResults').hidden = true;
                return;
            }
            if (!typing && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                if (!document.getElementById('modalOverlay').classList.contains('active')) this.openModal();
            }
        });
    }

    closeDataMenu() {
        document.getElementById('dataMenu').hidden = true;
        document.getElementById('dataMenuBtn').setAttribute('aria-expanded', 'false');
    }

    // ─────────────────────────────────────────
    // TABS
    // ─────────────────────────────────────────
    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const active = btn.dataset.tab === tabName;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
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
            title.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i> Edit household';
            this.populateForm(household);
        } else {
            this.editingId = null;
            title.innerHTML = '<i class="fas fa-house-chimney" aria-hidden="true"></i> Register household';
            document.getElementById('surveyDate').value = this.todayISO();
            document.getElementById('houseCounty').value = 'Montserrado';
            this.onCountyChange('Montserrado');

            if (lat !== null && lng !== null) this.setCoordinates(lat, lng);
        }

        document.getElementById('modalOverlay').classList.add('active');

        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
            document.querySelector('#houseForm input:not([type="hidden"])')?.focus();
        }, 250);
    }

    requestClose() {
        if (this._formDirty) {
            const discard = confirm('Discard the details you have entered for this household?');
            if (!discard) return;
        }
        this.closeModal();
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
            .forEach(cb => { cb.checked = false; });
        this.clearCoordinatePreview();
        this._formDirty = false;
        document.getElementById('formHint').textContent = 'Fields marked * are required';
    }

    // ─────────────────────────────────────────
    // COORDINATES
    // ─────────────────────────────────────────
    setCoordinates(lat, lng, geocode = true) {
        document.getElementById('latitude').value = Number(lat).toFixed(6);
        document.getElementById('longitude').value = Number(lng).toFixed(6);
        this.updateCoordinateDisplay(lat, lng);
        if (geocode) this.reverseGeocodeToAddress(lat, lng);
    }

    updateCoordinateDisplay(lat, lng) {
        const display = document.getElementById('coordinateDisplay');
        if (!display) return;

        const outside = this.outsideLiberia(lat, lng);
        display.innerHTML = outside
            ? `<i class="fas fa-triangle-exclamation" style="color:var(--warning)" aria-hidden="true"></i>
               Location set: <strong>${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}</strong>
               — this point is outside Liberia.`
            : `<i class="fas fa-circle-check" style="color:var(--success)" aria-hidden="true"></i>
               Location set: <strong>${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}</strong>`;
        display.className = outside ? 'coordinate-display warn' : 'coordinate-display set';
    }

    clearCoordinatePreview() {
        const display = document.getElementById('coordinateDisplay');
        if (display) {
            display.innerHTML = `
                <i class="fas fa-circle-exclamation" style="color:var(--warning)" aria-hidden="true"></i>
                No location set. Tap the map or use the buttons below.`;
            display.className = 'coordinate-display';
        }
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        document.getElementById('fullAddress').value = '';
    }

    onCoordinateInput() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);

        if (Number.isFinite(lat) && Number.isFinite(lng)
            && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            this.updateCoordinateDisplay(lat, lng);
        }
    }

    // ─────────────────────────────────────────
    // PICK FROM MAP
    // ─────────────────────────────────────────
    startPickFromMap() {
        const editing = this.editingId
            ? this.households.find(h => h.id === this.editingId)
            : null;

        this.closeModal();
        this.stopPickFromMap();

        const indicator = document.createElement('div');
        indicator.id = 'pickingIndicator';
        indicator.innerHTML = `
            <i class="fas fa-crosshairs" aria-hidden="true"></i>
            Tap the map to set the location
            <button type="button" id="cancelPickBtn">Cancel</button>
        `;
        document.querySelector('.map-wrapper').appendChild(indicator);

        document.getElementById('cancelPickBtn').addEventListener('click', () => {
            this.stopPickFromMap();
            this.openModal(editing);
        });

        this.map.getContainer().style.cursor = 'crosshair';

        this._pickHandler = (e) => {
            this.stopPickFromMap();
            this.openModal(editing, e.latlng.lat, e.latlng.lng);
            this.switchTab('location');
        };
        this.map.once('click', this._pickHandler);
    }

    stopPickFromMap() {
        document.getElementById('pickingIndicator')?.remove();
        if (this.map) this.map.getContainer().style.cursor = '';
        if (this._pickHandler) {
            this.map.off('click', this._pickHandler);
            this._pickHandler = null;
        }
    }

    // ─────────────────────────────────────────
    // CURRENT LOCATION (inside the form)
    // ─────────────────────────────────────────
    useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('This browser does not support geolocation.', 'error');
            return;
        }

        const btn = document.getElementById('useCurrentLocation');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Detecting…';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                this.setCoordinates(latitude, longitude);
                this.map.flyTo([latitude, longitude], 17, { duration: 1.4 });
                this.showToast(`Location detected · accuracy ±${Math.round(accuracy || 0)} m`, 'success');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-location-crosshairs" aria-hidden="true"></i> Use my current location';
                this.switchTab('location');
            },
            (err) => {
                const messages = {
                    1: 'Location permission denied. Allow location access in your browser settings.',
                    2: 'Location unavailable. Try again or enter coordinates manually.',
                    3: 'Location request timed out. Check GPS signal and try again.'
                };
                this.showToast(messages[err.code] || 'Could not get your location.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-location-crosshairs" aria-hidden="true"></i> Use my current location';
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
        );
    }

    // ─────────────────────────────────────────
    // REVERSE GEOCODING
    // ─────────────────────────────────────────
    async reverseGeocodeToAddress(lat, lng) {
        const addressField = document.getElementById('fullAddress');
        if (!addressField) return;

        addressField.value = 'Fetching address…';
        addressField.disabled = true;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
            );
            clearTimeout(timeout);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data && data.display_name) {
                addressField.value = data.display_name;
                this.fillAddressFields(data.address || {});
            } else {
                addressField.value = '';
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error.message);
            addressField.value = '';
            if (error.name !== 'AbortError') {
                this.showToast('Could not fetch the address. Fill it in manually.', 'warning');
            }
        } finally {
            addressField.disabled = false;
        }
    }

    fillAddressFields(address) {
        if (!address) return;

        const countyNames = LIBERIA.counties.map(c => c.name.toLowerCase());
        const state = String(address.state || '').replace(/\s*county$/i, '').trim();

        if (countyNames.includes(state.toLowerCase())) {
            const countyField = document.getElementById('houseCounty');
            if (countyField && !countyField.value) {
                countyField.value = LIBERIA.counties.find(
                    c => c.name.toLowerCase() === state.toLowerCase()
                ).name;
                this.onCountyChange(countyField.value);
            }
        }

        const districtField = document.getElementById('houseDistrict');
        if (districtField && !districtField.value && address.county && address.county.toLowerCase() !== state.toLowerCase()) {
            districtField.value = address.county;
        }

        const communityField = document.getElementById('houseCommunity');
        if (communityField && !communityField.value) {
            communityField.value = address.suburb || address.neighborhood || address.quarter
                || address.village || address.town || address.city_district || '';
        }

        const streetField = document.getElementById('houseStreet');
        if (streetField && !streetField.value && address.road) {
            streetField.value = address.road;
        }
    }

    async reverseGeocodeQuiet(lat, lng, callback) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4500);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
                { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
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
    // LIBERIA SELECTS / DATALISTS
    // ─────────────────────────────────────────
    fillStaticDatalists() {
        document.getElementById('streetList').innerHTML =
            LIBERIA.streets.map(s => `<option value="${this.esc(s)}"></option>`).join('');
    }

    buildCountySelects() {
        const countyField = document.getElementById('houseCounty');
        countyField.innerHTML = '<option value="">Select county…</option>' +
            LIBERIA.counties.map(c =>
                `<option value="${this.esc(c.name)}">${this.esc(c.name)} County — ${this.esc(c.capital)}</option>`
            ).join('');

        const jump = document.getElementById('countyJump');
        jump.innerHTML = '<option value="">Jump to county…</option>' +
            LIBERIA.counties.map(c =>
                `<option value="${this.esc(c.name)}">${this.esc(c.name)} County</option>`
            ).join('');
    }

    onCountyChange(county) {
        const districts = LIBERIA.districts[county] || [];
        const communities = LIBERIA.communities[county] || [];

        document.getElementById('districtList').innerHTML =
            districts.map(d => `<option value="${this.esc(d)}"></option>`).join('');
        document.getElementById('communityList').innerHTML =
            communities.map(c => `<option value="${this.esc(c)}"></option>`).join('');
    }

    jumpToCounty(county) {
        if (!county) return;
        const info = LIBERIA.counties.find(c => c.name === county);
        if (!info) return;

        const inCounty = this.households.filter(h => h.county === county
            && Number.isFinite(h.lat) && Number.isFinite(h.lng));

        if (inCounty.length >= 2) {
            this.map.flyToBounds(
                L.latLngBounds(inCounty.map(h => [h.lat, h.lng])).pad(0.35),
                { duration: 1.3 }
            );
        } else if (inCounty.length === 1) {
            this.map.flyTo([inCounty[0].lat, inCounty[0].lng], 16, { duration: 1.3 });
        } else {
            this.map.flyTo([info.lat, info.lng], 10, { duration: 1.3 });
        }

        // Sync the sidebar filter with the jump
        this.filters.county = county;
        this.filters.district = 'all';
        this.populateFilters();
        this.applyFilters();

        this.showToast(`${county} County — ${inCounty.length || 'no'} household${inCounty.length === 1 ? '' : 's'} on record`, 'success');
    }

    // ─────────────────────────────────────────
    // FORM DATA
    // ─────────────────────────────────────────
    populateForm(h) {
        this.setVal('houseNumber', h.houseNumber);
        this.setVal('houseLot', h.houseLot);
        this.setVal('houseBlock', h.houseBlock);
        this.setVal('houseStreet', h.houseStreet);
        this.setVal('houseClan', h.houseClan);
        this.setVal('houseCounty', h.county);
        const countyField = document.getElementById('houseCounty');
        if (h.county && countyField.value !== h.county) {
            // Keep legacy / custom values selectable instead of silently dropping them
            const opt = document.createElement('option');
            opt.value = h.county;
            opt.textContent = h.county;
            countyField.appendChild(opt);
            countyField.value = h.county;
        }
        this.setVal('houseDistrict', h.district);
        this.setVal('houseCommunity', h.community);
        this.onCountyChange(h.county || '');

        this.setVal('houseType', h.houseType);
        this.setVal('houseStatus', h.houseStatus);
        this.setVal('wallMaterial', h.wallMaterial);
        this.setVal('roofMaterial', h.roofMaterial);
        this.setVal('structureCondition', h.structureCondition);
        this.setVal('yearBuilt', h.yearBuilt);
        this.setVal('floorCount', h.floorCount);
        this.setVal('roomCount', h.roomCount);

        this.setVal('headFirstName', h.head?.firstName);
        this.setVal('headLastName', h.head?.lastName);
        this.setVal('headAge', h.head?.age);
        this.setVal('headGender', h.head?.gender);
        this.setVal('headCivilStatus', h.head?.civilStatus);
        this.setVal('headNationality', h.head?.nationality);
        this.setVal('headOccupation', h.head?.occupation);
        this.setVal('headContact', h.head?.contact);
        this.setVal('headEmail', h.head?.email);

        this.setVal('totalPersons', h.totalPersons);
        this.setVal('totalMale', h.totalMale);
        this.setVal('totalFemale', h.totalFemale);
        this.setVal('totalMinors', h.totalMinors);
        this.setVal('totalSenior', h.totalSenior);
        this.setVal('totalPwd', h.totalPwd);

        document.getElementById('membersList').innerHTML = '';
        if (h.members?.length > 0) h.members.forEach(m => this.addMemberRow(m));

        if (Number.isFinite(h.lat) && Number.isFinite(h.lng)) {
            // Update fields without re-geocoding over the address already on record
            this.setCoordinates(h.lat, h.lng, false);
        }

        this.setVal('fullAddress', h.fullAddress);
        this.setVal('landmark', h.landmark);
        this.setVal('zone', h.zone);
        this.setVal('enumArea', h.enumArea);

        this.setVal('incomeClass', h.incomeClass);
        this.setVal('mobileMoney', h.mobileMoney);
        this.setVal('waterSource', h.waterSource);
        this.setVal('electricitySource', h.electricitySource);
        this.setVal('cookingFuel', h.cookingFuel);
        this.setVal('internetAccess', h.internetAccess);
        this.setVal('toiletType', h.toiletType);
        this.setVal('wasteDisposal', h.wasteDisposal);
        this.setVal('nearestClinic', h.nearestClinic);
        this.setVal('clinicDistance', h.clinicDistance);
        this.setVal('remarks', h.remarks);
        this.setVal('surveyedBy', h.surveyedBy);
        this.setVal('surveyDate', h.surveyDate);
        document.getElementById('consent').checked = Boolean(h.consent);

        (h.healthPrograms || []).forEach(prog => {
            const cb = document.querySelector(`input[name="healthProgram"][value="${prog}"]`);
            if (cb) cb.checked = true;
        });
    }

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null && value !== '') el.value = value;
    }

    addMemberRow(data = null) {
        const template = document.getElementById('memberRowTemplate');
        const row = template.content.cloneNode(true).querySelector('.member-row');

        if (data) {
            row.querySelector('.member-firstname').value = data.firstName || '';
            row.querySelector('.member-lastname').value = data.lastName || '';
            row.querySelector('.member-age').value = data.age || '';
            row.querySelector('.member-gender').value = data.gender || 'male';
            row.querySelector('.member-relation').value = data.relation || '';
        }

        row.querySelector('.btn-remove-member')
            .addEventListener('click', () => row.remove());

        document.getElementById('membersList').appendChild(row);
    }

    getMembers() {
        return Array.from(document.querySelectorAll('#membersList .member-row'))
            .map(row => ({
                firstName: row.querySelector('.member-firstname').value.trim(),
                lastName: row.querySelector('.member-lastname').value.trim(),
                age: row.querySelector('.member-age').value,
                gender: row.querySelector('.member-gender').value,
                relation: row.querySelector('.member-relation').value.trim()
            }))
            .filter(m => m.firstName || m.lastName);
    }

    getCheckedPrograms() {
        return Array.from(document.querySelectorAll('input[name="healthProgram"]:checked'))
            .map(cb => cb.value);
    }

    // ─────────────────────────────────────────
    // SAVE
    // ─────────────────────────────────────────
    saveHousehold() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            this.showToast('Location is required. Open the Location tab and set coordinates.', 'error');
            this.switchTab('location');
            return;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.showToast('Coordinates out of range. Latitude -90…90, longitude -180…180.', 'error');
            this.switchTab('location');
            return;
        }

        const houseNumber = document.getElementById('houseNumber').value.trim();
        if (!houseNumber) {
            this.showToast('House / structure ID is required.', 'error');
            this.switchTab('house');
            return;
        }

        const county = document.getElementById('houseCounty').value;
        if (!county) {
            this.showToast('County is required.', 'error');
            this.switchTab('house');
            return;
        }

        const houseStatus = document.getElementById('houseStatus').value;
        const headFirstName = document.getElementById('headFirstName').value.trim();
        const headLastName = document.getElementById('headLastName').value.trim();

        if (houseStatus !== 'vacant' && (!headFirstName || !headLastName)) {
            this.showToast('Add the household head’s first and last name (or mark the house vacant).', 'error');
            this.switchTab('residents');
            return;
        }

        const phoneRaw = document.getElementById('headContact').value.trim();
        const phone = this.formatPhone(phoneRaw);
        if (phoneRaw && !phone) {
            this.showToast('That mobile number does not look Liberian. Use 077 / 088 / 055 or +231…', 'warning');
        }

        // Consistency checks (warnings only — save is not blocked)
        const members = this.getMembers();
        let totalPersons = parseInt(document.getElementById('totalPersons').value, 10) || 0;
        let totalMale = parseInt(document.getElementById('totalMale').value, 10) || 0;
        let totalFemale = parseInt(document.getElementById('totalFemale').value, 10) || 0;
        let totalMinors = parseInt(document.getElementById('totalMinors').value, 10) || 0;
        let totalSenior = parseInt(document.getElementById('totalSenior').value, 10) || 0;
        const totalPwd = parseInt(document.getElementById('totalPwd').value, 10) || 0;

        // If the enumerator listed people but left the summary blank, derive it
        if (totalPersons + totalMale + totalFemale === 0 && (headFirstName || members.length > 0)) {
            const people = [];
            if (headFirstName) {
                people.push({
                    age: parseInt(document.getElementById('headAge').value, 10) || 0,
                    gender: document.getElementById('headGender').value
                });
            }
            members.forEach(m => people.push({
                age: parseInt(m.age, 10) || 0,
                gender: m.gender
            }));

            totalPersons = people.length;
            totalMale = people.filter(p => p.gender === 'male').length;
            totalFemale = people.filter(p => p.gender === 'female').length;
            totalMinors = people.filter(p => p.age > 0 && p.age < 18).length;
            totalSenior = people.filter(p => p.age >= 60).length;

            const fill = { totalPersons, totalMale, totalFemale, totalMinors, totalSenior };
            Object.entries(fill).forEach(([id, value]) => {
                document.getElementById(id).value = value;
            });

            this.showToast('Counts filled from the member list — please review them.', 'warning');
        }

        if (totalPersons && totalMale + totalFemale > totalPersons) {
            this.showToast('Male + female residents is more than total persons — please check the counts.', 'warning');
        }
        if (totalPersons && totalMinors + totalSenior > totalPersons) {
            this.showToast('Under-18 + 60+ is more than total persons — please check the counts.', 'warning');
        }

        if (this.outsideLiberia(lat, lng)) {
            const proceed = confirm(
                `This point (${lat.toFixed(5)}, ${lng.toFixed(5)}) is outside Liberia.\n\nSave it anyway?`
            );
            if (!proceed) return;
        }

        // Duplicate proximity check
        const close = this.households.find(h =>
            h.id !== this.editingId
            && h.houseNumber.trim().toLowerCase() === houseNumber.toLowerCase()
            && this.distanceMeters(lat, lng, h.lat, h.lng) < 25
        );
        if (close) {
            const proceed = confirm(
                `Household “${houseNumber}” is already recorded about `
                + `${Math.round(this.distanceMeters(lat, lng, close.lat, close.lng))} m from here.\n\n`
                + 'Save another record anyway?'
            );
            if (!proceed) return;
        }

        const household = {
            id: this.editingId || this.generateId(),

            houseNumber,
            houseLot: document.getElementById('houseLot').value.trim(),
            houseBlock: document.getElementById('houseBlock').value.trim(),
            houseStreet: document.getElementById('houseStreet').value.trim(),
            houseClan: document.getElementById('houseClan').value.trim(),

            county,
            district: document.getElementById('houseDistrict').value.trim(),
            community: document.getElementById('houseCommunity').value.trim(),

            houseType: document.getElementById('houseType').value,
            houseStatus,
            wallMaterial: document.getElementById('wallMaterial').value,
            roofMaterial: document.getElementById('roofMaterial').value,
            structureCondition: document.getElementById('structureCondition').value,
            yearBuilt: document.getElementById('yearBuilt').value,
            floorCount: document.getElementById('floorCount').value,
            roomCount: document.getElementById('roomCount').value,

            head: {
                firstName: headFirstName,
                lastName: headLastName,
                age: document.getElementById('headAge').value,
                gender: document.getElementById('headGender').value,
                civilStatus: document.getElementById('headCivilStatus').value,
                nationality: document.getElementById('headNationality').value,
                occupation: document.getElementById('headOccupation').value.trim(),
                contact: phone || phoneRaw,
                email: document.getElementById('headEmail').value.trim()
            },

            totalPersons, totalMale, totalFemale, totalMinors, totalSenior, totalPwd,
            members,

            lat, lng,
            fullAddress: document.getElementById('fullAddress').value.trim(),
            landmark: document.getElementById('landmark').value.trim(),
            zone: document.getElementById('zone').value.trim(),
            enumArea: document.getElementById('enumArea').value.trim(),

            incomeClass: document.getElementById('incomeClass').value,
            mobileMoney: document.getElementById('mobileMoney').value,
            waterSource: document.getElementById('waterSource').value,
            electricitySource: document.getElementById('electricitySource').value,
            cookingFuel: document.getElementById('cookingFuel').value,
            internetAccess: document.getElementById('internetAccess').value,
            toiletType: document.getElementById('toiletType').value,
            wasteDisposal: document.getElementById('wasteDisposal').value,
            nearestClinic: document.getElementById('nearestClinic').value.trim(),
            clinicDistance: document.getElementById('clinicDistance').value,
            healthPrograms: this.getCheckedPrograms(),
            remarks: document.getElementById('remarks').value.trim(),
            surveyedBy: document.getElementById('surveyedBy').value.trim(),
            surveyDate: document.getElementById('surveyDate').value,
            consent: document.getElementById('consent').checked,
            demo: false,

            createdAt: this.editingId
                ? (this.households.find(h => h.id === this.editingId)?.createdAt || new Date().toISOString())
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingId) {
            const idx = this.households.findIndex(h => h.id === this.editingId);
            if (idx !== -1) this.households[idx] = household;
            this.showToast(`Household ${household.houseNumber} updated.`, 'success');
        } else {
            this.households.push(household);
            this.showToast(`Household ${household.houseNumber} registered.`, 'success');
        }

        if (!household.consent) {
            setTimeout(() => this.showToast('Consent not recorded for this household.', 'warning'), 400);
        }

        this.saveToStorage();
        this.renderHouseholds();
        this.renderAllMarkers();
        this.updateStats();
        this.populateFilters();
        this.applyFilters();
        this.updateStorageNote();
        this.closeModal();
        this._formDirty = false;

        setTimeout(() => {
            this.map.flyTo([lat, lng], 17, { duration: 1.4 });
            setTimeout(() => this.markers[household.id]?.openPopup(), 1600);
        }, 250);
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────
    deleteHousehold(id) {
        const h = this.households.find(x => x.id === id);
        if (!h) return;

        const label = `Household ${h.houseNumber}${h.community ? ' in ' + h.community : ''}`;
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

        if (this.markers[id]) {
            this.map.removeLayer(this.markers[id]);
            delete this.markers[id];
        }

        this.households = this.households.filter(x => x.id !== id);
        this.saveToStorage();
        this.renderHouseholds();
        this.updateStats();
        this.populateFilters();
        this.applyFilters();
        this.updateStorageNote();
        this.closeDetailPanel();
        this.showToast(`${label} deleted.`, 'warning');
    }

    // ─────────────────────────────────────────
    // RENDER LIST
    // ─────────────────────────────────────────
    sortedHouseholds(list) {
        return [...list].sort((a, b) => {
            const key = (h) => [h.county || '', h.community || '', h.houseStreet || '', h.houseNumber || '']
                .join('|').toLowerCase();
            return key(a).localeCompare(key(b));
        });
    }

    renderHouseholds(data = null) {
        const list = document.getElementById('houseList');
        const items = this.sortedHouseholds(data !== null ? data : this.households);

        if (items.length === 0) {
            const filtered = data !== null;
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-house-chimney" aria-hidden="true"></i>
                    <p>${filtered ? 'No households match these filters.' : 'No households recorded yet.'}</p>
                    <p>${filtered
                        ? 'Try clearing the filters or searching a different name.'
                        : 'Tap the map or use “Add Household” to begin.'}</p>
                    ${filtered
                        ? '<button class="btn btn-secondary btn-sm" type="button" id="emptyClearBtn"><i class="fas fa-filter-circle-xmark" aria-hidden="true"></i> Clear filters</button>'
                        : '<button class="btn btn-secondary btn-sm" type="button" id="emptyDemoBtn"><i class="fas fa-flask" aria-hidden="true"></i> Load demo households</button>'}
                </div>
            `;
            document.getElementById('emptyClearBtn')?.addEventListener('click', () => this.clearFilters());
            document.getElementById('emptyDemoBtn')?.addEventListener('click', () => this.loadDemoData());
            return;
        }

        list.innerHTML = items.map(h => {
            const head = [h.head?.firstName, h.head?.lastName].filter(Boolean).join(' ') || 'No head recorded';
            const place = [h.community, h.county ? `${h.county} County` : ''].filter(Boolean).join(', ');
            const femaleHead = h.head?.gender === 'female';

            return `
                <div class="house-card" data-id="${this.esc(h.id)}" role="button" tabindex="0"
                     aria-label="Household ${this.esc(h.houseNumber)} in ${this.esc(place)}">
                    <div class="house-card-header">
                        <div class="house-icon ${this.esc(h.houseStatus)}">
                            <i class="fas fa-${this.getStatusIcon(h.houseStatus)}" aria-hidden="true"></i>
                        </div>
                        <div class="house-info">
                            <div class="house-number">
                                ${this.esc(h.houseNumber)}
                                ${h.houseLot ? `<span class="card-sub"> · Plot ${this.esc(h.houseLot)}</span>` : ''}
                            </div>
                            <div class="house-head">
                                <i class="fas fa-user-tie" aria-hidden="true"></i>
                                ${this.esc(head)}
                                ${femaleHead ? '<span class="mini-badge" title="Female-headed household">FHH</span>' : ''}
                            </div>
                            <div class="house-street">
                                <i class="fas fa-location-dot" aria-hidden="true"></i>
                                ${this.esc(place || 'No community recorded')}
                            </div>
                        </div>
                    </div>
                    <div class="house-card-footer">
                        <div class="residents-badge">
                            <i class="fas fa-users" aria-hidden="true"></i>
                            ${h.totalPersons || 0} person${h.totalPersons === 1 ? '' : 's'}
                        </div>
                        ${h.zone ? `<div class="residents-badge"><i class="fas fa-draw-polygon" aria-hidden="true"></i> ${this.esc(h.zone)}</div>` : ''}
                        ${h.demo ? '<span class="demo-badge">demo</span>' : ''}
                        <span class="status-badge ${this.esc(h.houseStatus)}">${this.esc(LABELS.status[h.houseStatus] || h.houseStatus)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────
    // MARKERS
    // ─────────────────────────────────────────
    renderAllMarkers() {
        Object.values(this.markers).forEach(m => {
            try { this.map.removeLayer(m); } catch (e) { /* ignore */ }
        });
        this.markers = {};
        this.households.forEach(h => this.addMarker(h));
    }

    addMarker(h) {
        if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) {
            console.warn(`Household ${h.id} has invalid coordinates.`);
            return;
        }

        const marker = L.marker([h.lat, h.lng], {
            icon: this.createMarkerIcon(h.houseStatus),
            riseOnHover: true,
            title: `Household ${h.houseNumber} — ${h.community || h.county || 'Liberia'}`
        }).addTo(this.map);

        marker.bindPopup(this.buildPopup(h), { maxWidth: 290, className: 'community-popup' });

        const head = [h.head?.firstName, h.head?.lastName].filter(Boolean).join(' ') || 'No head recorded';
        marker.bindTooltip(
            `<strong>${this.esc(h.houseNumber)}</strong><br>${this.esc(head)}`,
            { direction: 'top', offset: [0, -38], className: 'marker-tooltip', opacity: 0.95 }
        );

        const id = h.id;
        marker.on('click', () => this.highlightCard(id));
        this.markers[h.id] = marker;
    }

    createMarkerIcon(status) {
        const color = STATUS_COLORS[status] || '#64748B';
        return L.divIcon({
            className: '',
            html: `
                <div class="marker-pin" style="--pin-color:${color}">
                    <span></span>
                </div>
            `,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -40]
        });
    }

    buildPopup(h) {
        const container = document.createElement('div');
        const place = [h.community, h.county ? `${h.county} County` : ''].filter(Boolean).join(', ');

        container.innerHTML = `
            <div class="popup-header">
                <div class="popup-house-num">🏠 ${this.esc(h.houseNumber)}</div>
                <div class="popup-street">${this.esc(place || 'No community recorded')}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row">
                    <i class="fas fa-user-tie" aria-hidden="true"></i>
                    ${this.esc([h.head?.firstName, h.head?.lastName].filter(Boolean).join(' ') || 'No head recorded')}
                </div>
                <div class="popup-row">
                    <i class="fas fa-users" aria-hidden="true"></i>
                    ${h.totalPersons || 0} resident(s) · ${h.totalMale || 0}M / ${h.totalFemale || 0}F
                </div>
                ${h.head?.contact ? `<div class="popup-row"><i class="fas fa-phone" aria-hidden="true"></i> ${this.esc(h.head.contact)}</div>` : ''}
                ${h.zone ? `<div class="popup-row"><i class="fas fa-draw-polygon" aria-hidden="true"></i> ${this.esc(h.zone)}</div>` : ''}
                ${h.demo ? '<div class="popup-row popup-warn"><i class="fas fa-flask" aria-hidden="true"></i> Sample record</div>' : ''}
            </div>
            <div class="popup-actions">
                <button type="button" class="popup-btn-view" data-action="view" data-id="${this.esc(h.id)}">
                    <i class="fas fa-eye" aria-hidden="true"></i> View
                </button>
                <button type="button" class="popup-btn-edit" data-action="edit" data-id="${this.esc(h.id)}">
                    <i class="fas fa-pen" aria-hidden="true"></i> Edit
                </button>
            </div>
        `;

        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'view') this.showDetail(btn.dataset.id);
                if (btn.dataset.action === 'edit') {
                    const found = this.households.find(x => x.id === btn.dataset.id);
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
        const h = this.households.find(x => x.id === id);
        if (!h) return;

        if (this.markers[id]) {
            this.map.flyTo([h.lat, h.lng], 17, { duration: 1 });
            setTimeout(() => this.markers[id]?.openPopup(), 1100);
        }
        this.highlightCard(id);
    }

    highlightCard(id) {
        document.querySelectorAll('.house-card').forEach(c => c.classList.remove('active'));
        const card = document.querySelector(`.house-card[data-id="${this.cssEscape(id)}"]`);
        if (card) {
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ─────────────────────────────────────────
    // DETAIL PANEL
    // ─────────────────────────────────────────
    showDetail(id) {
        const h = this.households.find(x => x.id === id);
        if (!h) return;

        const color = STATUS_COLORS[h.houseStatus] || '#4F46E5';
        const place = [h.community, h.district, h.county ? `${h.county} County` : '']
            .filter(Boolean).join(', ');

        document.getElementById('detailTitle').textContent = `Household ${h.houseNumber}`;

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="detail-house-banner">
                <div class="detail-house-num">🏠 ${this.esc(h.houseNumber)}</div>
                <div class="detail-house-street">${this.esc(place || 'No location recorded')}</div>
                <div class="detail-house-meta">
                    <span class="detail-badge">${this.esc(LABELS.status[h.houseStatus] || h.houseStatus)}</span>
                    ${h.head?.gender === 'female' ? '<span class="detail-badge">Female-headed</span>' : ''}
                    ${h.houseType ? `<span class="detail-badge">${this.esc(LABELS.houseType[h.houseType] || h.houseType)}</span>` : ''}
                    ${h.zone ? `<span class="detail-badge">${this.esc(h.zone)}</span>` : ''}
                    ${h.demo ? '<span class="detail-badge">sample</span>' : ''}
                </div>
            </div>

            <div class="detail-quick-actions">
                ${h.head?.contact ? `
                    <button type="button" class="quick-btn" data-act="call" data-value="${this.esc(h.head.contact)}">
                        <i class="fas fa-phone" aria-hidden="true"></i> Call
                    </button>
                    <button type="button" class="quick-btn" data-act="whatsapp" data-value="${this.esc(h.head.contact)}">
                        <i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp
                    </button>` : ''}
                <button type="button" class="quick-btn" data-act="copy">
                    <i class="fas fa-copy" aria-hidden="true"></i> Copy GPS
                </button>
                <button type="button" class="quick-btn" data-act="print">
                    <i class="fas fa-print" aria-hidden="true"></i> Print
                </button>
            </div>

            <div class="stats-row">
                ${[
                    ['Total', h.totalPersons], ['Male', h.totalMale], ['Female', h.totalFemale],
                    ['Under 18', h.totalMinors], ['60+', h.totalSenior], ['Disability', h.totalPwd]
                ].map(([label, val]) => `
                    <div class="stat-box">
                        <div class="stat-box-num">${Number(val) || 0}</div>
                        <div class="stat-box-label">${label}</div>
                    </div>
                `).join('')}
            </div>

            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-user-tie" aria-hidden="true"></i> Household head</div>
                <div class="resident-cards">
                    <div class="resident-card">
                        <div class="resident-avatar" style="background:${color}">
                            ${this.esc(this.getInitials(h.head?.firstName, h.head?.lastName))}
                        </div>
                        <div class="resident-info">
                            <div class="resident-name">
                                ${this.esc([h.head?.firstName, h.head?.lastName].filter(Boolean).join(' ') || 'Not recorded')}
                            </div>
                            <div class="resident-meta">
                                ${[
                                    h.head?.age ? `Age ${this.esc(h.head.age)}` : '',
                                    this.esc(LABELS.gender[h.head?.gender] || ''),
                                    this.esc(LABELS.marital[h.head?.civilStatus] || ''),
                                    this.esc(h.head?.occupation || ''),
                                    this.esc(LABELS.nationality[h.head?.nationality] || '')
                                ].filter(Boolean).join(' · ')}
                            </div>
                            ${h.head?.contact ? `
                                <div class="resident-meta">
                                    <i class="fas fa-phone" style="font-size:10px" aria-hidden="true"></i>
                                    ${this.esc(h.head.contact)}
                                </div>` : ''}
                            ${h.head?.email ? `
                                <div class="resident-meta">
                                    <i class="fas fa-envelope" style="font-size:10px" aria-hidden="true"></i>
                                    ${this.esc(h.head.email)}
                                </div>` : ''}
                        </div>
                        ${h.houseStatus !== 'vacant' ? '<span class="resident-head-badge">HEAD</span>' : ''}
                    </div>
                </div>
            </div>

            ${h.members?.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-users" aria-hidden="true"></i> Other members (${h.members.length})
                    </div>
                    <div class="resident-cards">
                        ${h.members.map(m => `
                            <div class="resident-card">
                                <div class="resident-avatar" style="background:#8B5CF6">
                                    ${this.esc(this.getInitials(m.firstName, m.lastName))}
                                </div>
                                <div class="resident-info">
                                    <div class="resident-name">${this.esc([m.firstName, m.lastName].filter(Boolean).join(' '))}</div>
                                    <div class="resident-meta">
                                        ${[
                                            m.age ? `Age ${this.esc(m.age)}` : '',
                                            this.esc(LABELS.gender[m.gender] || ''),
                                            this.esc(m.relation || '')
                                        ].filter(Boolean).join(' · ')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-building" aria-hidden="true"></i> Structure</div>
                <div class="detail-grid">
                    ${this.detailItem('Type', LABELS.houseType[h.houseType] || h.houseType)}
                    ${this.detailItem('Condition', LABELS.condition[h.structureCondition])}
                    ${this.detailItem('Wall', LABELS.wall[h.wallMaterial])}
                    ${this.detailItem('Roof', LABELS.roof[h.roofMaterial])}
                    ${this.detailItem('Year built', h.yearBuilt)}
                    ${this.detailItem('Floors', h.floorCount)}
                    ${this.detailItem('Rooms', h.roomCount)}
                    ${this.detailItem('Plot / block', [h.houseLot, h.houseBlock].filter(Boolean).join(' / '))}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> Location</div>
                <div class="detail-grid">
                    ${this.detailItem('County', h.county ? h.county + ' County' : '')}
                    ${this.detailItem('District', h.district)}
                    ${this.detailItem('Community', h.community)}
                    ${this.detailItem('Clan', h.houseClan)}
                    ${this.detailItem('Street', h.houseStreet)}
                    ${this.detailItem('Zone', h.zone)}
                    ${this.detailItem('Enumeration area', h.enumArea)}
                    ${this.detailItem('GPS', this.coordText(h))}
                </div>
                ${h.landmark ? `
                    <div class="detail-item" style="margin-top:10px">
                        <div class="detail-item-label">Landmark</div>
                        <div class="detail-item-value">${this.esc(h.landmark)}</div>
                    </div>` : ''}
                ${h.fullAddress ? `
                    <div class="detail-item" style="margin-top:10px">
                        <div class="detail-item-label">Full address</div>
                        <div class="detail-item-value">${this.esc(h.fullAddress)}</div>
                    </div>` : ''}
                <button type="button" class="btn btn-secondary btn-sm" style="margin-top:12px" data-act="flyto">
                    <i class="fas fa-map-pin" aria-hidden="true"></i> Show on map
                </button>
            </div>

            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-hand-holding-heart" aria-hidden="true"></i> Services</div>
                <div class="detail-grid">
                    ${this.detailItem('Welfare', LABELS.income[h.incomeClass])}
                    ${this.detailItem('Mobile money', LABELS.mobileMoney[h.mobileMoney])}
                    ${this.detailItem('Water', LABELS.water[h.waterSource])}
                    ${this.detailItem('Electricity', LABELS.electricity[h.electricitySource])}
                    ${this.detailItem('Cooking fuel', LABELS.cooking[h.cookingFuel])}
                    ${this.detailItem('Internet', LABELS.internet[h.internetAccess])}
                    ${this.detailItem('Toilet', LABELS.toilet[h.toiletType])}
                    ${this.detailItem('Waste', LABELS.waste[h.wasteDisposal])}
                    ${this.detailItem('Nearest clinic', h.nearestClinic)}
                    ${this.detailItem('Distance to clinic', h.clinicDistance ? `${h.clinicDistance} km` : '')}
                </div>
                ${h.healthPrograms?.length > 0 ? `
                    <div style="margin-top:10px">
                        <div class="detail-item-label">Programs</div>
                        <div class="program-tags">
                            ${h.healthPrograms.map(p => `<span class="program-tag">${this.esc(LABELS.programs[p] || p)}</span>`).join('')}
                        </div>
                    </div>` : ''}
            </div>

            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-clipboard-check" aria-hidden="true"></i> Survey</div>
                <div class="detail-grid">
                    ${this.detailItem('Enumerated by', h.surveyedBy)}
                    ${this.detailItem('Survey date', this.formatDate(h.surveyDate))}
                    ${this.detailItem('Recorded', this.formatDate(h.createdAt))}
                    ${this.detailItem('Updated', this.formatDate(h.updatedAt))}
                    ${this.detailItem('Consent', h.consent ? 'Given' : 'Not recorded')}
                </div>
                ${h.remarks ? `
                    <div style="margin-top:10px;background:var(--light);border-radius:8px;padding:12px;">
                        <div class="detail-item-label" style="margin-bottom:5px">Remarks</div>
                        <div style="font-size:13px;color:var(--dark);line-height:1.6">${this.esc(h.remarks)}</div>
                    </div>` : ''}
            </div>
        `;

        // Detail actions
        let actions = document.querySelector('.detail-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'detail-actions';
            document.getElementById('detailPanel').appendChild(actions);
        }
        actions.innerHTML = '';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-primary-dark';
        editBtn.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i> Edit';
        editBtn.addEventListener('click', () => this.openModal(h));

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn btn-danger';
        delBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i> Delete';
        delBtn.addEventListener('click', () => this.deleteHousehold(id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        // Quick actions inside the panel
        content.querySelectorAll('[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.dataset.act;
                if (act === 'flyto') {
                    this.map.flyTo([h.lat, h.lng], 18, { duration: 1.4 });
                    setTimeout(() => this.markers[id]?.openPopup(), 1500);
                }
                if (act === 'call') window.location.href = `tel:${btn.dataset.value.replace(/\s/g, '')}`;
                if (act === 'whatsapp') {
                    window.open(`https://wa.me/${btn.dataset.value.replace(/\D/g, '')}`, '_blank', 'noopener');
                }
                if (act === 'copy') this.copyText(this.coordText(h, 6));
                if (act === 'print') this.printRecord(id);
            });
        });

        this.map.closePopup();
        document.getElementById('detailPanel').classList.add('active');
        this.highlightCard(id);
    }

    coordText(h, digits = 5) {
        if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) return 'Not recorded';
        return `${Number(h.lat).toFixed(digits)}, ${Number(h.lng).toFixed(digits)}`;
    }

    detailItem(label, value) {
        if (value === null || value === undefined || value === '') return '';
        return `
            <div class="detail-item">
                <div class="detail-item-label">${this.esc(label)}</div>
                <div class="detail-item-value">${this.esc(value)}</div>
            </div>
        `;
    }

    closeDetailPanel() {
        document.getElementById('detailPanel').classList.remove('active');
    }

    // ─────────────────────────────────────────
    // FILTERS
    // ─────────────────────────────────────────
    getFilteredHouseholds() {
        const { county, district, status, street, search } = this.filters;
        const q = String(search || '').toLowerCase().trim();

        return this.households.filter(h => {
            if (county !== 'all' && h.county !== county) return false;
            if (district !== 'all' && (h.district || '') !== district) return false;
            if (status !== 'all' && h.houseStatus !== status) return false;
            if (street !== 'all' && (h.houseStreet || '') !== street) return false;

            if (!q) return true;

            const haystack = [
                h.houseNumber, h.houseLot, h.houseBlock, h.houseStreet, h.houseClan,
                h.county, h.district, h.community, h.zone, h.enumArea, h.fullAddress,
                h.landmark, h.remarks,
                h.head?.firstName, h.head?.lastName, h.head?.contact, h.head?.email,
                h.head?.occupation,
                ...(h.members || []).map(m => `${m.firstName} ${m.lastName} ${m.relation}`)
            ].filter(Boolean).join(' ').toLowerCase();

            return haystack.includes(q);
        });
    }

    applyFilters() {
        const filtered = this.getFilteredHouseholds();
        this.renderHouseholds(filtered);

        // Dim non-matching markers
        Object.keys(this.markers).forEach(id => {
            const visible = filtered.some(h => h.id === id);
            this.markers[id].setOpacity(visible ? 1 : 0.12);
        });

        const total = this.households.length;
        const label = filtered.length === total
            ? `${total} household${total === 1 ? '' : 's'}`
            : `${filtered.length} of ${total} households`;
        document.getElementById('houseCount').textContent = label;
    }

    populateFilters() {
        const countySelect = document.getElementById('filterCounty');
        const districtSelect = document.getElementById('filterDistrict');
        const streetSelect = document.getElementById('filterStreet');

        const countCounties = new Map();
        const countStreets = new Set();
        const countDistricts = new Set();

        this.households.forEach(h => {
            if (h.county) countCounties.set(h.county, (countCounties.get(h.county) || 0) + 1);
            if (h.houseStreet) countStreets.add(h.houseStreet);
            if (h.district) countDistricts.add(h.district);
        });

        const countyNames = this.filters.county !== 'all'
            ? [...LIBERIA.counties.map(c => c.name)]
            : [...countCounties.keys()].sort();

        countySelect.innerHTML = '<option value="all">All counties</option>' +
            countyNames.map(c => {
                const n = countCounties.get(c) || 0;
                return `<option value="${this.esc(c)}">${this.esc(c)}${n ? ` (${n})` : ''}</option>`;
            }).join('');
        countySelect.value = countyNames.includes(this.filters.county) ? this.filters.county : 'all';

        let districtNames;
        if (this.filters.county === 'all') {
            districtNames = [...countDistricts].sort();
        } else {
            districtNames = [...new Set(this.households
                .filter(h => h.county === this.filters.county && h.district)
                .map(h => h.district))].sort();
        }

        districtSelect.innerHTML = '<option value="all">All districts</option>' +
            districtNames.map(d => `<option value="${this.esc(d)}">${this.esc(d)}</option>`).join('');
        districtSelect.value = districtNames.includes(this.filters.district) ? this.filters.district : 'all';
        this.filters.district = districtSelect.value;

        const streets = [...countStreets].sort();
        streetSelect.innerHTML = '<option value="all">All streets</option>' +
            streets.map(s => `<option value="${this.esc(s)}">${this.esc(s)}</option>`).join('');
        streetSelect.value = streets.includes(this.filters.street) ? this.filters.street : 'all';
        this.filters.street = streetSelect.value;

        document.getElementById('filterStatus').value = this.filters.status;
    }

    clearFilters() {
        this.filters = { county: 'all', district: 'all', status: 'all', street: 'all', search: '' };
        document.getElementById('searchInput').value = '';
        this.populateFilters();
        this.applyFilters();
        this.showToast('Filters cleared.', 'success');
    }

    // ─────────────────────────────────────────
    // STATS
    // ─────────────────────────────────────────
    updateStats() {
        const total = this.households.length;
        const residents = this.households.reduce((sum, h) => sum + (Number(h.totalPersons) || 0), 0);
        const counties = new Set(this.households.map(h => h.county).filter(Boolean)).size;

        document.getElementById('totalHouses').textContent = total;
        document.getElementById('totalResidents').textContent = residents;
        document.getElementById('totalCounties').textContent = counties;
        document.getElementById('houseCount').textContent =
            `${total} household${total === 1 ? '' : 's'}`;

        const counts = { owner: 0, renter: 0, vacant: 0, business: 0 };
        this.households.forEach(h => {
            if (counts[h.houseStatus] !== undefined) counts[h.houseStatus]++;
        });
        document.getElementById('ownerCount').textContent = counts.owner;
        document.getElementById('renterCount').textContent = counts.renter;
        document.getElementById('vacantCount').textContent = counts.vacant;
        document.getElementById('businessCount').textContent = counts.business;
    }

    // ─────────────────────────────────────────
    // DATA TOOLS
    // ─────────────────────────────────────────
    exportJSON() {
        if (this.households.length === 0) {
            this.showToast('There is no data to export yet.', 'warning');
            return;
        }

        const payload = {
            app: 'Liberia Community Locator',
            version: 2,
            exportedAt: new Date().toISOString(),
            count: this.households.length,
            households: this.households
        };

        this.downloadFile(
            `liberia-households-${this.todayISO()}.json`,
            JSON.stringify(payload, null, 2),
            'application/json'
        );

        this.showToast(`Backup exported · ${this.households.length} households.`, 'success');
    }

    exportCSV() {
        if (this.households.length === 0) {
            this.showToast('There is no data to export yet.', 'warning');
            return;
        }

        const rows = this.getFilteredHouseholds();

        const columns = [
            ['Household ID', h => h.houseNumber],
            ['Plot', h => h.houseLot],
            ['Block', h => h.houseBlock],
            ['Street', h => h.houseStreet],
            ['Community', h => h.community],
            ['District', h => h.district],
            ['County', h => h.county],
            ['Clan', h => h.houseClan],
            ['Zone', h => h.zone],
            ['Enumeration area', h => h.enumArea],
            ['Structure type', h => LABELS.houseType[h.houseType] || h.houseType],
            ['Occupancy', h => LABELS.status[h.houseStatus] || h.houseStatus],
            ['Wall material', h => LABELS.wall[h.wallMaterial] || h.wallMaterial],
            ['Roof material', h => LABELS.roof[h.roofMaterial] || h.roofMaterial],
            ['Condition', h => LABELS.condition[h.structureCondition] || h.structureCondition],
            ['Year built', h => h.yearBuilt],
            ['Floors', h => h.floorCount],
            ['Rooms', h => h.roomCount],
            ['Head first name', h => h.head?.firstName],
            ['Head last name', h => h.head?.lastName],
            ['Head sex', h => LABELS.gender[h.head?.gender] || h.head?.gender],
            ['Head age', h => h.head?.age],
            ['Head marital status', h => LABELS.marital[h.head?.civilStatus] || h.head?.civilStatus],
            ['Head nationality', h => LABELS.nationality[h.head?.nationality] || h.head?.nationality],
            ['Head livelihood', h => h.head?.occupation],
            ['Head phone', h => h.head?.contact],
            ['Head email', h => h.head?.email],
            ['Total persons', h => h.totalPersons],
            ['Male', h => h.totalMale],
            ['Female', h => h.totalFemale],
            ['Under 18', h => h.totalMinors],
            ['60+', h => h.totalSenior],
            ['With disability', h => h.totalPwd],
            ['Members', h => (h.members || []).map(m =>
                [m.firstName, m.lastName].filter(Boolean).join(' ')
                + (m.age ? ` (${m.age}` : ' (')
                + (m.gender ? `, ${m.gender}` : '')
                + (m.relation ? `, ${m.relation}` : '') + ')'
            ).join('; ')],
            ['Latitude', h => (Number.isFinite(h.lat) ? Number(h.lat).toFixed(6) : '')],
            ['Longitude', h => (Number.isFinite(h.lng) ? Number(h.lng).toFixed(6) : '')],
            ['Full address', h => h.fullAddress],
            ['Landmark', h => h.landmark],
            ['Welfare', h => LABELS.income[h.incomeClass] || h.incomeClass],
            ['Mobile money', h => LABELS.mobileMoney[h.mobileMoney] || h.mobileMoney],
            ['Water', h => LABELS.water[h.waterSource] || h.waterSource],
            ['Electricity', h => LABELS.electricity[h.electricitySource] || h.electricitySource],
            ['Cooking fuel', h => LABELS.cooking[h.cookingFuel] || h.cookingFuel],
            ['Internet', h => LABELS.internet[h.internetAccess] || h.internetAccess],
            ['Toilet', h => LABELS.toilet[h.toiletType] || h.toiletType],
            ['Waste disposal', h => LABELS.waste[h.wasteDisposal] || h.wasteDisposal],
            ['Nearest clinic', h => h.nearestClinic],
            ['Distance to clinic (km)', h => h.clinicDistance],
            ['Programs', h => (h.healthPrograms || []).map(p => LABELS.programs[p] || p).join('; ')],
            ['Consent', h => (h.consent ? 'Yes' : 'No')],
            ['Enumerated by', h => h.surveyedBy],
            ['Survey date', h => h.surveyDate],
            ['Remarks', h => h.remarks],
            ['Recorded at', h => h.createdAt],
            ['Updated at', h => h.updatedAt]
        ];

        const header = columns.map(c => this.csvCell(c[0])).join(',');
        const body = rows.map(h => columns.map(c => this.csvCell(c[1](h))).join(',')).join('\r\n');

        // BOM keeps Excel happy with accented characters
        this.downloadFile(
            `liberia-households-${this.todayISO()}.csv`,
            '\uFEFF' + header + '\r\n' + body,
            'text/csv;charset=utf-8'
        );

        this.showToast(`${rows.length} household${rows.length === 1 ? '' : 's'} exported to CSV.`, 'success');
    }

    importJSON(file) {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                const raw = Array.isArray(parsed) ? parsed : parsed.households;
                if (!Array.isArray(raw)) throw new Error('No households array found');

                const imported = raw
                    .filter(h => h && typeof h === 'object')
                    .map(h => this.migrateHousehold(this.sanitizeRecord(h)))
                    .filter(h => Number.isFinite(h.lat) && Number.isFinite(h.lng));

                if (imported.length === 0) {
                    this.showToast('No valid households found in that file.', 'error');
                    return;
                }

                const merge = confirm(
                    `Found ${imported.length} household record${imported.length === 1 ? '' : 's'}.\n\n`
                    + 'OK = merge with the households already here\n'
                    + 'Cancel = replace everything with this file'
                );

                if (merge) {
                    const byId = new Map(this.households.map(h => [h.id, h]));
                    imported.forEach(h => byId.set(h.id, h));
                    this.households = [...byId.values()];
                } else {
                    this.households = imported;
                }

                this.saveToStorage();
                this.renderHouseholds();
                this.renderAllMarkers();
                this.updateStats();
                this.populateFilters();
                this.applyFilters();
                this.updateStorageNote();
                this.fitAll();

                this.showToast(
                    `${imported.length} household${imported.length === 1 ? '' : 's'} imported (${merge ? 'merged' : 'replaced'}).`,
                    'success'
                );
            } catch (err) {
                console.error('Import failed:', err);
                this.showToast('That file is not a valid Community Locator backup.', 'error');
            }
        };

        reader.onerror = () => this.showToast('Could not read that file.', 'error');
        reader.readAsText(file);
    }

    demoToRecord(d, id) {
        return {
            id,
            houseNumber: d.houseNumber,
            houseLot: d.houseLot,
            houseBlock: d.houseBlock,
            houseStreet: d.houseStreet,
            houseClan: d.houseClan,
            county: d.houseCounty,
            district: d.houseDistrict,
            community: d.houseCommunity,
            houseType: d.houseType,
            houseStatus: d.houseStatus,
            wallMaterial: d.wallMaterial,
            roofMaterial: d.roofMaterial,
            structureCondition: d.structureCondition,
            yearBuilt: d.yearBuilt,
            floorCount: d.floorCount,
            roomCount: d.roomCount,
            head: {
                firstName: d.headFirstName,
                lastName: d.headLastName,
                age: d.headAge,
                gender: d.headGender,
                civilStatus: d.headCivilStatus,
                nationality: d.headNationality,
                occupation: d.headOccupation,
                contact: d.headContact,
                email: d.headEmail
            },
            totalPersons: d.totalPersons,
            totalMale: d.totalMale,
            totalFemale: d.totalFemale,
            totalMinors: d.totalMinors,
            totalSenior: d.totalSenior,
            totalPwd: d.totalPwd,
            members: d.members || [],
            lat: d.lat,
            lng: d.lng,
            fullAddress: d.fullAddress,
            landmark: d.landmark,
            zone: d.zone,
            enumArea: d.enumArea,
            incomeClass: d.incomeClass,
            mobileMoney: d.mobileMoney,
            waterSource: d.waterSource,
            electricitySource: d.electricitySource,
            cookingFuel: d.cookingFuel,
            internetAccess: d.internetAccess,
            toiletType: d.toiletType,
            wasteDisposal: d.wasteDisposal,
            nearestClinic: d.nearestClinic,
            clinicDistance: d.clinicDistance,
            healthPrograms: d.healthPrograms,
            remarks: d.remarks,
            surveyedBy: d.surveyedBy,
            surveyDate: d.surveyDate,
            consent: true,
            demo: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    exportSummaryCSV() {
        if (this.households.length === 0) {
            this.showToast('There is no data to summarise yet.', 'warning');
            return;
        }

        const groups = new Map();

        this.households.forEach(h => {
            const key = h.county || 'Not recorded';
            if (!groups.has(key)) {
                groups.set(key, {
                    households: 0, residents: 0, male: 0, female: 0,
                    minors: 0, seniors: 0, pwd: 0,
                    owner: 0, renter: 0, caretaker: 0, vacant: 0, business: 0,
                    water: 0, sanitation: 0, power: 0, money: 0, consent: 0
                });
            }
            const g = groups.get(key);
            g.households += 1;
            g.residents += Number(h.totalPersons) || 0;
            g.male += Number(h.totalMale) || 0;
            g.female += Number(h.totalFemale) || 0;
            g.minors += Number(h.totalMinors) || 0;
            g.seniors += Number(h.totalSenior) || 0;
            g.pwd += Number(h.totalPwd) || 0;
            if (g[h.houseStatus] !== undefined) g[h.houseStatus] += 1;

            if (['lwsc_piped', 'kiosk', 'handpump', 'protected_well', 'rainwater'].includes(h.waterSource)) g.water += 1;
            if (['flush', 'vip'].includes(h.toiletType)) g.sanitation += 1;
            if (h.electricitySource && h.electricitySource !== 'none') g.power += 1;
            if (h.mobileMoney && h.mobileMoney !== 'none') g.money += 1;
            if (h.consent) g.consent += 1;
        });

        const header = [
            'County', 'Households', 'Residents', 'Male', 'Female', 'Under 18', '60+',
            'With disability', 'Owner occupied', 'Renter', 'Caretaker', 'Vacant',
            'Business', 'Improved water', 'Flush/VIP toilet', 'Electricity access',
            'Mobile money', 'Consent recorded'
        ];

        const order = LIBERIA.counties.map(c => c.name);
        const keys = [...groups.keys()].sort((a, b) => {
            const ia = order.indexOf(a), ib = order.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        const totals = {
            households: 0, residents: 0, male: 0, female: 0, minors: 0, seniors: 0, pwd: 0,
            owner: 0, renter: 0, caretaker: 0, vacant: 0, business: 0,
            water: 0, sanitation: 0, power: 0, money: 0, consent: 0
        };

        const lines = keys.map(key => {
            const g = groups.get(key);
            Object.keys(totals).forEach(k => { totals[k] += g[k]; });
            return [
                key, g.households, g.residents, g.male, g.female, g.minors, g.seniors, g.pwd,
                g.owner, g.renter, g.caretaker, g.vacant, g.business,
                g.water, g.sanitation, g.power, g.money, g.consent
            ].map(v => this.csvCell(v)).join(',');
        });

        lines.push([
            'TOTAL', totals.households, totals.residents, totals.male, totals.female,
            totals.minors, totals.seniors, totals.pwd, totals.owner, totals.renter,
            totals.caretaker, totals.vacant, totals.business, totals.water,
            totals.sanitation, totals.power, totals.money, totals.consent
        ].map(v => this.csvCell(v)).join(','));

        this.downloadFile(
            `liberia-county-summary-${this.todayISO()}.csv`,
            '\uFEFF' + header.map(v => this.csvCell(v)).join(',') + '\r\n' + lines.join('\r\n'),
            'text/csv;charset=utf-8'
        );

        this.showToast('County summary exported.', 'success');
    }

    loadDemoData() {
        if (this.households.length > 0) {
            const proceed = confirm(
                'This will add 10 sample households to your existing records.\n\n'
                + 'You can remove them later from the Data menu. Continue?'
            );
            if (!proceed) return;
        }

        const stamp = Date.now();
        const demo = DEMO_HOUSEHOLDS.map((h, i) =>
            this.migrateHousehold(this.demoToRecord(h, `demo_${stamp}_${i}`))
        );

        this.households = [...this.households, ...demo];
        this.saveToStorage();
        this.renderHouseholds();
        this.renderAllMarkers();
        this.updateStats();
        this.populateFilters();
        this.applyFilters();
        this.updateStorageNote();
        this.fitAll();
        this.showToast('10 sample households loaded — clear them any time from Data.', 'success');
    }

    clearAllData() {
        if (this.households.length === 0) {
            this.showToast('There is nothing to delete.', 'warning');
            return;
        }

        const typed = prompt(
            `This deletes all ${this.households.length} household records from this browser.\n\n`
            + 'Export a backup first if you need one.\n\nType DELETE to confirm.'
        );

        if (typed !== 'DELETE') {
            if (typed !== null) this.showToast('Nothing was deleted — type DELETE to confirm.', 'warning');
            return;
        }

        this.households = [];
        this.saveToStorage();
        this.renderHouseholds();
        this.renderAllMarkers();
        this.updateStats();
        this.populateFilters();
        this.applyFilters();
        this.updateStorageNote();
        this.closeDetailPanel();
        this.showToast('All records deleted from this browser.', 'warning');
    }

    // ─────────────────────────────────────────
    // PRINTING
    // ─────────────────────────────────────────
    printDirectory() {
        const rows = this.sortedHouseholds(this.getFilteredHouseholds());

        if (rows.length === 0) {
            this.showToast('There is nothing to print with the current filters.', 'warning');
            return;
        }

        const countyLabel = this.filters.county === 'all' ? 'All counties' : `${this.filters.county} County`;

        document.getElementById('printArea').innerHTML = `
            <div class="print-sheet">
                <div class="print-head">
                    <div>
                        <h1>Liberia Community Locator</h1>
                        <p>Household directory · ${this.esc(countyLabel)}</p>
                    </div>
                    <div class="print-meta">
                        Printed ${this.esc(new Date().toLocaleString())}<br>
                        ${rows.length} household(s), ${rows.reduce((s, h) => s + (Number(h.totalPersons) || 0), 0)} residents
                    </div>
                </div>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>#</th><th>Household</th><th>Head</th><th>Community</th>
                            <th>County</th><th>Status</th><th>Persons</th><th>Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((h, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${this.esc(h.houseNumber)}</td>
                                <td>${this.esc([h.head?.firstName, h.head?.lastName].filter(Boolean).join(' ') || '—')}</td>
                                <td>${this.esc(h.community || '—')}</td>
                                <td>${this.esc(h.county || '—')}</td>
                                <td>${this.esc(LABELS.status[h.houseStatus] || h.houseStatus)}</td>
                                <td>${Number(h.totalPersons) || 0}</td>
                                <td>${this.esc(h.head?.contact || '—')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p class="print-foot">
                    Data collected with household consent and stored offline in the enumerator's browser.
                </p>
            </div>
        `;

        this.printNow();
    }

    printRecord(id) {
        const h = this.households.find(x => x.id === id);
        if (!h) return;

        const place = [h.houseStreet, h.community, h.district, h.county ? `${h.county} County` : '']
            .filter(Boolean).join(', ');
        const row = (label, value) => (value
            ? `<tr><th>${this.esc(label)}</th><td>${this.esc(value)}</td></tr>`
            : '');

        document.getElementById('printArea').innerHTML = `
            <div class="print-sheet">
                <div class="print-head">
                    <div>
                        <h1>Household ${this.esc(h.houseNumber)}</h1>
                        <p>${this.esc(place || 'Liberia')}</p>
                    </div>
                    <div class="print-meta">
                        Liberia Community Locator<br>
                        Printed ${this.esc(new Date().toLocaleString())}
                    </div>
                </div>
                <h2>Head of household</h2>
                <table class="print-table">
                    ${row('Name', [h.head?.firstName, h.head?.lastName].filter(Boolean).join(' '))}
                    ${row('Sex / age', [LABELS.gender[h.head?.gender], h.head?.age].filter(Boolean).join(' / '))}
                    ${row('Marital status', LABELS.marital[h.head?.civilStatus])}
                    ${row('Nationality', LABELS.nationality[h.head?.nationality])}
                    ${row('Livelihood', h.head?.occupation)}
                    ${row('Phone', h.head?.contact)}
                </table>
                <h2>Household</h2>
                <table class="print-table">
                    ${row('Total persons', h.totalPersons)}
                    ${row('Male / female', `${h.totalMale || 0} / ${h.totalFemale || 0}`)}
                    ${row('Under 18 / 60+', `${h.totalMinors || 0} / ${h.totalSenior || 0}`)}
                    ${row('With disability', h.totalPwd)}
                    ${row('Structure', `${LABELS.houseType[h.houseType] || h.houseType || ''} · ${LABELS.status[h.houseStatus] || h.houseStatus || ''}`)}
                    ${row('Members', (h.members || []).map(m =>
                        `${[m.firstName, m.lastName].filter(Boolean).join(' ')} (${m.age || '?'}, ${m.gender || '?'}${m.relation ? ', ' + m.relation : ''})`
                    ).join('; '))}
                </table>
                <h2>Location &amp; services</h2>
                <table class="print-table">
                    ${row('County / district', `${h.county || ''}${h.district ? ' / ' + h.district : ''}`)}
                    ${row('Community / zone', [h.community, h.zone].filter(Boolean).join(' / '))}
                    ${row('Landmark', h.landmark)}
                    ${row('GPS', this.coordText(h, 6))}
                    ${row('Water / electricity', `${LABELS.water[h.waterSource] || '—'} / ${LABELS.electricity[h.electricitySource] || '—'}`)}
                    ${row('Toilet / waste', `${LABELS.toilet[h.toiletType] || '—'} / ${LABELS.waste[h.wasteDisposal] || '—'}`)}
                    ${row('Programs', (h.healthPrograms || []).map(p => LABELS.programs[p] || p).join('; '))}
                    ${row('Remarks', h.remarks)}
                    ${row('Enumerated by', h.surveyedBy)}
                    ${row('Survey date', this.formatDate(h.surveyDate))}
                </table>
            </div>
        `;

        this.printNow();
    }

    printNow() {
        document.body.classList.add('printing');
        setTimeout(() => {
            window.print();
            setTimeout(() => document.body.classList.remove('printing'), 500);
        }, 80);
    }

    // ─────────────────────────────────────────
    // STORAGE
    // ─────────────────────────────────────────
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.households));
        } catch (e) {
            console.error('Save failed:', e);
            this.showToast('Browser storage is full. Export a backup and delete old photos/records.', 'error');
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map(h => this.migrateHousehold(this.sanitizeRecord(h)));
                }
            }

            // One-time import of the older Philippine-field dataset
            const legacy = localStorage.getItem(LEGACY_KEY);
            if (legacy) {
                const parsed = JSON.parse(legacy);
                if (Array.isArray(parsed)) {
                    const migrated = parsed.map(h => this.migrateHousehold(this.sanitizeRecord(h)));
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                    return migrated;
                }
            }

            return [];
        } catch (e) {
            console.error('Failed to load data:', e);
            return [];
        }
    }

    sanitizeRecord(h) {
        const clean = (typeof h === 'object' && h) ? { ...h } : {};
        if (clean.head && typeof clean.head !== 'object') clean.head = {};
        if (!Array.isArray(clean.members)) clean.members = [];
        if (!Array.isArray(clean.healthPrograms)) clean.healthPrograms = [];
        clean.lat = Number(clean.lat);
        clean.lng = Number(clean.lng);
        return clean;
    }

    // Bring older / Philippine-schema records forward without losing data
    migrateHousehold(h) {
        const r = h;
        if (!r.id) r.id = this.generateId();

        r.county = r.county || r.houseCounty || r.houseMunicipality || 'Montserrado';
        r.district = r.district || r.houseDistrict || '';
        r.community = r.community || r.houseCommunity || r.houseBarangay || '';
        r.houseClan = r.houseClan || '';
        r.enumArea = r.enumArea || r.precinct || '';

        const typeMap = {
            single: 'concrete_bungalow', bungalow: 'concrete_bungalow',
            duplex: 'concrete_storey', townhouse: 'compound',
            apartment: 'apartment', commercial: 'commercial', other: 'other'
        };
        if (typeMap[r.houseType]) r.houseType = typeMap[r.houseType];
        if (!LABELS.houseType[r.houseType]) r.houseType = 'other';

        if (!LABELS.status[r.houseStatus]) r.houseStatus = 'owner';

        if (!LABELS.wall[r.wallMaterial]) r.wallMaterial = 'concrete_block';
        if (!LABELS.roof[r.roofMaterial]) r.roofMaterial = 'zinc';
        if (!LABELS.condition[r.structureCondition]) r.structureCondition = 'fair';

        const waterMap = {
            piped: 'lwsc_piped', well: 'protected_well', spring: 'spring',
            rain: 'rainwater', bought: 'sachet_bottled'
        };
        if (waterMap[r.waterSource]) r.waterSource = waterMap[r.waterSource];
        if (!LABELS.water[r.waterSource]) r.waterSource = '';

        const powerMap = { meralco: 'lec_grid', solar: 'solar', generator: 'generator', none: 'none' };
        if (powerMap[r.electricitySource]) r.electricitySource = powerMap[r.electricitySource];
        if (!LABELS.electricity[r.electricitySource]) r.electricitySource = 'none';

        if (!LABELS.cooking[r.cookingFuel]) r.cookingFuel = '';
        if (!LABELS.internet[r.internetAccess]) {
            r.internetAccess = r.internetAccess === 'yes' ? 'home'
                : r.internetAccess === 'no' ? 'none' : 'mobile';
        }
        if (!LABELS.toilet[r.toiletType]) r.toiletType = '';
        if (!LABELS.waste[r.wasteDisposal]) {
            r.wasteDisposal = { collected: 'mcc', dumped: 'open_dump', burned: 'burned', composting: 'composting' }[r.wasteDisposal] || '';
        }

        const incomeMap = { '4ps': 'sct', low: 'poor', middle: 'non_poor', high: 'non_poor' };
        if (incomeMap[r.incomeClass]) r.incomeClass = incomeMap[r.incomeClass];
        if (!LABELS.income[r.incomeClass]) r.incomeClass = '';
        if (!LABELS.mobileMoney[r.mobileMoney]) r.mobileMoney = '';

        const programMap = {
            philhealth: 'nhis', pcso: 'sct', dswd: 'sct', nhts: 'sct'
        };
        r.healthPrograms = [...new Set((r.healthPrograms || [])
            .map(p => programMap[p] || p)
            .filter(p => LABELS.programs[p]))];

        if (!r.head || typeof r.head !== 'object') r.head = {};
        if (!LABELS.gender[r.head.gender]) r.head.gender = 'male';
        if (!LABELS.marital[r.head.civilStatus]) r.head.civilStatus = 'single';
        if (!LABELS.nationality[r.head.nationality]) r.head.nationality = 'liberian';

        r.totalPersons = Number(r.totalPersons) || 0;
        r.totalMale = Number(r.totalMale) || 0;
        r.totalFemale = Number(r.totalFemale) || 0;
        r.totalMinors = Number(r.totalMinors) || 0;
        r.totalSenior = Number(r.totalSenior) || 0;
        r.totalPwd = Number(r.totalPwd) || 0;

        r.consent = r.consent !== false;
        r.createdAt = r.createdAt || new Date().toISOString();
        r.updatedAt = r.updatedAt || r.createdAt;

        return r;
    }

    updateStorageNote() {
        const note = document.getElementById('storageNote');
        if (!note) return;

        try {
            const bytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
            const kb = bytes / 1024;
            note.innerHTML = `<i class="fas fa-hard-drive" aria-hidden="true"></i> `
                + `Saved in this browser · ${kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`}`;
        } catch (e) {
            note.innerHTML = '<i class="fas fa-hard-drive" aria-hidden="true"></i> Saved in this browser only';
        }
    }

    // ─────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────
    esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    cssEscape(value) {
        return String(value).replace(/["\\]/g, '\\$&');
    }

    generateId() {
        return 'hh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    }

    getInitials(first = '', last = '') {
        return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
    }

    getStatusIcon(status) {
        return {
            owner: 'house-chimney', renter: 'key', caretaker: 'people-roof',
            vacant: 'door-open', business: 'store'
        }[status] || 'house-chimney';
    }

    outsideLiberia(lat, lng) {
        return lat < LIBERIA.bounds.minLat || lat > LIBERIA.bounds.maxLat
            || lng < LIBERIA.bounds.minLng || lng > LIBERIA.bounds.maxLng;
    }

    distanceMeters(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const toRad = (v) => (v * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Return a clean +231 number, or '' when it does not look valid
    formatPhone(raw) {
        let digits = String(raw || '').replace(/[^\d+]/g, '');
        digits = digits.replace(/\D/g, '');

        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.startsWith('231')) digits = digits.slice(3);
        else if (digits.startsWith('0')) digits = digits.slice(1);

        if (digits.length === 9 && /^[2578]\d{8}$/.test(digits)) {
            return `+231 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
        }
        return '';
    }

    csvCell(value) {
        const text = value === null || value === undefined ? '' : String(value);
        return `"${text.replace(/"/g, '""')}"`;
    }

    formatDate(value) {
        if (!value) return '';
        const date = String(value).includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    todayISO() {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        return new Date(now.getTime() - offset * 60000).toISOString().split('T')[0];
    }

    downloadFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    async copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard.', 'success');
        } catch (e) {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            try {
                document.execCommand('copy');
                this.showToast('Copied to clipboard.', 'success');
            } catch (err) {
                this.showToast(`Copy failed — coordinates: ${text}`, 'warning');
            }
            area.remove();
        }
    }

    showToast(message, type = 'success') {
        const icons = {
            success: 'fas fa-circle-check',
            error: 'fas fa-circle-xmark',
            warning: 'fas fa-triangle-exclamation'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'status');
        toast.innerHTML = `<i class="${icons[type] || icons.success}" aria-hidden="true"></i><span>${this.esc(message)}</span>`;
        document.getElementById('toastContainer').appendChild(toast);

        // Keep the stack short
        const toasts = document.querySelectorAll('#toastContainer .toast');
        if (toasts.length > 4) toasts[0].remove();

        setTimeout(() => {
            toast.style.cssText = 'opacity:0;transform:translateX(110%);transition:all 0.3s ease;';
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }
}

// ---------------------------------------------
// BOOT
// ---------------------------------------------
let app;

document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('detailPanel');
    if (!panel.querySelector('.detail-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'detail-actions';
        panel.appendChild(actionsDiv);
    }

    app = new CommunityLocator();
    console.log('✅ Liberia Community Locator ready.');
});
