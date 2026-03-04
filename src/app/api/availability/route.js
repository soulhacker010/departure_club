// ══════════════════════════════════════════════
// API ROUTE: /api/availability
// Bulk availability for region-wide discovery
// ══════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { bulkAvailability } from '@/lib/seatsAero';
import { cacheGet, cacheSet, cacheKey, trackApiCall, getApiUsage } from '@/lib/cache';
import { CACHE_CONFIG } from '@/lib/constants';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const source = searchParams.get('source');
        if (!source) {
            return NextResponse.json({ error: 'Missing required parameter: source' }, { status: 400 });
        }

        const params = {
            source,
            cabin: searchParams.get('cabin') || undefined,
            originRegion: searchParams.get('originRegion') || undefined,
            destinationRegion: searchParams.get('destinationRegion') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            take: parseInt(searchParams.get('take') || '500', 10),
        };

        // Check cache
        const key = cacheKey('bulk', params);
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

        const data = await bulkAvailability(params);
        cacheSet(key, data, CACHE_CONFIG.REGION_TTL);

        return NextResponse.json({ data, fromCache: false, usage: getApiUsage() });
    } catch (error) {
        console.error('Availability API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
