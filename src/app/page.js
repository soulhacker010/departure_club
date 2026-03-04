'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import SearchPanel from '@/components/SearchPanel';
import ResultsList from '@/components/ResultsList';
import FilterBar from '@/components/FilterBar';
import RouteMap from '@/components/RouteMap';
import { getAirlineLogoUrl, CABIN_LABELS } from '@/lib/constants';

export default function Home() {
    const [results, setResults] = useState([]);
    const [alternateResults, setAlternateResults] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        sortBy: null,
        type: null,
        cabin: null,
    });
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [allResults, setAllResults] = useState([]);

    async function handleSearch(params) {
        setLoading(true);
        setError(null);
        setHasSearched(true);
        setResults([]);
        setAlternateResults([]);
        setAllResults([]);
        setSelectedRoute(null);

        try {
            const queryParams = new URLSearchParams({
                origin: params.origin,
                destination: params.destination,
                date: params.date,
                cabin: params.cabin,
                program: params.program,
                hybrid: String(params.hybridEnabled),
                stops: params.stops,
                passengers: String(params.passengers),
            });

            if (activeFilters.sortBy) queryParams.set('sortBy', activeFilters.sortBy);
            if (activeFilters.type) queryParams.set('type', activeFilters.type);
            if (activeFilters.cabin) queryParams.set('cabinFilter', activeFilters.cabin);
            if (params.endDate) queryParams.set('endDate', params.endDate);
            if (params.constraints) queryParams.set('constraints', params.constraints);
            if (params.cabinOverrides) {
                queryParams.set('cabinOverrides', JSON.stringify(params.cabinOverrides));
            }

            const res = await fetch(`/api/search?${queryParams}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Search failed');

            const all = data.results || [];
            setAllResults(all);

            const exactDate = params.date;
            const exact = all.filter(r => r.date === exactDate);
            const alternates = all.filter(r => r.date !== exactDate);

            setResults(exact.length > 0 ? exact : all);
            setAlternateResults(exact.length > 0 ? alternates : []);
            setMeta(data.meta || null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleFilterChange(filters) {
        setActiveFilters(filters);
        if (allResults.length > 0) {
            let filtered = [...allResults];

            if (filters.type === 'reward-only') {
                filtered = filtered.filter(r => !r.type.startsWith('hybrid'));
            } else if (filters.type === 'hybrid-only') {
                filtered = filtered.filter(r => r.type.startsWith('hybrid'));
            } else if (filters.type === 'cash-fares') {
                filtered = filtered.filter(r => r.type.startsWith('hybrid') || r.totalCash > 0);
            }

            if (filters.cabin) {
                filtered = filtered.filter(r => {
                    if (!r.legs) return true;
                    const mainLeg = r.legs.find(l => l.isReward && !l.isPositioning);
                    if (!mainLeg) return true;
                    return mainLeg.cabin === filters.cabin;
                });
            }

            if (filters.sortBy === 'fastest') {
                filtered.sort((a, b) => (a.totalDurationMinutes || 9999) - (b.totalDurationMinutes || 9999));
            } else if (filters.sortBy === 'fewest-layovers') {
                filtered.sort((a, b) => (a.totalStops || 99) - (b.totalStops || 99));
            } else if (filters.sortBy === 'lowest-points') {
                filtered.sort((a, b) => (a.totalPoints || 999999) - (b.totalPoints || 999999));
            } else if (filters.sortBy === 'cheapest') {
                // Sort by total estimated cost: cash + approximate points value
                filtered.sort((a, b) => {
                    const costA = (a.totalCash || 0) + (a.totalPoints || 0) * 0.015;
                    const costB = (b.totalCash || 0) + (b.totalPoints || 0) * 0.015;
                    return costA - costB;
                });
            } else if (filters.sortBy === 'lowest-taxes') {
                filtered.sort((a, b) => (a.totalTaxes || 999999) - (b.totalTaxes || 999999));
            }

            setResults(filtered);
        }
    }

    return (
        <>
            <Navbar />
            <Hero />
            <SearchPanel onSearch={handleSearch} loading={loading} />

            {hasSearched && (
                <div className="main-content">
                    <div className="map-wrapper">
                        <RouteMap results={results} selectedRoute={selectedRoute} />
                        {loading && (
                            <div className="loading-overlay">
                                <div className="loading-spinner" />
                                <div className="loading-text">Searching across programs...</div>
                                <div className="loading-progress">
                                    <div className="loading-progress-bar" style={{ width: '60%' }} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h3>Flight Results</h3>
                            <span className="sidebar-count">
                                {results.length} {results.length === 1 ? 'route' : 'routes'}
                            </span>
                        </div>

                        <ResultsList
                            results={results}
                            loading={loading}
                            error={error}
                            selectedRoute={selectedRoute}
                            onSelectRoute={setSelectedRoute}
                        />
                    </div>
                </div>
            )}

            {/* Detailed Timeline Cards — Matches Client Mockup */}
            {hasSearched && !loading && results.length > 0 && (
                <div className="hybrid-section">
                    <div className="hybrid-header">
                        <div className="hybrid-header-top">
                            <div>
                                <h2>Detailed Route Breakdown</h2>
                                <p className="hybrid-subtitle">
                                    {meta?.totalResults || results.length} routes found across{' '}
                                    {meta?.steps?.length || 0} search steps •{' '}
                                    {meta?.apiCalls || 0} API calls ({meta?.fromCache || 0} cached)
                                    {meta?.fetchedAt && (
                                        <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                                            • Last checked: {new Date(meta.fetchedAt).toLocaleTimeString()}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <FilterBar filters={activeFilters} onChange={handleFilterChange} />
                        </div>
                    </div>
                    <div className="hybrid-results">
                        {results.map((route, i) => (
                            <div key={route.id || i} className="hy-timeline-card" onClick={() => setSelectedRoute(route)}>
                                <TimelineCardMockup route={route} rank={i + 1} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alternate Date Results */}
            {hasSearched && !loading && alternateResults.length > 0 && (
                <div className="hybrid-section alternate-dates-section">
                    <div className="hybrid-header">
                        <h2>📅 Alternate Dates</h2>
                        <p className="hybrid-subtitle">
                            {alternateResults.length} routes on nearby dates (±2 days)
                        </p>
                    </div>
                    <div className="hybrid-results">
                        {alternateResults.map((route, i) => (
                            <div key={route.id || `alt-${i}`} className="hy-timeline-card alternate-date-card" onClick={() => setSelectedRoute(route)}>
                                <TimelineCardMockup route={route} rank={i + 1} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className="hybrid-section">
                    <div className="empty-state">
                        <div className="icon">⚠️</div>
                        <h4>Search Error</h4>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <footer className="footer">
                <p>Departure Club © 2026 — Powered by Seats.aero Partner API</p>
            </footer>
        </>
    );
}


// ═══════════════════════════════════════════════
// TIMELINE CARD — Matches Client Mockup Exactly
// Shows: times, airlines, duration on lines,
// layover badges, fare breakdowns, booking links,
// seat availability, total trip cost
// ═══════════════════════════════════════════════

function TimelineCardMockup({ route, rank }) {

    const CABIN_LABELS = { Y: 'Economy', W: 'Premium', J: 'Business', F: 'First' };
    const AIRLINE_ICONS = {
        'QF': '🦘', 'VA': '✈️', 'SQ': '🟡', 'EK': '🔴', 'QR': '🟣',
        'EY': '🟠', 'CX': '🟢', 'BA': '🔵', 'LH': '⚪', 'AF': '🔵',
        'NH': '🔵', 'JL': '🔴', 'MH': '🔵', 'TG': '🟣', 'GA': '🔵',
    };

    function formatTime(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return '—'; }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; }
    }

    function formatShortDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        } catch { return ''; }
    }

    function formatMins(mins) {
        if (!mins || mins <= 0) return null;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    }

    function getLayoverMins(i) {
        if (i === 0 || !route.legs) return null;
        const prev = route.legs[i - 1];
        const curr = route.legs[i];
        // Use pre-calculated layover if available
        if (curr.layoverMinutes) return curr.layoverMinutes;
        // Calculate from actual times if both legs have them
        if (prev.arrivalTime && curr.departureTime) {
            const diff = Math.round((new Date(curr.departureTime) - new Date(prev.arrivalTime)) / 60000);
            if (diff > 0) return diff;
        }
        // Estimate based on connection type (not hardcoded 3h)
        // Domestic connections = 90 min, regional = 2h, international = 2.5h
        const prevDest = prev.destination;
        const currOrig = curr.origin;
        if (prevDest && currOrig && prevDest === currOrig) {
            // Same airport connection — use minimum connection time
            return 90;
        }
        // Different airports or unknown — use 2h estimate
        return 120;
    }

    function getAirlineCode(airlines) {
        if (!airlines) return null;
        const code = airlines.split(',')[0].trim().substring(0, 2).toUpperCase();
        return code;
    }

    // Determine segment type label: "ECONOMY CASH" or "BUSINESS REWARD"
    function getSegmentBadge(leg) {
        const cabin = CABIN_LABELS[leg.cabin] || 'Economy';
        const type = leg.isCash ? 'CASH' : 'REWARD';
        return { label: `${cabin.toUpperCase()} ${type}`, isCash: leg.isCash };
    }

    // Compute totals
    const totalCashCost = route.legs?.reduce((sum, leg) => {
        if (leg.isCash && leg.estimatedPrice) return sum + leg.estimatedPrice;
        return sum;
    }, 0) || 0;

    const totalPoints = route.totalPoints || 0;
    const totalTaxes = route.totalTaxes || 0;
    const totalTaxesDollars = totalTaxes;

    return (
        <div className="mc-card">
            {/* ── Top Row: Date + Total Duration + Reward % ── */}
            <div className="mc-top-row">
                <div className="mc-date">
                    <span className="mc-date-icon">📅</span>
                    <span>{route.date ? formatDate(route.date) : 'Date TBC'}</span>
                </div>
                <div className="mc-top-pills">
                    {(route.rewardPercent || 0) > 0 && (
                        <span className={`mc-reward-pct ${(route.rewardPercent || 0) >= 80 ? 'mc-reward-high' : ''}`}>
                            ⭐ {route.rewardPercent}% reward
                        </span>
                    )}
                    <div className="mc-total-time">
                        <span className="mc-clock-icon">⏱</span>
                        Total: {route.totalDurationFormatted || 'N/A'}
                    </div>
                </div>
            </div>

            {/* ── Timeline Row: The Core Visual ── */}
            <div className="mc-timeline">
                {route.legs?.map((leg, i) => {
                    const badge = getSegmentBadge(leg);
                    const airlineCode = getAirlineCode(leg.airlines);
                    const airlineIcon = airlineCode ? (AIRLINE_ICONS[airlineCode] || '✈️') : '✈️';
                    const layoverMins = getLayoverMins(i);

                    return (
                        <div key={i} className="mc-segment-group">
                            {/* Layover badge between segments */}
                            {i > 0 && layoverMins && (
                                <div className="mc-layover-badge">
                                    <span className="mc-layover-icon">⏳</span>
                                    <span>{formatMins(layoverMins)} layover</span>
                                </div>
                            )}

                            {/* Segment */}
                            <div className="mc-segment">
                                {/* Segment badge */}
                                <div className={`mc-seg-badge ${badge.isCash ? 'mc-seg-cash' : 'mc-seg-reward'}`}>
                                    {badge.label}
                                </div>

                                {/* Departure */}
                                <div className="mc-time-block">
                                    {leg.departureTime ? (
                                        <div className="mc-time">{formatTime(leg.departureTime)}</div>
                                    ) : (
                                        <div className="mc-time mc-time-code">{leg.origin}</div>
                                    )}
                                    {leg.departureTime && <div className="mc-airport-code">{leg.origin}</div>}
                                    <div className="mc-leg-date">{formatShortDate(leg.departureTime || leg.date || route.date)}</div>
                                </div>

                                {/* Connecting line */}
                                <div className="mc-connector">
                                    <div className="mc-duration-label">
                                        <span className="mc-dur-time">{leg.durationFormatted || formatMins(leg.durationMinutes) || ''}</span>
                                        {leg.stops > 0 && (
                                            <span className="mc-dur-stops">
                                                {`➜ ${leg.stops} stop${leg.stops > 1 ? 's' : ''}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`mc-line ${badge.isCash ? 'mc-line-cash' : 'mc-line-reward'}`}>
                                        {(() => {
                                            const logoUrl = getAirlineLogoUrl(airlineCode);
                                            return logoUrl ? (
                                                <img src={logoUrl} alt={airlineCode} className="mc-line-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                                            ) : null;
                                        })()}
                                    </div>
                                </div>

                                {/* Arrival */}
                                <div className="mc-time-block">
                                    {leg.arrivalTime ? (
                                        <div className="mc-time">{formatTime(leg.arrivalTime)}</div>
                                    ) : (
                                        <div className="mc-time mc-time-code">{leg.destination}</div>
                                    )}
                                    {leg.arrivalTime && <div className="mc-airport-code">{leg.destination}</div>}
                                    <div className="mc-leg-date">{formatShortDate(leg.arrivalTime || leg.date || route.date)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Fare Breakdown Cards ── */}
            <div className="mc-fares">
                {route.legs?.map((leg, i) => (
                    <div key={i} className={`mc-fare-card ${leg.isCash ? 'mc-fare-cash' : 'mc-fare-reward'}`}>
                        <div className="mc-fare-header">
                            {(() => {
                                const code = getAirlineCode(leg.airlines);
                                const logoUrl = code ? getAirlineLogoUrl(code) : null;
                                return logoUrl ? (
                                    <img src={logoUrl} alt={code} className="mc-fare-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : null;
                            })()}
                            {leg.isCash ? 'Cash Fare' : 'Reward Seat'}
                            {leg.airlines && <span className="mc-fare-airline"> · {leg.airlines}</span>}
                        </div>
                        {leg.flightNumbers && (
                            <div className="mc-flight-number">✈ {leg.flightNumbers}</div>
                        )}

                        {leg.isCash ? (
                            <>
                                <div className="mc-fare-price cash-price">
                                    ~A${leg.estimatedPrice || '—'}
                                </div>
                                <div className="mc-fare-detail">{CABIN_LABELS[leg.cabin] || 'Economy'} · est. fare</div>
                                <a className="mc-booking-link cash-link" href={`https://www.google.com/travel/flights?q=flights+from+${leg.origin}+to+${leg.destination}+on+${leg.date || route.date}+${(CABIN_LABELS[leg.cabin] || 'economy').toLowerCase()}`} target="_blank" rel="noopener noreferrer">
                                    🔗 Book on Google Flights
                                </a>
                            </>
                        ) : (
                            <>
                                <div className="mc-fare-price reward-price">
                                    {(leg.points || 0).toLocaleString()}
                                </div>
                                <div className="mc-fare-detail">
                                    {(leg.taxes || 0) > 0
                                        ? `points + A$${(leg.taxes || 0).toLocaleString()} taxes`
                                        : 'points (taxes included)'
                                    }
                                </div>
                                <div className="mc-fare-detail">{CABIN_LABELS[leg.cabin] || 'Economy'}</div>
                                {(leg.remainingSeats || leg.seatsAvailable || 0) > 0 && (
                                    <div className="mc-seats-available">
                                        🟢 {leg.remainingSeats || leg.seatsAvailable} seat{(leg.remainingSeats || leg.seatsAvailable) > 1 ? 's' : ''} available
                                    </div>
                                )}
                                <a className="mc-booking-link reward-link" href="https://www.qantas.com/au/en/book-a-trip/flights/multi-city.html" target="_blank" rel="noopener noreferrer">
                                    🔗 Book on Qantas
                                </a>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Total Trip Cost Bar ── */}
            <div className="mc-total-bar">
                <div className="mc-total-main">
                    <span className="mc-total-label">Total Trip Cost</span>
                    <span className="mc-total-amount">
                        {totalCashCost > 0 && <span className="cash-highlight">A${totalCashCost.toLocaleString()}</span>}
                        {totalCashCost > 0 && totalPoints > 0 && <span className="mc-plus"> + </span>}
                        {totalPoints > 0 && <span className="points-highlight">{totalPoints.toLocaleString()} pts</span>}
                        {totalTaxesDollars > 0 && <span className="mc-plus"> + </span>}
                        {totalTaxesDollars > 0 && <span className="taxes-highlight">A${totalTaxesDollars.toLocaleString()} taxes</span>}
                    </span>
                </div>
                <div className="mc-total-breakdown">
                    {totalCashCost > 0 && (
                        <span className="mc-breakdown-item">Cash: A${totalCashCost.toLocaleString()}</span>
                    )}
                    {totalTaxesDollars > 0 && (
                        <span className="mc-breakdown-item">Taxes & Fees: A${totalTaxesDollars.toLocaleString()}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
