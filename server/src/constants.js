// Reference data shared by validation, stats and the API responses.
// Mirrors the LIBERIA object in the frontend (app.js).

export const COUNTIES = [
    'Bomi', 'Bong', 'Gbarpolu', 'Grand Bassa', 'Grand Cape Mount', 'Grand Gedeh',
    'Grand Kru', 'Lofa', 'Margibi', 'Maryland', 'Montserrado', 'Nimba',
    'River Cess', 'River Gee', 'Sinoe'
];

export const COUNTY_SET = new Set(COUNTIES);

export const ENUMS = {
    houseStatus: ['owner', 'renter', 'caretaker', 'vacant', 'business'],
    houseType: [
        'concrete_bungalow', 'concrete_storey', 'mud_house', 'zinc_shack',
        'compound', 'apartment', 'commercial', 'other'
    ],
    wallMaterial: ['concrete_block', 'mud_brick', 'wood_zinc', 'stone', 'other'],
    roofMaterial: ['zinc', 'thatch', 'concrete_tile', 'asbestos', 'other'],
    structureCondition: ['good', 'fair', 'poor', 'dilapidated'],
    gender: ['male', 'female'],
    civilStatus: ['married', 'cohabiting', 'single', 'widowed', 'divorced'],
    nationality: ['liberian', 'sierra_leonean', 'guinean', 'ivorian', 'ecowas_other', 'other'],
    incomeClass: ['extreme_poor', 'poor', 'non_poor', 'sct', 'not_stated'],
    mobileMoney: ['mtn_momo', 'orange_money', 'both', 'none'],
    waterSource: [
        'lwsc_piped', 'kiosk', 'handpump', 'protected_well', 'unprotected_well',
        'spring', 'river_creek', 'rainwater', 'sachet_bottled', 'truck'
    ],
    electricitySource: ['lec_grid', 'minigrid', 'solar', 'generator', 'none'],
    cookingFuel: ['charcoal', 'firewood', 'lpg', 'kerosene', 'electricity', 'none'],
    internetAccess: ['home', 'mobile', 'none'],
    toiletType: ['flush', 'vip', 'pit', 'shared', 'none'],
    wasteDisposal: ['mcc', 'community_bin', 'burned', 'buried', 'open_dump', 'composting'],
    healthPrograms: [
        'nhis', 'fhci', 'epi', 'hiv_tb', 'nutrition', 'sct',
        'nasscorp', 'disability', 'vsla', 'malaria'
    ],
    role: ['admin', 'enumerator', 'viewer']
};

export const LIMITS = {
    maxStringLength: 500,
    maxNotesLength: 2000,
    maxMembers: 50,
    maxHouseholdsPerSync: 500,
    maxListLimit: 500,
    defaultListLimit: 200
};
