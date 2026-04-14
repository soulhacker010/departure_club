// @ts-nocheck
'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import SearchPanel from '@/components/SearchPanel';
import PaymentGate from '@/components/PaymentGate';
import ResultRow from '@/components/ResultRow';
import ExpandedCard from '@/components/ExpandedCard';
import { getAirlineLogoUrl, CABIN_LABELS } from '@/lib/constants';

export default function SearchPage() {
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
        stops: 'any',
        program: null,
        airlines: [],
    });
    const [allResults, setAllResults] = useState([]);
    const [searchExpanded, setSearchExpanded] = useState(true);
    const [lastSearch, setLastSearch] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [expandedTab, setExpandedTab] = useState('timeline');

    // TODO: set to true when Supabase confirms user has no active subscription
    const showGate = false;

    // ── Exact same search logic as home page ──
    async function handleSearch(params) {
        setLoading(true);
        setError(null);
        setHasSearched(true);
        setResults([]);
        setAlternateResults([]);
        setAllResults([]);
        setExpandedId(null);
        setExpandedTab('timeline');
        setLastSearch(params);
        setSearchExpanded(false);

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
            if (params.overnightLayover) queryParams.set('overnight', 'true');
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

    // ── Filter logic — same as home page, extended with sidebar filters ──
    function handleFilterChange(filters) {
        setActiveFilters(filters);
        if (allResults.length > 0) {
            let filtered = [...allResults];

            // Route type
            if (filters.type === 'reward-only') {
                filtered = filtered.filter(r => !r.type.startsWith('hybrid'));
            } else if (filters.type === 'hybrid-only') {
                filtered = filtered.filter(r => r.type.startsWith('hybrid'));
            } else if (filters.type === 'cash-fares') {
                filtered = filtered.filter(r => r.type.startsWith('hybrid') || r.totalCash > 0);
            }

            // Cabin
            if (filters.cabin) {
                filtered = filtered.filter(r => {
                    if (!r.legs) return true;
                    const mainLeg = r.legs.find(l => l.isReward && !l.isPositioning);
                    if (!mainLeg) return true;
                    return mainLeg.cabin === filters.cabin;
                });
            }

            // Stops (sidebar)
            if (filters.stops === '0') {
                filtered = filtered.filter(r => (r.totalStops || 0) === 0);
            } else if (filters.stops === '1') {
                filtered = filtered.filter(r => (r.totalStops || 0) === 1);
            } else if (filters.stops === '2+') {
                filtered = filtered.filter(r => (r.totalStops || 0) >= 2);
            }

            // Program (sidebar)
            if (filters.program === 'qantas') {
                filtered = filtered.filter(r => r.source === 'qantas');
            } else if (filters.program === 'velocity') {
                filtered = filtered.filter(r => r.source === 'velocity');
            }

            // Airlines (sidebar)
            if (filters.airlines?.length > 0) {
                filtered = filtered.filter(r =>
                    r.legs?.some(leg =>
                        filters.airlines.some(code => leg.airlines?.includes(code))
                    )
                );
            }

            // Sort
            if (filters.sortBy === 'fastest') {
                filtered.sort((a, b) => (a.totalDurationMinutes || 9999) - (b.totalDurationMinutes || 9999));
            } else if (filters.sortBy === 'fewest-layovers') {
                filtered.sort((a, b) => (a.totalStops || 99) - (b.totalStops || 99));
            } else if (filters.sortBy === 'lowest-points') {
                filtered.sort((a, b) => (a.totalPoints || 999999) - (b.totalPoints || 999999));
            } else if (filters.sortBy === 'cheapest') {
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

    const CABIN_DISPLAY = { economy: 'Economy', premium: 'Premium Economy', business: 'Business', first: 'First Class' };
    const PROGRAM_DISPLAY = { both: 'Both programs', qantas: 'Qantas FF', velocity: 'Velocity', all: 'All programs' };

    return (
        <>
            {showGate && <PaymentGate />}
            <Navbar />
            <div style={{ paddingTop: '84px', filter: showGate ? 'blur(6px) brightness(0.4)' : 'none', pointerEvents: showGate ? 'none' : 'auto' }}>

                {/* ── Search input — full panel or collapsed summary ── */}
                {searchExpanded || !hasSearched ? (
                    <SearchPanel onSearch={handleSearch} loading={loading} />
                ) : (
                    <CollapsedBar
                        params={lastSearch}
                        loading={loading}
                        cabinDisplay={CABIN_DISPLAY}
                        programDisplay={PROGRAM_DISPLAY}
                        onEdit={() => setSearchExpanded(true)}
                    />
                )}

                {/* ── Results layout ── */}
                {hasSearched && (
                    <div className="sp-layout">

                        {/* Left sidebar filters */}
                        <aside className="sp-sidebar">
                            <SidebarFilters
                                results={allResults}
                                filters={activeFilters}
                                onChange={handleFilterChange}
                            />
                        </aside>

                        {/* Main results area */}
                        <div className="sp-main">

                            {/* Loading */}
                            {loading && (
                                <div className="rl-loading">
                                    <div className="loading-spinner" />
                                    <div className="rl-loading-text">Searching across programs...</div>
                                </div>
                            )}

                            {/* Results */}
                            {!loading && results.length > 0 && (
                                <>
                                    {/* Header + sort */}
                                    <div className="rl-header">
                                        <span className="rl-count">
                                            {results.length} result{results.length !== 1 ? 's' : ''}
                                            {lastSearch && ` · ${lastSearch.origin} → ${lastSearch.destination} · ${CABIN_DISPLAY[lastSearch.cabin] || lastSearch.cabin}`}
                                        </span>
                                        <div className="rl-sort-btns">
                                            {[
                                                { key: null,            label: 'Best value' },
                                                { key: 'lowest-points', label: 'Fewest points' },
                                                { key: 'fastest',       label: 'Shortest' },
                                            ].map(s => (
                                                <button
                                                    key={String(s.key)}
                                                    className={`rl-sort-btn ${activeFilters.sortBy === s.key ? 'rl-sort-active' : ''}`}
                                                    onClick={() => handleFilterChange({ ...activeFilters, sortBy: s.key })}
                                                >
                                                    {s.key === null && activeFilters.sortBy === null && '★ '}{s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Result rows */}
                                    <div className="rl-list">
                                        {results.map((route, i) => {
                                            const rid = route.id || `r-${i}`;
                                            const isOpen = expandedId === rid;
                                            return (
                                                <div key={rid}>
                                                    <ResultRow
                                                        route={route}
                                                        rank={i + 1}
                                                        expanded={isOpen}
                                                        onToggle={() => { setExpandedTab('timeline'); setExpandedId(isOpen ? null : rid); }}
                                                        onDetails={() => { setExpandedTab('fares'); setExpandedId(rid); }}
                                                    />
                                                    {isOpen && (
                                                        <div className="rl-expanded-card">
                                                            <ExpandedCard route={route} onCollapse={() => setExpandedId(null)} initialTab={expandedTab} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Alternate dates */}
                            {!loading && alternateResults.length > 0 && (
                                <div className="rl-alternate-section">
                                    <div className="rl-alternate-heading">
                                        Alternate dates
                                        <span className="rl-alternate-sub">±2 days · {alternateResults.length} routes</span>
                                    </div>
                                    <div className="rl-list">
                                        {alternateResults.map((route, i) => {
                                            const rid = route.id || `alt-${i}`;
                                            const isOpen = expandedId === rid;
                                            return (
                                                <div key={rid}>
                                                    <ResultRow
                                                        route={route}
                                                        rank={i + 1}
                                                        expanded={isOpen}
                                                        onToggle={() => { setExpandedTab('timeline'); setExpandedId(isOpen ? null : rid); }}
                                                        onDetails={() => { setExpandedTab('fares'); setExpandedId(rid); }}
                                                    />
                                                    {isOpen && (
                                                        <div className="rl-expanded-card">
                                                            <ExpandedCard route={route} onCollapse={() => setExpandedId(null)} initialTab={expandedTab} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && !loading && (
                                <div className="rl-error">
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            {/* No results */}
                            {!loading && !error && hasSearched && results.length === 0 && (
                                <div className="rl-empty">
                                    <div className="rl-empty-icon">✈</div>
                                    <div className="rl-empty-title">No routes found</div>
                                    <div className="rl-empty-sub">Try adjusting your dates, cabin, or program</div>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                <footer className="footer">
                    <p>Departure Club © 2026 — Powered by Seats.aero Partner API</p>
                </footer>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════
// COLLAPSED SEARCH BAR — shown after first search
// ═══════════════════════════════════════════════

function CollapsedBar({ params, loading, onEdit, cabinDisplay, programDisplay }) {
    if (!params) return null;
    const cabin = cabinDisplay[params.cabin] || params.cabin || '';
    const program = programDisplay[params.program] || params.program || '';
    const dateStr = params.date ? new Date(params.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '';
    const endStr = params.endDate ? new Date(params.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '';

    return (
        <div className="csb-bar">
            <div className="csb-fields">
                <div className="csb-field">
                    <span className="csb-field-label">FROM</span>
                    <span className="csb-field-val">{params.origin}</span>
                </div>
                <div className="csb-arrow">→</div>
                <div className="csb-field">
                    <span className="csb-field-label">TO</span>
                    <span className="csb-field-val">{params.destination}</span>
                </div>
                <div className="csb-divider" />
                <div className="csb-field">
                    <span className="csb-field-label">DATES</span>
                    <span className="csb-field-val">{dateStr}{endStr && endStr !== dateStr ? ` – ${endStr}` : ''}</span>
                </div>
                <div className="csb-divider" />
                <div className="csb-field">
                    <span className="csb-field-label">CABIN</span>
                    <span className="csb-field-val">{cabin}</span>
                </div>
                <div className="csb-divider" />
                <div className="csb-field">
                    <span className="csb-field-label">PROGRAM</span>
                    <span className="csb-field-val">{program}</span>
                </div>
            </div>
            <button className="csb-edit-btn" onClick={onEdit} disabled={loading}>
                {loading ? '⏳ Searching...' : '✎ Edit search'}
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════
// SIDEBAR FILTERS
// Left panel shown after search
// ═══════════════════════════════════════════════

function SidebarFilters({ results, filters, onChange }) {
    const counts = {
        stops: { any: results.length, '0': 0, '1': 0, '2+': 0 },
        type: { all: results.length, reward: 0, hybrid: 0 },
        program: { qantas: 0, velocity: 0 },
        airlines: {},
    };

    for (const r of results) {
        const stops = r.totalStops || 0;
        if (stops === 0) counts.stops['0']++;
        else if (stops === 1) counts.stops['1']++;
        else counts.stops['2+']++;

        if (r.type?.startsWith('hybrid')) counts.type.hybrid++;
        else counts.type.reward++;

        if (r.source === 'qantas') counts.program.qantas++;
        if (r.source === 'velocity') counts.program.velocity++;

        for (const leg of r.legs || []) {
            if (!leg.airlines) continue;
            for (const a of leg.airlines.split(',').map(x => x.trim()).filter(Boolean)) {
                counts.airlines[a] = (counts.airlines[a] || 0) + 1;
            }
        }
    }

    const topAirlines = Object.entries(counts.airlines)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const activeAirlines = filters.airlines || [];
    const activeStops = filters.stops || 'any';
    const activeType = filters.type || 'all';
    const activeProgram = filters.program || 'all';

    function update(patch) {
        onChange({ ...filters, ...patch });
    }

    function toggleAirline(code) {
        const next = activeAirlines.includes(code)
            ? activeAirlines.filter(a => a !== code)
            : [...activeAirlines, code];
        update({ airlines: next });
    }

    return (
        <div className="sf-panel">

            <div className="sf-section">
                <div className="sf-title">STOPS</div>
                {[
                    { key: 'any', label: 'Any stops', count: counts.stops.any },
                    { key: '0',   label: 'Direct only', count: counts.stops['0'] },
                    { key: '1',   label: '1 stop',      count: counts.stops['1'] },
                    { key: '2+',  label: '2+ stops',    count: counts.stops['2+'] },
                ].map(opt => (
                    <button
                        key={opt.key}
                        className={`sf-row ${activeStops === opt.key ? 'sf-row-active' : ''}`}
                        onClick={() => update({ stops: opt.key })}
                    >
                        <span className="sf-dot">{activeStops === opt.key ? '●' : '○'}</span>
                        <span className="sf-label">{opt.label}</span>
                        <span className="sf-badge">{opt.count}</span>
                    </button>
                ))}
            </div>

            <div className="sf-section">
                <div className="sf-title">ROUTE TYPE</div>
                {[
                    { key: 'all',        label: 'All types',    count: counts.type.all },
                    { key: 'reward-only',label: 'Full reward',  count: counts.type.reward },
                    { key: 'cash-fares', label: 'Hybrid',       count: counts.type.hybrid },
                ].map(opt => (
                    <button
                        key={opt.key}
                        className={`sf-row ${activeType === opt.key ? 'sf-row-active' : ''}`}
                        onClick={() => update({ type: opt.key === 'all' ? null : opt.key })}
                    >
                        <span className="sf-dot">{activeType === opt.key ? '●' : '○'}</span>
                        <span className="sf-label">{opt.label}</span>
                        <span className="sf-badge">{opt.count}</span>
                    </button>
                ))}
            </div>

            <div className="sf-section">
                <div className="sf-title">PROGRAM</div>
                {[
                    { key: 'all',      label: 'All programs', count: results.length },
                    { key: 'qantas',   label: 'Qantas FF',    count: counts.program.qantas },
                    { key: 'velocity', label: 'Velocity',      count: counts.program.velocity },
                ].map(opt => (
                    <button
                        key={opt.key}
                        className={`sf-row ${activeProgram === opt.key ? 'sf-row-active' : ''}`}
                        onClick={() => update({ program: opt.key === 'all' ? null : opt.key })}
                    >
                        <span className="sf-dot">{activeProgram === opt.key ? '●' : '○'}</span>
                        <span className="sf-label">{opt.label}</span>
                        <span className="sf-badge">{opt.count}</span>
                    </button>
                ))}
            </div>

            {topAirlines.length > 0 && (
                <div className="sf-section">
                    <div className="sf-title">AIRLINE</div>
                    {topAirlines.map(([code, count]) => (
                        <button
                            key={code}
                            className={`sf-row ${activeAirlines.includes(code) ? 'sf-row-active' : ''}`}
                            onClick={() => toggleAirline(code)}
                        >
                            <span className="sf-dot">{activeAirlines.includes(code) ? '☑' : '☐'}</span>
                            <span className="sf-label">{code}</span>
                            <span className="sf-badge">{count}</span>
                        </button>
                    ))}
                    {activeAirlines.length > 0 && (
                        <button className="sf-clear-btn" onClick={() => update({ airlines: [] })}>
                            Clear
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════
// TIMELINE CARD — exact copy from home page
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
            const match = dateStr.match(/T(\d{2}):(\d{2})/);
            if (match) return `${match[1]}:${match[2]}`;
            return '—';
        } catch { return '—'; }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const datePart = dateStr.split('T')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; }
    }

    function formatShortDate(dateStr) {
        if (!dateStr) return '';
        try {
            const datePart = dateStr.split('T')[0];
            if (!datePart) return '';
            const [y, m, d] = datePart.split('-').map(Number);
            if (!y || !m || !d) return '';
            return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
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
        if (curr.layoverMinutes) return curr.layoverMinutes;
        if (prev.arrivalTime && curr.departureTime) {
            const diff = Math.round((new Date(curr.departureTime) - new Date(prev.arrivalTime)) / 60000);
            if (diff > 0) return diff;
        }
        const prevDest = prev.destination;
        const currOrig = curr.origin;
        if (prevDest && currOrig && prevDest === currOrig) return 90;
        return 120;
    }

    function getAirlineCode(airlines) {
        if (!airlines) return null;
        return airlines.split(',')[0].trim().substring(0, 2).toUpperCase();
    }

    function getSegmentBadge(leg) {
        const cabin = CABIN_LABELS[leg.cabin] || 'Economy';
        const type = leg.isCash ? 'CASH' : 'REWARD';
        return { label: `${cabin.toUpperCase()} ${type}`, isCash: leg.isCash };
    }

    const totalCashCost = route.legs?.reduce((sum, leg) => {
        if (leg.isCash && leg.estimatedPrice) return sum + leg.estimatedPrice;
        return sum;
    }, 0) || 0;

    const totalPoints = route.totalPoints || 0;
    const totalTaxes = route.totalTaxes || 0;

    return (
        <div className="mc-card">
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

            <div className="mc-timeline">
                {route.legs?.map((leg, i) => {
                    const badge = getSegmentBadge(leg);
                    const airlineCode = getAirlineCode(leg.airlines);
                    const layoverMins = getLayoverMins(i);
                    const baseDate = new Date(leg.date || route.date);

                    let departDate;
                    if (leg.departureTime) {
                        departDate = new Date(leg.departureTime);
                    } else {
                        departDate = new Date(baseDate);
                    }

                    if (i > 0) {
                        const prevLeg = route.legs[i - 1];
                        let prevArrival;
                        if (prevLeg.arrivalTime) {
                            prevArrival = new Date(prevLeg.arrivalTime);
                        } else if (prevLeg.departureTime) {
                            prevArrival = new Date(new Date(prevLeg.departureTime).getTime() + (prevLeg.durationMinutes || 120) * 60000);
                        }
                        if (prevArrival && departDate < prevArrival) {
                            while (departDate < prevArrival) {
                                departDate.setDate(departDate.getDate() + 1);
                            }
                        }
                    }

                    let arriveDate;
                    if (leg.arrivalTime) {
                        arriveDate = new Date(leg.arrivalTime);
                        if (arriveDate < departDate) {
                            while (arriveDate < departDate) {
                                arriveDate.setDate(arriveDate.getDate() + 1);
                            }
                        }
                    } else {
                        arriveDate = new Date(departDate.getTime() + (leg.durationMinutes || 120) * 60000);
                    }

                    leg._correctedArrival = arriveDate.toISOString();
                    const departDateStr = formatShortDate(departDate.toISOString());
                    const arriveDateStr = formatShortDate(arriveDate.toISOString());

                    return (
                        <div key={i} className="mc-segment-group">
                            {i > 0 && layoverMins && (
                                <div className="mc-layover-badge">
                                    <span className="mc-layover-icon">⏳</span>
                                    <span>{formatMins(layoverMins)} layover</span>
                                </div>
                            )}
                            <div className="mc-segment">
                                <div className={`mc-seg-badge ${badge.isCash ? 'mc-seg-cash' : 'mc-seg-reward'}`}>
                                    {badge.label}
                                </div>
                                <div className="mc-time-block">
                                    {leg.departureTime ? (
                                        <div className="mc-time">{formatTime(leg.departureTime)}</div>
                                    ) : (
                                        <div className="mc-time mc-time-code">{leg.origin}</div>
                                    )}
                                    {leg.departureTime && <div className="mc-airport-code">{leg.origin}</div>}
                                    <div className="mc-leg-date">{departDateStr}</div>
                                </div>
                                <div className="mc-connector">
                                    <div className="mc-duration-label">
                                        <span className="mc-dur-time">{leg.durationFormatted || formatMins(leg.durationMinutes) || ''}</span>
                                        {leg.stops > 0 && (
                                            <span className="mc-dur-stops">{`➜ ${leg.stops} stop${leg.stops > 1 ? 's' : ''}`}</span>
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
                                <div className="mc-time-block">
                                    {leg.arrivalTime ? (
                                        <div className="mc-time">{formatTime(leg.arrivalTime)}</div>
                                    ) : (
                                        <div className="mc-time mc-time-code">{leg.destination}</div>
                                    )}
                                    {leg.arrivalTime && <div className="mc-airport-code">{leg.destination}</div>}
                                    <div className="mc-leg-date">{arriveDateStr}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

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
                                    {leg.isEstimate !== false ? '~' : ''}A${leg.estimatedPrice || '—'}
                                </div>
                                <div className="mc-fare-detail">{CABIN_LABELS[leg.cabin] || 'Economy'} · {leg.isEstimate !== false ? 'est. fare' : 'real fare'}</div>
                                <a className="mc-booking-link cash-link"
                                    href={`https://www.google.com/travel/flights?q=one+way+nonstop+flights+from+${leg.origin}+to+${leg.destination}+on+${leg.date || route.date}`}
                                    target="_blank" rel="noopener noreferrer">
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
                                <a className="mc-booking-link reward-link"
                                    href="https://www.qantas.com/au/en/book-a-trip/flights/multi-city.html"
                                    target="_blank" rel="noopener noreferrer">
                                    🔗 Book on Qantas
                                </a>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="mc-total-bar">
                <div className="mc-total-main">
                    <span className="mc-total-label">Total Trip Cost</span>
                    <span className="mc-total-amount">
                        {totalCashCost > 0 && <span className="cash-highlight">A${totalCashCost.toLocaleString()}</span>}
                        {totalCashCost > 0 && totalPoints > 0 && <span className="mc-plus"> + </span>}
                        {totalPoints > 0 && <span className="points-highlight">{totalPoints.toLocaleString()} pts</span>}
                        {totalTaxes > 0 && <span className="mc-plus"> + </span>}
                        {totalTaxes > 0 && <span className="taxes-highlight">A${totalTaxes.toLocaleString()} taxes</span>}
                    </span>
                </div>
                <div className="mc-total-breakdown">
                    {totalCashCost > 0 && (
                        <span className="mc-breakdown-item">Cash: A${totalCashCost.toLocaleString()}</span>
                    )}
                    {totalTaxes > 0 && (
                        <span className="mc-breakdown-item">Taxes & Fees: A${totalTaxes.toLocaleString()}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
