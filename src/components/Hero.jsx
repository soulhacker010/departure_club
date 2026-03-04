'use client';

export default function Hero() {
    return (
        <section className="hero">
            <div className="hero-badge">
                <span className="pulse"></span>
                AUSTRALIA → EUROPE
            </div>
            <h1>
                <span className="gradient-text">Reward Flight</span>
                {' '}Search Engine
            </h1>
            <p>
                Search across Qantas, Velocity and partner programs.
                Find direct rewards, connecting flights, or hybrid cash + reward routes.
            </p>
            <div className="stats-bar">
                <div className="stat-item">
                    <div className="stat-value">20+</div>
                    <div className="stat-label">Programs</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">8</div>
                    <div className="stat-label">SEA Hubs</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">6</div>
                    <div className="stat-label">Search Steps</div>
                </div>
            </div>
        </section>
    );
}
