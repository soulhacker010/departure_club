// @ts-nocheck
'use client';

import { useState } from 'react';
import { AIRPORTS } from '@/lib/airports';
import { getAirlineLogoUrl, CABIN_LABELS } from '@/lib/constants';

const CABIN_SHORT = { Y: 'ECO', W: 'PRM', J: 'BIZ', F: 'FIRST' };

function city(code) { return AIRPORTS[code]?.city || code; }

function formatTime(iso) {
    if (!iso) return '—';
    try {
        // Extract HH:MM directly — API returns local airport time labeled as UTC,
        // so we must NOT let Date() apply a timezone offset
        const match = iso.match(/T(\d{2}):(\d{2})/);
        if (match) return `${match[1]}:${match[2]}`;
        return '—';
    }
    catch { return '—'; }
}

function formatDate(iso) {
    if (!iso) return '';
    try {
        const datePart = iso.split('T')[0];
        const [y, m, d] = datePart.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    catch { return iso; }
}

function formatShortDate(iso) {
    if (!iso) return '';
    try {
        // Extract date portion before 'T' to avoid UTC→local timezone drift
        const datePart = iso.split('T')[0];
        if (!datePart) return '';
        const [y, m, d] = datePart.split('-').map(Number);
        if (!y || !m || !d) return '';
        return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    }
    catch { return ''; }
}

function formatMins(mins) {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
}

function airlineCode(airlines) {
    if (!airlines) return null;
    // Handle comma or slash separators, strip non-alphanumeric, take first 2 chars
    const first = airlines.split(/[,\/]/)[0].trim();
    const code = first.replace(/[^A-Z0-9]/gi, '').substring(0, 2).toUpperCase();
    return code || null;
}

function buildGFlightsUrl(origin, destination, date) {
    return `https://www.google.com/travel/flights?q=one+way+nonstop+flights+from+${origin}+to+${destination}+on+${date}`;
}

export default function ExpandedCard({ route, onCollapse, initialTab = 'timeline' }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const legs = route.legs || [];
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const isHybrid = route.type?.startsWith('hybrid');

    const pts = route.totalPoints || 0;
    const taxes = route.totalTaxes || 0;
    const cash = route.totalCash || 0;
    const totalCashCost = legs.reduce((s, l) => l.isCash && l.estimatedPrice ? s + l.estimatedPrice : s, 0);

    // Cabin path pills
    const cabinPath = legs.map(l => CABIN_SHORT[l.cabin] || 'ECO');

    // Unique airlines
    const allAirlines = [...new Set(
        legs.flatMap(l => (l.airlines || '').split(',').map(a => a.trim())).filter(Boolean)
    )].slice(0, 5);

    // Savings estimate
    const pointsValue = pts * 0.015;
    const effectiveTotal = cash + pointsValue + taxes;
    const allCashEst = isHybrid ? Math.round(effectiveTotal * 2.8) : Math.round(pointsValue * 2.5 + taxes);
    const savings = allCashEst - effectiveTotal;

    // Layover minutes between legs
    function getLayoverMins(i) {
        if (i === 0) return null;
        const prev = legs[i - 1];
        const curr = legs[i];
        if (curr.layoverMinutes) return curr.layoverMinutes;
        if (prev.arrivalTime && curr.departureTime) {
            const diff = Math.round((new Date(curr.departureTime) - new Date(prev.arrivalTime)) / 60000);
            if (diff > 0) return diff;
        }
        return 90;
    }

    return (
        <div className="ec-card">

            {/* ══ 1. HEADER: SYD → LHR, cities, overall times, price ══ */}
            <div className="ec-header">
                <div className="ec-header-left">
                    <div className="ec-route-big">
                        <div className="ec-city-block">
                            <span className="ec-iata">{route.origin}</span>
                            <span className="ec-city-name">{city(route.origin)}</span>
                            {firstLeg?.departureTime && <span className="ec-hdr-time">{formatTime(firstLeg.departureTime)}</span>}
                        </div>
                        <div className="ec-route-arrow">→</div>
                        <div className="ec-city-block ec-city-right">
                            <span className="ec-iata">{route.destination}</span>
                            <span className="ec-city-name">{city(route.destination)}</span>
                            {lastLeg?.arrivalTime && <span className="ec-hdr-time">{formatTime(lastLeg.arrivalTime)}</span>}
                        </div>
                    </div>
                    <div className="ec-duration-row">
                        <span className="ec-duration-val">{route.totalDurationFormatted || '—'}</span>
                        <span className="ec-duration-dot">·</span>
                        <span>{(route.totalStops || 0) === 0 ? 'Direct' : `${route.totalStops} stop${route.totalStops > 1 ? 's' : ''}`}</span>
                        {(route.rewardPercent || 0) > 0 && (
                            <>
                                <span className="ec-duration-dot">·</span>
                                <span className={`ec-reward-pct ${route.rewardPercent >= 80 ? 'ec-reward-pct-high' : ''}`}>
                                    ⭐ {route.rewardPercent}% reward
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="ec-header-right">
                    <div className="ec-hdr-from">FROM</div>
                    {isHybrid && cash > 0 ? (
                        <>
                            <div className="ec-hdr-price">A${cash.toLocaleString()}</div>
                            {pts > 0 && <div className="ec-hdr-price-sub">+{pts.toLocaleString()} pts</div>}
                            {taxes > 0 && <div className="ec-hdr-price-sub">+A${taxes.toLocaleString()} taxes</div>}
                        </>
                    ) : (
                        <>
                            <div className="ec-hdr-price ec-hdr-price-gold">{pts.toLocaleString()} pts</div>
                            {taxes > 0 && <div className="ec-hdr-price-sub">+A${taxes.toLocaleString()} taxes</div>}
                        </>
                    )}
                </div>
            </div>

            {/* ══ 2. CABIN PATH + PROGRESS BAR ══ */}
            <div className="ec-path-section">
                <div className="ec-cabin-path">
                    {cabinPath.map((c, i) => (
                        <span key={i} className="ec-cabin-path-item">
                            {i > 0 && <span className="ec-path-sep">→</span>}
                            <span className={`ec-cabin-pill ${c === 'BIZ' || c === 'FIRST' ? 'ec-cabin-pill-reward' : 'ec-cabin-pill-eco'}`}>{c}</span>
                        </span>
                    ))}
                    <span className="ec-stops-badge">{route.totalStops || 0} STOP{(route.totalStops || 0) !== 1 ? 'S' : ''}</span>
                </div>
                <div className="ec-progress-wrap">
                    <div className="ec-progress-line" />
                    {(route.viaHubs || []).map((hub, i, arr) => (
                        <div key={hub} className="ec-hub-marker" style={{ left: `${(i + 1) / (arr.length + 1) * 100}%` }}>
                            <div className="ec-hub-dot" />
                            <div className="ec-hub-label">{hub}</div>
                        </div>
                    ))}
                    <div className="ec-progress-plane">✈</div>
                </div>
            </div>

            {/* ══ 3. TAGS ══ */}
            <div className="ec-tags">
                <span className={`ec-tag ${isHybrid ? 'ec-tag-hybrid' : 'ec-tag-reward'}`}>
                    {isHybrid ? 'Hybrid Route' : 'Full Reward'}
                </span>
                {legs.find(l => l.isReward)?.cabin && (
                    <span className="ec-tag ec-tag-cabin">{CABIN_LABELS[legs.find(l => l.isReward)?.cabin]}</span>
                )}
                {allAirlines.length > 0 && (
                    <span className="ec-tag ec-tag-airlines">{allAirlines.join(' · ')}</span>
                )}
                {savings > 500 && (
                    <span className="ec-tag ec-tag-save">Saves ~A${Math.round(savings / 100) * 100}</span>
                )}
            </div>

            {/* ══ 4. TAB BAR ══ */}
            <div className="ec-tab-bar">
                <button
                    className={`ec-tab ${activeTab === 'timeline' ? 'ec-tab-active' : ''}`}
                    onClick={() => setActiveTab('timeline')}
                >
                    ✈ Flight Timeline
                </button>
                <button
                    className={`ec-tab ${activeTab === 'fares' ? 'ec-tab-active' : ''}`}
                    onClick={() => setActiveTab('fares')}
                >
                    💳 Fare Breakdown
                </button>
            </div>

            {/* ══ 5. TIMELINE (original — exact copy, nothing stripped) ══ */}
            {activeTab === 'timeline' && <div className="mc-timeline">
                {legs.map((leg, i) => {
                    const badge = { label: `${(CABIN_LABELS[leg.cabin] || 'Economy').toUpperCase()} ${leg.isCash ? 'CASH' : 'REWARD'}`, isCash: leg.isCash };
                    const ac = airlineCode(leg.airlines);
                    const layoverMins = getLayoverMins(i);
                    const baseDate = new Date(leg.date || route.date);

                    let departDate = leg.departureTime ? new Date(leg.departureTime) : new Date(baseDate);
                    if (i > 0) {
                        const prev = legs[i - 1];
                        const prevArrival = prev.arrivalTime
                            ? new Date(prev.arrivalTime)
                            : prev.departureTime
                                ? new Date(new Date(prev.departureTime).getTime() + (prev.durationMinutes || 120) * 60000)
                                : null;
                        if (prevArrival && departDate < prevArrival) {
                            while (departDate < prevArrival) departDate.setDate(departDate.getDate() + 1);
                        }
                    }

                    let arriveDate;
                    if (leg.arrivalTime) {
                        arriveDate = new Date(leg.arrivalTime);
                        if (arriveDate < departDate) {
                            while (arriveDate < departDate) arriveDate.setDate(arriveDate.getDate() + 1);
                        }
                    } else {
                        arriveDate = new Date(departDate.getTime() + (leg.durationMinutes || 120) * 60000);
                    }
                    leg._correctedArrival = arriveDate.toISOString();

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
                                    <div className={`mc-time ${!leg.departureTime ? 'mc-time-code' : ''}`}>
                                        {leg.departureTime ? formatTime(leg.departureTime) : leg.origin}
                                    </div>
                                    {leg.departureTime && <div className="mc-airport-code">{leg.origin}</div>}
                                    <div className="mc-leg-date">{formatShortDate(departDate.toISOString())}</div>
                                </div>
                                <div className="mc-connector">
                                    <div className="mc-duration-label">
                                        <span className="mc-dur-time">{leg.durationFormatted || formatMins(leg.durationMinutes) || ''}</span>
                                        {leg.stops > 0 && <span className="mc-dur-stops">➜ {leg.stops} stop{leg.stops > 1 ? 's' : ''}</span>}
                                    </div>
                                    <div className={`mc-line ${badge.isCash ? 'mc-line-cash' : 'mc-line-reward'}`}>
                                        {(() => { const l = getAirlineLogoUrl(ac); return l ? <img src={l} alt={ac} className="mc-line-logo" onError={e => { e.target.style.display = 'none'; }} /> : null; })()}
                                    </div>
                                </div>
                                <div className="mc-time-block">
                                    <div className={`mc-time ${!leg.arrivalTime ? 'mc-time-code' : ''}`}>
                                        {leg.arrivalTime ? formatTime(leg.arrivalTime) : leg.destination}
                                    </div>
                                    {leg.arrivalTime && <div className="mc-airport-code">{leg.destination}</div>}
                                    <div className="mc-leg-date">{formatShortDate(arriveDate.toISOString())}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>}

            {/* ══ 6. FARE CARDS (original — nothing stripped) ══ */}
            {activeTab === 'fares' && <div className="mc-fares">
                {legs.map((leg, i) => {
                    const ac = airlineCode(leg.airlines);
                    const logo = ac ? getAirlineLogoUrl(ac) : null;
                    return (
                        <div key={i} className={`mc-fare-card ${leg.isCash ? 'mc-fare-cash' : 'mc-fare-reward'}`}>
                            <div className="mc-fare-header">
                                {logo && <img src={logo} alt={ac} className="mc-fare-logo" onError={e => { e.target.style.display = 'none'; }} />}
                                {leg.isCash ? 'Cash Fare' : 'Reward Seat'}
                                {leg.airlines && <span className="mc-fare-airline"> · {leg.airlines}</span>}
                            </div>
                            {leg.flightNumbers && <div className="mc-flight-number">✈ {leg.flightNumbers}</div>}
                            {leg.isCash ? (
                                <>
                                    <div className="mc-fare-price cash-price">
                                        {leg.isEstimate !== false ? '~' : ''}A${leg.estimatedPrice || '—'}
                                    </div>
                                    <div className="mc-fare-detail">
                                        {CABIN_LABELS[leg.cabin] || 'Economy'} · {leg.isEstimate !== false ? 'est. fare' : 'real fare'}
                                    </div>
                                    <a className="mc-booking-link cash-link"
                                        href={buildGFlightsUrl(leg.origin, leg.destination, leg.date || route.date)}
                                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                        🔗 Book on Google Flights
                                    </a>
                                </>
                            ) : (
                                <>
                                    <div className="mc-fare-price reward-price">{(leg.points || 0).toLocaleString()}</div>
                                    <div className="mc-fare-detail">
                                        {(leg.taxes || 0) > 0 ? `points + A$${leg.taxes.toLocaleString()} taxes` : 'points (taxes included)'}
                                    </div>
                                    <div className="mc-fare-detail">{CABIN_LABELS[leg.cabin] || 'Economy'}</div>
                                    {(leg.remainingSeats || 0) > 0 && (
                                        <div className="mc-seats-available">
                                            🟢 {leg.remainingSeats} seat{leg.remainingSeats > 1 ? 's' : ''} available
                                        </div>
                                    )}
                                    <a className="mc-booking-link reward-link"
                                        href="https://www.qantas.com/au/en/book-a-trip/flights/multi-city.html"
                                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                        🔗 Book on Qantas
                                    </a>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>}

            {/* ══ 7. TOTAL BAR + YOU SAVE ══ */}
            <div className="ec-total-bar">
                <div className="ec-total-left">
                    <div className="ec-total-label">TOTAL TRIP COST</div>
                    <div className="ec-total-amount">
                        {totalCashCost > 0 && <span className="ec-total-cash">A${totalCashCost.toLocaleString()}</span>}
                        {totalCashCost > 0 && pts > 0 && <span className="ec-total-sep"> + </span>}
                        {pts > 0 && <span className="ec-total-pts">{pts.toLocaleString()} pts</span>}
                        {taxes > 0 && <span className="ec-total-sep"> + </span>}
                        {taxes > 0 && <span className="ec-total-taxes">A${taxes.toLocaleString()} taxes</span>}
                    </div>
                    <div className="ec-total-note">
                        Est. points value ~A${Math.round(pointsValue).toLocaleString()} · Effective total ~A${Math.round(effectiveTotal).toLocaleString()}
                    </div>
                </div>
                {savings > 500 && (
                    <div className="ec-you-save">
                        <div className="ec-you-save-label">YOU SAVE</div>
                        <div className="ec-you-save-amount">~A${Math.round(savings / 100) * 100}</div>
                    </div>
                )}
            </div>

            {/* ══ 8. COLLAPSE ══ */}
            <button className="ec-collapse-btn" onClick={onCollapse}>↑ Collapse</button>

        </div>
    );
}
