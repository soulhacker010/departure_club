// ══════════════════════════════════════════════
// API ROUTE: /api/trips/[id]
// Get flight-level segment details
// ══════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getTrips } from '@/lib/seatsAero';
import { cacheGet, cacheSet, cacheKey, trackApiCall, getApiUsage } from '@/lib/cache';
import { CACHE_CONFIG } from '@/lib/constants';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Missing availability ID' }, { status: 400 });
        }

        // Check cache
        const key = cacheKey('trips', { id });
        const cached = cacheGet(key);
        if (cached) {
            return NextResponse.json({ data: cached, fromCache: true, usage: getApiUsage() });
        }

        // Check budget
        if (!trackApiCall()) {
            return NextResponse.json(
                { error: 'Daily API limit reached', usage: getApiUsage() },
                { status: 429 }
            );
        }

        const data = await getTrips(id);
        cacheSet(key, data, CACHE_CONFIG.ROUTE_TTL);

        return NextResponse.json({ data, fromCache: false, usage: getApiUsage() });
    } catch (error) {
        console.error('Trips API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
