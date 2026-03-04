'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Single-calendar date range picker.
 * Click once for start date, click again for end date.
 * Max 15-day range enforced.
 */
export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, maxDays = 15 }) {
    const [open, setOpen] = useState(false);
    const [selecting, setSelecting] = useState('start'); // 'start' or 'end'
    const [viewMonth, setViewMonth] = useState(() => {
        const d = startDate ? new Date(startDate) : new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [hoverDate, setHoverDate] = useState(null);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Format display
    const displayText = useMemo(() => {
        if (!startDate && !endDate) return 'Select dates';
        const fmt = (d) => {
            if (!d) return '...';
            const dt = new Date(d);
            return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()].slice(0, 3)}`;
        };
        if (startDate && endDate && startDate !== endDate) {
            return `${fmt(startDate)} — ${fmt(endDate)}`;
        }
        return fmt(startDate || endDate);
    }, [startDate, endDate]);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const { year, month } = viewMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Empty slots before first day
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(new Date(year, month, d));
        }
        return days;
    }, [viewMonth]);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    function toDateStr(date) {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function handleDayClick(date) {
        if (!date || date < today) return;

        const dateStr = toDateStr(date);

        if (selecting === 'start') {
            onStartChange(dateStr);
            // If current end date is before new start, clear it
            if (endDate && new Date(endDate) < date) {
                onEndChange('');
            }
            setSelecting('end');
        } else {
            // selecting === 'end'
            if (new Date(startDate) > date) {
                // Clicked before start — reset start
                onStartChange(dateStr);
                onEndChange('');
                setSelecting('end');
            } else {
                // Check max range
                const diffDays = Math.round((date - new Date(startDate)) / (1000 * 60 * 60 * 24));
                if (diffDays > maxDays) return; // Too wide
                onEndChange(dateStr);
                setSelecting('start');
                setOpen(false); // Auto-close after range selected
            }
        }
    }

    function isInRange(date) {
        if (!date || !startDate) return false;
        const s = new Date(startDate);
        const end = hoverDate && selecting === 'end' ? hoverDate : (endDate ? new Date(endDate) : null);
        if (!end) return false;
        return date >= s && date <= end;
    }

    function isStart(date) {
        if (!date || !startDate) return false;
        return toDateStr(date) === startDate;
    }

    function isEnd(date) {
        if (!date || !endDate) return false;
        return toDateStr(date) === endDate;
    }

    function prevMonth() {
        setViewMonth(prev => {
            const m = prev.month - 1;
            return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
        });
    }

    function nextMonth() {
        setViewMonth(prev => {
            const m = prev.month + 1;
            return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
        });
    }

    function handleClear() {
        onStartChange('');
        onEndChange('');
        setSelecting('start');
    }

    return (
        <div className="drp-container" ref={containerRef}>
            <label>DATES</label>
            <div
                className="drp-trigger"
                onClick={() => setOpen(!open)}
            >
                <span className="drp-icon">📅</span>
                <span className="drp-text">{displayText}</span>
                <span className="drp-arrow">▾</span>
            </div>

            {open && (
                <div className="drp-dropdown">
                    <div className="drp-header">
                        <button type="button" className="drp-nav" onClick={prevMonth}>‹</button>
                        <span className="drp-month-label">
                            {MONTH_NAMES[viewMonth.month]}, {viewMonth.year}
                        </span>
                        <button type="button" className="drp-nav" onClick={nextMonth}>›</button>
                    </div>

                    <div className="drp-day-names">
                        {DAY_NAMES.map(d => <span key={d} className="drp-day-name">{d}</span>)}
                    </div>

                    <div className="drp-grid">
                        {calendarDays.map((date, i) => {
                            if (!date) return <span key={`empty-${i}`} className="drp-cell drp-empty" />;

                            const isPast = date < today;
                            const inRange = isInRange(date);
                            const start = isStart(date);
                            const end = isEnd(date);

                            let cls = 'drp-cell';
                            if (isPast) cls += ' drp-past';
                            if (start) cls += ' drp-start';
                            if (end) cls += ' drp-end';
                            if (inRange && !start && !end) cls += ' drp-in-range';
                            if (toDateStr(date) === toDateStr(today)) cls += ' drp-today';

                            return (
                                <span
                                    key={toDateStr(date)}
                                    className={cls}
                                    onClick={() => handleDayClick(date)}
                                    onMouseEnter={() => !isPast && setHoverDate(date)}
                                    onMouseLeave={() => setHoverDate(null)}
                                >
                                    {date.getDate()}
                                </span>
                            );
                        })}
                    </div>

                    <div className="drp-footer">
                        <span className="drp-hint">
                            {selecting === 'start' ? 'Select start date' : 'Select end date'}
                            {startDate && endDate && ` · ${Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1} days`}
                        </span>
                        <button type="button" className="drp-clear" onClick={handleClear}>Clear</button>
                    </div>
                </div>
            )}
        </div>
    );
}
