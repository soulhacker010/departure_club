// @ts-nocheck
'use client';

export default function Navbar() {
    return (
        <nav className="navbar">
            <a href="/" className="logo">
                <img src="/logo-white.webp" alt="Departure Club" className="logo-img" />
            </a>
            <div className="nav-links">
                <button className="nav-pill active">Search</button>
                <button className="nav-pill">How It Works</button>
                <button className="nav-badge">
                    <span className="pulse"></span>
                    Live Availability
                </button>
            </div>
        </nav>
    );
}
