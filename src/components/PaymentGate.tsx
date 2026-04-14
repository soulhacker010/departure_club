// @ts-nocheck
'use client';

import { useState } from 'react';

export default function PaymentGate() {
    const [selected, setSelected] = useState('annual');

    function handleSubscribe() {
        // TODO: create Stripe checkout session for selected plan
        // Stripe keys not yet configured — placeholder
        window.location.href = '/plans';
    }

    return (
        <div className="gate-overlay">
            <div className="gate-modal">

                <div className="gate-icon">🔒</div>
                <h2 className="gate-heading">Complete your subscription</h2>
                <p className="gate-sub">
                    You have an account but no active subscription.
                    Pick a plan to unlock full access.
                </p>

                <div className="gate-plans">

                    {/* Annual */}
                    <button
                        type="button"
                        className={`gate-plan ${selected === 'annual' ? 'gate-plan-active' : ''}`}
                        onClick={() => setSelected('annual')}
                    >
                        <div className="gate-plan-top">
                            <span className="gate-plan-name">Annual</span>
                            <span className="gate-plan-save">30% off</span>
                        </div>
                        <div className="gate-plan-price">
                            $500<span className="gate-plan-period">/yr</span>
                        </div>
                        <div className="gate-plan-hint">~$41/month · best value</div>
                        <ul className="gate-plan-features">
                            <li>AI reward seat finder</li>
                            <li>Live seat alerts</li>
                            <li>Hybrid fare combinations</li>
                            <li>Multi-airline scanning</li>
                            <li>Community + daily deals</li>
                        </ul>
                        <div className={`gate-check ${selected === 'annual' ? 'gate-check-on' : ''}`}>
                            {selected === 'annual' ? '✓' : ''}
                        </div>
                    </button>

                    {/* Monthly */}
                    <button
                        type="button"
                        className={`gate-plan ${selected === 'monthly' ? 'gate-plan-active' : ''}`}
                        onClick={() => setSelected('monthly')}
                    >
                        <div className="gate-plan-top">
                            <span className="gate-plan-name">Monthly</span>
                        </div>
                        <div className="gate-plan-price">
                            $49<span className="gate-plan-period">/mo</span>
                        </div>
                        <div className="gate-plan-hint">billed monthly</div>
                        <ul className="gate-plan-features">
                            <li>AI reward seat finder</li>
                            <li>Live seat alerts</li>
                            <li>Community + daily deals</li>
                        </ul>
                        <div className={`gate-check ${selected === 'monthly' ? 'gate-check-on' : ''}`}>
                            {selected === 'monthly' ? '✓' : ''}
                        </div>
                    </button>

                </div>

                <button className="gate-pay-btn" onClick={handleSubscribe}>
                    Subscribe — {selected === 'annual' ? '$500/year' : '$49/month'}
                </button>

                <p className="gate-footer">
                    🔒 Secure payment via Stripe · Cancel anytime ·{' '}
                    <a href="/login">Sign out</a>
                </p>

            </div>
        </div>
    );
}
