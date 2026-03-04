// ══════════════════════════════════════════════
// API ROUTE: /api/search
// Main search endpoint — runs the cascade engine
// ══════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { cascadeSearch } from '@/lib/cascade';
import { filterRoutes } from '@/lib/scoring';
import { getApiUsage } from '@/lib/cache';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        // Required params
        const origin = searchParams.get('origin');
        const destination = searchParams.get('destination');
        const date = searchParams.get('date');

        if (!origin || !destination || !date) {
            return NextResponse.json(
                { error: 'Missing required parameters: origin, destination, date' },
                { status: 400 }
            );
        }

        // Optional params
        const cabin = searchParams.get('cabin') || 'business';
        const program = searchParams.get('program') || 'both';
        const hybridEnabled = searchParams.get('hybrid') !== 'false';
        const stops = searchParams.get('stops') || 'any';
        const passengers = parseInt(searchParams.get('passengers') || '1', 10);
        const endDate = searchParams.get('endDate') || '';

        // Filter params
        const sortBy = searchParams.get('sortBy');
        const typeFilter = searchParams.get('type');
        const cabinFilter = searchParams.get('cabinFilter');

        // Check API budget
        const usage = getApiUsage();
        if (usage.remaining <= 0) {
            return NextResponse.json(
                { error: 'Daily API limit reached. Try again tomorrow.', usage },
                { status: 429 }
            );
        }

        // Run cascade search
        const { results, meta } = await cascadeSearch({
            origin,
            destination,
            date,
            endDate: endDate || undefined,
            cabin,
            program,
            hybridEnabled,
            stops,
            passengers,
        });

        // Apply filters if specified
        const filtered = filterRoutes(results, {
            sortBy,
            type: typeFilter,
            cabin: cabinFilter,
        });

        return NextResponse.json({
            results: filtered,
            meta: {
                ...meta,
                usage: getApiUsage(),
                filteredCount: filtered.length,
            },
        });
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: 'Search failed', message: error.message },
            { status: 500 }
        );
    }
}
