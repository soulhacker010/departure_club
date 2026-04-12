// @ts-nocheck
// ══════════════════════════════════════════════
// SEATS.AERO API CLIENT
// Server-side only — wraps Partner API endpoints
// ══════════════════════════════════════════════

const API_BASE = 'https://seats.aero/partnerapi';

function getApiKey() {
    const key = process.env.SEATS_AERO_KEY;
    if (!key) throw new Error('SEATS_AERO_KEY not set in environment');
    return key;
}

function buildHeaders() {
    return {
        'Partner-Authorization': getApiKey(),
        'Accept': 'application/json',
    };
}

/**
 * Cached Search — search specific airports + date ranges
 * @param {object} params
 * @param {string} params.origin - Comma-delimited origins e.g. "SYD,MEL"
 * @param {string} params.destination - Comma-delimited destinations e.g. "LHR,CDG"
 * @param {string} [params.startDate] - YYYY-MM-DD
 * @param {string} [params.endDate] - YYYY-MM-DD
 * @param {string} [params.cabin] - economy|premium|business|first
 * @param {string} [params.sources] - Comma-delimited e.g. "qantas,velocity"
 * @param {boolean} [params.directOnly] - Only direct flights
 * @param {number} [params.take] - Max results (10-1000)
 */
export async function cachedSearch(params) {
    const url = new URL(`${API_BASE}/search`);

    url.searchParams.set('origin_airport', params.origin);
    url.searchParams.set('destination_airport', params.destination);
    if (params.startDate) url.searchParams.set('start_date', params.startDate);
    if (params.endDate) url.searchParams.set('end_date', params.endDate);
    if (params.cabin) url.searchParams.set('cabins', params.cabin);
    if (params.sources) url.searchParams.set('sources', params.sources);
    if (params.directOnly) url.searchParams.set('only_direct_flights', 'true');
    if (params.carriers) url.searchParams.set('carriers', params.carriers);
    url.searchParams.set('take', String(params.take || 500));
    url.searchParams.set('include_trips', 'true');

    const allData = [];
    let cursor = null;
    let skip = 0;
    let page = 0;
    const maxPages = 5; // Safety limit

    do {
        const pageUrl = new URL(url.toString());
        if (cursor) pageUrl.searchParams.set('cursor', String(cursor));
        if (skip > 0) pageUrl.searchParams.set('skip', String(skip));

        const res = await fetch(pageUrl.toString(), { headers: buildHeaders() });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Seats.aero API error ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const items = json.data || json || [];

        if (!Array.isArray(items) || items.length === 0) break;

        allData.push(...items);

        // Set cursor from first response
        if (page === 0 && json.cursor) cursor = json.cursor;
        skip = allData.length;
        page++;

        // Stop if we got fewer than requested (last page)
        if (items.length < (params.take || 500)) break;
    } while (page < maxPages);

    // Deduplicate by ID
    const seen = new Set();
    return allData.filter(item => {
        if (!item.ID || seen.has(item.ID)) return false;
        seen.add(item.ID);
        return true;
    });
}

/**
 * Bulk Availability — region-wide search for a single source
 * @param {object} params
 * @param {string} params.source - e.g. "qantas"
 * @param {string} [params.cabin] - economy|premium|business|first
 * @param {string} [params.originRegion] - e.g. "Oceania"
 * @param {string} [params.destinationRegion] - e.g. "Europe"
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {number} [params.take]
 */
export async function bulkAvailability(params) {
    const url = new URL(`${API_BASE}/availability`);

    url.searchParams.set('source', params.source);
    if (params.cabin) url.searchParams.set('cabin', params.cabin);
    if (params.originRegion) url.searchParams.set('origin_region', params.originRegion);
    if (params.destinationRegion) url.searchParams.set('destination_region', params.destinationRegion);
    if (params.startDate) url.searchParams.set('start_date', params.startDate);
    if (params.endDate) url.searchParams.set('end_date', params.endDate);
    url.searchParams.set('take', String(params.take || 500));

    const allData = [];
    let cursor = null;
    let skip = 0;
    let page = 0;
    const maxPages = 5;

    do {
        const pageUrl = new URL(url.toString());
        if (cursor) pageUrl.searchParams.set('cursor', String(cursor));
        if (skip > 0) pageUrl.searchParams.set('skip', String(skip));

        const res = await fetch(pageUrl.toString(), { headers: buildHeaders() });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Seats.aero Bulk API error ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const items = json.data || json || [];

        if (!Array.isArray(items) || items.length === 0) break;

        allData.push(...items);
        if (page === 0 && json.cursor) cursor = json.cursor;
        skip = allData.length;
        page++;

        if (items.length < (params.take || 500)) break;
    } while (page < maxPages);

    const seen = new Set();
    return allData.filter(item => {
        if (!item.ID || seen.has(item.ID)) return false;
        seen.add(item.ID);
        return true;
    });
}

/**
 * Get Trips — flight-level details from an availability ID
 * @param {string} availabilityId
 * @returns {Promise<Array>} Array of trip objects with segments
 */
export async function getTrips(availabilityId) {
    const url = `${API_BASE}/trips/${availabilityId}`;

    const res = await fetch(url, { headers: buildHeaders() });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Seats.aero Trips API error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    return json.data || json || [];
}
