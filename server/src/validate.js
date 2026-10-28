import { ApiError } from './errors.js';
import { COUNTY_SET, ENUMS, LIMITS } from './constants.js';

const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class FieldCollector {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    fail(field, message) {
        this.errors.push({ field, message });
        return undefined;
    }

    warn(field, message) {
        this.warnings.push({ field, message });
    }

    throwIfInvalid() {
        if (this.errors.length > 0) throw ApiError.validation(this.errors);
    }
}

function text(value, field, c, { required = false, max = LIMITS.maxStringLength } = {}) {
    if (value === undefined || value === null) {
        if (required) return c.fail(field, 'This field is required.');
        return '';
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
        return c.fail(field, 'Expected text.');
    }

    const cleaned = String(value).replace(/\s+/g, ' ').trim();
    if (required && !cleaned) return c.fail(field, 'This field is required.');
    if (cleaned.length > max) {
        return c.fail(field, `Keep this under ${max} characters.`);
    }
    return cleaned;
}

function choice(value, field, c, options, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) return c.fail(field, 'Choose one of the listed options.');
        return '';
    }
    if (!options.includes(value)) {
        return c.fail(field, `“${String(value).slice(0, 40)}” is not a valid option.`);
    }
    return value;
}

function integer(value, field, c, { min, max, required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) return c.fail(field, 'This field is required.');
        return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || !Number.isInteger(number)) {
        return c.fail(field, 'Enter a whole number.');
    }
    if (number < min || number > max) {
        return c.fail(field, `Enter a value between ${min} and ${max}.`);
    }
    return number;
}

function decimal(value, field, c, { min, max, required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) return c.fail(field, 'This field is required.');
        return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return c.fail(field, 'Enter a number.');
    if (number < min || number > max) {
        return c.fail(field, `Enter a value between ${min} and ${max}.`);
    }
    return number;
}

function isoDate(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toISOString();
}

/** Client clocks drift; never let a client claim a timestamp far in the future. */
function clientTimestamp(value, c, field, { fallback, allowFutureMs = 5 * 60 * 1000 } = {}) {
    if (value === undefined || value === null || value === '') return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        c.warn(field, 'Ignored an invalid timestamp.');
        return fallback;
    }
    if (date.getTime() > Date.now() + allowFutureMs) {
        c.warn(field, 'A timestamp in the future was replaced with the current time.');
        return new Date().toISOString();
    }
    return date.toISOString();
}

export function assertClientId(value) {
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
        throw ApiError.badRequest(
            'Household ids must be 6–64 characters of letters, numbers, dashes or underscores.'
        );
    }
    return value;
}

/**
 * Validate and normalise a household coming from a device.
 * Unknown keys are dropped (no mass assignment); unknown enum values are rejected.
 */
export function normalizeHousehold(input, { actorId, existing = null, now = new Date() } = {}) {
    const c = new FieldCollector();

    if (!input || typeof input !== 'object') {
        throw ApiError.badRequest('Send a household object.');
    }

    const houseStatus = choice(input.houseStatus, 'houseStatus', c, ENUMS.houseStatus, { required: true });
    const head = input.head && typeof input.head === 'object' ? input.head : {};

    const record = {
        houseNumber: text(input.houseNumber, 'houseNumber', c, { required: true, max: 60 }),
        houseLot: text(input.houseLot, 'houseLot', c, { max: 40 }),
        houseBlock: text(input.houseBlock, 'houseBlock', c, { max: 40 }),
        houseStreet: text(input.houseStreet, 'houseStreet', c, { max: 120 }),
        houseClan: text(input.houseClan, 'houseClan', c, { max: 80 }),

        county: choice(input.county, 'county', c, [...COUNTY_SET], { required: true }),
        district: text(input.district, 'district', c, { max: 80 }),
        community: text(input.community, 'community', c, { max: 120 }),

        houseType: choice(input.houseType, 'houseType', c, ENUMS.houseType),
        houseStatus,
        wallMaterial: choice(input.wallMaterial, 'wallMaterial', c, ENUMS.wallMaterial),
        roofMaterial: choice(input.roofMaterial, 'roofMaterial', c, ENUMS.roofMaterial),
        structureCondition: choice(input.structureCondition, 'structureCondition', c, ENUMS.structureCondition),
        yearBuilt: integer(input.yearBuilt, 'yearBuilt', c, { min: 1800, max: 2100 }),
        floorCount: integer(input.floorCount, 'floorCount', c, { min: 1, max: 50 }),
        roomCount: integer(input.roomCount, 'roomCount', c, { min: 1, max: 100 }),

        head: {
            firstName: text(head.firstName, 'head.firstName', c, { max: 60 }),
            lastName: text(head.lastName, 'head.lastName', c, { max: 60 }),
            age: integer(head.age, 'head.age', c, { min: 0, max: 150 }),
            gender: choice(head.gender, 'head.gender', c, ENUMS.gender),
            civilStatus: choice(head.civilStatus, 'head.civilStatus', c, ENUMS.civilStatus),
            nationality: choice(head.nationality, 'head.nationality', c, ENUMS.nationality),
            occupation: text(head.occupation, 'head.occupation', c, { max: 80 }),
            contact: text(head.contact, 'head.contact', c, { max: 40 }),
            email: text(head.email, 'head.email', c, { max: 120 })
        },

        totalPersons: integer(input.totalPersons, 'totalPersons', c, { min: 0, max: 100 }) ?? 0,
        totalMale: integer(input.totalMale, 'totalMale', c, { min: 0, max: 100 }) ?? 0,
        totalFemale: integer(input.totalFemale, 'totalFemale', c, { min: 0, max: 100 }) ?? 0,
        totalMinors: integer(input.totalMinors, 'totalMinors', c, { min: 0, max: 100 }) ?? 0,
        totalSenior: integer(input.totalSenior, 'totalSenior', c, { min: 0, max: 100 }) ?? 0,
        totalPwd: integer(input.totalPwd, 'totalPwd', c, { min: 0, max: 100 }) ?? 0,

        lat: decimal(input.lat, 'lat', c, { min: -90, max: 90, required: true }),
        lng: decimal(input.lng, 'lng', c, { min: -180, max: 180, required: true }),
        fullAddress: text(input.fullAddress, 'fullAddress', c, { max: 300 }),
        landmark: text(input.landmark, 'landmark', c, { max: 160 }),
        zone: text(input.zone, 'zone', c, { max: 60 }),
        enumArea: text(input.enumArea, 'enumArea', c, { max: 40 }),

        incomeClass: choice(input.incomeClass, 'incomeClass', c, ENUMS.incomeClass),
        mobileMoney: choice(input.mobileMoney, 'mobileMoney', c, ENUMS.mobileMoney),
        waterSource: choice(input.waterSource, 'waterSource', c, ENUMS.waterSource),
        electricitySource: choice(input.electricitySource, 'electricitySource', c, ENUMS.electricitySource),
        cookingFuel: choice(input.cookingFuel, 'cookingFuel', c, ENUMS.cookingFuel),
        internetAccess: choice(input.internetAccess, 'internetAccess', c, ENUMS.internetAccess),
        toiletType: choice(input.toiletType, 'toiletType', c, ENUMS.toiletType),
        wasteDisposal: choice(input.wasteDisposal, 'wasteDisposal', c, ENUMS.wasteDisposal),
        nearestClinic: text(input.nearestClinic, 'nearestClinic', c, { max: 120 }),
        clinicDistance: decimal(input.clinicDistance, 'clinicDistance', c, { min: 0, max: 500 }),

        remarks: text(input.remarks, 'remarks', c, { max: LIMITS.maxNotesLength }),
        surveyedBy: text(input.surveyedBy, 'surveyedBy', c, { max: 80 }),
        surveyDate: text(input.surveyDate, 'surveyDate', c, { max: 10 }),

        consent: input.consent === true,
        demo: input.demo === true,
        deleted: input.deleted === true
    };

    // Members
    const rawMembers = Array.isArray(input.members) ? input.members : [];
    if (rawMembers.length > LIMITS.maxMembers) {
        c.fail('members', `A household cannot list more than ${LIMITS.maxMembers} members.`);
    }
    record.members = rawMembers.slice(0, LIMITS.maxMembers).map((member, index) => {
        const m = member && typeof member === 'object' ? member : {};
        return {
            firstName: text(m.firstName, `members[${index}].firstName`, c, { max: 60 }),
            lastName: text(m.lastName, `members[${index}].lastName`, c, { max: 60 }),
            age: integer(m.age, `members[${index}].age`, c, { min: 0, max: 150 }),
            gender: choice(m.gender, `members[${index}].gender`, c, ENUMS.gender),
            relation: text(m.relation, `members[${index}].relation`, c, { max: 60 })
        };
    }).filter(m => m.firstName || m.lastName);

    // Programmes
    const rawPrograms = Array.isArray(input.healthPrograms) ? input.healthPrograms : [];
    record.healthPrograms = [...new Set(rawPrograms)]
        .filter(program => {
            if (ENUMS.healthPrograms.includes(program)) return true;
            c.warn('healthPrograms', `Ignored unknown programme “${String(program).slice(0, 30)}”.`);
            return false;
        })
        .slice(0, ENUMS.healthPrograms.length);

    // Business rules mirrored from the frontend
    if (houseStatus !== 'vacant' && houseStatus !== 'business'
        && (!record.head.firstName || !record.head.lastName)) {
        c.fail('head', 'Add the household head’s first and last name, or mark the house vacant or business.');
    }
    if (record.totalMale + record.totalFemale > record.totalPersons && record.totalPersons > 0) {
        c.warn('totalPersons', 'Male + female is greater than total persons.');
    }
    if (record.totalMinors + record.totalSenior > record.totalPersons && record.totalPersons > 0) {
        c.warn('totalPersons', 'Under-18 + 60+ is greater than total persons.');
    }
    if (record.head.email && !EMAIL_PATTERN.test(record.head.email)) {
        c.fail('head.email', 'That email address does not look right.');
    }
    if (record.consent !== true) {
        c.warn('consent', 'Consent was not recorded for this household.');
    }

    // Ownership + timestamps
    record.createdAt = clientTimestamp(
        input.createdAt, c, 'createdAt',
        { fallback: existing?.createdAt || now.toISOString() }
    );
    record.updatedAt = clientTimestamp(
        input.updatedAt, c, 'updatedAt',
        { fallback: existing?.updatedAt || now.toISOString() }
    );

    record.ownerId = existing?.ownerId || actorId || null;
    record.updatedBy = actorId || null;

    record.searchText = buildSearchText(record);

    c.throwIfInvalid();
    return { record, warnings: c.warnings };
}

function buildSearchText(record) {
    return [
        record.houseNumber, record.houseLot, record.houseBlock, record.houseStreet,
        record.houseClan, record.county, record.district, record.community, record.zone,
        record.enumArea, record.fullAddress, record.landmark,
        record.head?.firstName, record.head?.lastName, record.head?.contact,
        record.head?.email, record.head?.occupation,
        ...(record.members || []).map(m => `${m.firstName} ${m.lastName} ${m.relation}`)
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .slice(0, 4000);
}

export function normalizeEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 160) {
        throw ApiError.badRequest('Enter a valid email address.');
    }
    return email;
}

export function validatePassword(value) {
    const password = String(value || '');
    if (password.length < 10) {
        throw ApiError.badRequest('Passwords must be at least 10 characters.');
    }
    if (password.length > 200) {
        throw ApiError.badRequest('Passwords must be under 200 characters.');
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        throw ApiError.badRequest('Use at least one letter and one number in the password.');
    }
    return password;
}

export function normalizeName(value, field = 'name') {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) {
        throw ApiError.badRequest(`Provide a ${field} between 2 and 80 characters.`);
    }
    return name;
}
