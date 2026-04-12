// @ts-nocheck
import './globals.css';

export const metadata = {
    title: 'Departure Club — Hybrid Cash + Reward Flight Search',
    description: 'Find the best reward and hybrid flight routes from Australia to Europe. Search across multiple frequent flyer programs with intelligent route optimization.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
