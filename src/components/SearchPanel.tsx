// @ts-nocheck
'use client';

import { useState, useMemo } from 'react';
import { getAllAirports } from '@/lib/airports';
import AirportPicker from './AirportPicker';
import DateRangePicker from './DateRangePicker';

export default function SearchPanel({ onSearch, loading }) {
    const allAirports = useMemo(() => getAllAirports(), []);

    const [origin, setOrigin] = useState('SYD');
    const [destination, setDestination] = useState('LHR');
    const [startDate, setStartDate] = useState(getDefaultDate());
    const [endDate, setEndDate] = useState(getDefaultEndDate());
    const [cabin, setCabin] = useState('business');
    const [program, setProgram] = useState('both');
    const [hybridEnabled, setHybridEnabled] = useState(true);
    const [stops, setStops] = useState('any');
    const [passengers, setPassengers] = useState(1);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [constraints, setConstraints] = useState('');

    const [rewardPosCabin, setRewardPosCabin] = useState('auto');
    const [cashPosCabin, setCashPosCabin] = useState('auto');
    const [overnightLayover, setOvernightLayover] = useState(false);

    function getDefaultDate() {
        const d = new Date();
        d.setMonth(d.getMonth() + 2);
        return d.toISOString().split('T')[0];
    }

    function getDefaultEndDate() {
        const d = new Date();
        d.setMonth(d.getMonth() + 2);
        d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    }

    const dateRangeDays = useMemo(() => {
        if (!startDate || !endDate) return 0;
        const s = new Date(startDate);
        const e = new Date(endDate);
        return Math.round((e - s) / (1000 * 60 * 60 * 24));
    }, [startDate, endDate]);

    const dateRangeError = dateRangeDays > 15 ? 'Max 15-day range' : dateRangeDays < 0 ? 'End must be after start' : '';

    function handleSubmit(e) {
        e.preventDefault();
        if (dateRangeError) return;

        const params = {
            origin, destination,
            date: startDate,
            endDate: endDate || undefined,
            cabin, program,
            hybridEnabled, stops, passengers, overnightLayover,
        };

        if (constraints.trim()) params.constraints = constraints.trim();

        if (rewardPosCabin !== 'auto' || cashPosCabin !== 'auto') {
            params.cabinOverrides = {};
            if (rewardPosCabin !== 'auto') params.cabinOverrides.rewardPositioning = [rewardPosCabin];
            if (cashPosCabin !== 'auto') params.cabinOverrides.cashPositioning = [cashPosCabin];
        }

        onSearch(params);
    }

    return (
        <form className="search-panel-container" onSubmit={handleSubmit}>
            {/* Row 1: Airports + Cabin + Search */}
            <div className="search-panel">
                <AirportPicker
                    label="FROM"
                    airports={allAirports}
                    value={origin}
                    onChange={setOrigin}
                />

                <div className="search-divider" />

                <AirportPicker
                    label="TO"
                    airports={allAirports}
                    value={destination}
                    onChange={setDestination}
                />

                <div className="search-divider" />

                <div className="search-group">
                    <label>CABIN</label>
                    <select value={cabin} onChange={e => setCabin(e.target.value)}>
                        <option value="economy">Economy</option>
                        <option value="premium">Premium Econ</option>
                        <option value="business">Business</option>
                        <option value="first">First</option>
                    </select>
                </div>

                <button type="submit" className="search-btn" disabled={loading || !!dateRangeError}>
                    {loading ? '⏳' : '🔍'}
                </button>
            </div>

            {/* Row 2: Dates + Hybrid + Program */}
            <div className="search-panel-row2">
                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartChange={setStartDate}
                    onEndChange={setEndDate}
                    maxDays={15}
                />

                <div className="search-row2-group">
                    <label>HYBRID</label>
                    <select
                        value={hybridEnabled ? 'on' : 'off'}
                        onChange={e => setHybridEnabled(e.target.value === 'on')}
                        className="search-select-sm"
                    >
                        <option value="on">ON</option>
                        <option value="off">OFF</option>
                    </select>
                </div>

                <div className="search-row2-group">
                    <label>PROGRAM</label>
                    <select value={program} onChange={e => setProgram(e.target.value)} className="search-select-sm">
                        <option value="both">Both</option>
                        <option value="qantas">Qantas FF</option>
                        <option value="velocity">Velocity</option>
                        <option value="all">All Programs</option>
                    </select>
                </div>

                <div className="date-range-info">
                    {dateRangeError ? (
                        <span className="date-range-error">⚠ {dateRangeError}</span>
                    ) : (
                        <span className="date-range-ok">📅 {dateRangeDays + 1}-day window</span>
                    )}
                </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="advanced-toggle-row">
                <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? '▲ Less Options' : '▼ More Options'}
                </button>
            </div>

            {showAdvanced && (
                <div className="advanced-options">
                    <div className="advanced-group">
                        <label>Passengers</label>
                        <select value={passengers} onChange={e => setPassengers(Number(e.target.value))}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <div className="advanced-group">
                        <label>Stops</label>
                        <select value={stops} onChange={e => setStops(e.target.value)}>
                            <option value="any">Any</option>
                            <option value="direct">Direct Only</option>
                            <option value="1">Max 1 Stop</option>
                            <option value="2">Max 2 Stops</option>
                        </select>
                    </div>

                    <div className="advanced-group">
                        <label>Reward Positioning Cabin</label>
                        <select value={rewardPosCabin} onChange={e => setRewardPosCabin(e.target.value)}>
                            <option value="auto">Auto (follows rules)</option>
                            <option value="Y">Economy only</option>
                            <option value="W">Premium Economy</option>
                            <option value="J">Business</option>
                            <option value="F">First</option>
                        </select>
                    </div>

                    <div className="advanced-group">
                        <label>Cash Positioning Cabin</label>
                        <select value={cashPosCabin} onChange={e => setCashPosCabin(e.target.value)}>
                            <option value="auto">Auto (Economy default)</option>
                            <option value="Y">Economy only</option>
                            <option value="W">Premium Economy</option>
                            <option value="J">Business</option>
                        </select>
                    </div>

                    <div className="advanced-group">
                        <label>Overnight Layover</label>
                        <div className="overnight-toggle-row">
                            <button
                                type="button"
                                className={`overnight-toggle-btn ${overnightLayover ? 'overnight-on' : ''}`}
                                onClick={() => setOvernightLayover(!overnightLayover)}
                            >
                                {overnightLayover ? '✓ On' : 'Off'}
                            </button>
                            <span className="overnight-hint">
                                {overnightLayover ? 'Up to 36h layovers allowed' : 'Max 8h layovers (default)'}
                            </span>
                        </div>
                    </div>

                    <div className="advanced-group constraints-group">
                        <label>Constraints</label>
                        <input
                            type="text"
                            value={constraints}
                            onChange={e => setConstraints(e.target.value)}
                            placeholder="e.g. No Qatar Airways, avoid Dubai layover"
                            className="constraints-input"
                        />
                    </div>
                </div>
            )}
        </form>
    );
}
