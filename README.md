# ✈️ Departure Club — Reward Flight Search Engine

A powerful flight search tool that finds the best reward and hybrid flight routes from Australia to destinations worldwide — including Europe, USA, South America, Asia, and the Pacific.

Built on the [Seats.aero Partner API](https://seats.aero), it intelligently combines reward seats and cash positioning flights into complete itineraries, scoring and ranking results automatically.

---

## 🚀 What It Does

- 🔍 **Smart multi-step search** — searches up to 10 route variations per query (direct, via SEA hubs, via Pacific hubs, hybrid combinations)
- 🌏 **Global coverage** — Australia to Europe, USA, South America, Asia, Africa
- 💰 **Hybrid routing** — mixes cash legs + reward legs for the best value itineraries
- 📅 **Date range picker** — search across up to 15 days at once
- 🗺️ **Interactive map** — visualise routes on a world map
- 💱 **Currency conversion** — taxes auto-converted to AUD regardless of origin country
- 🎯 **Smart scoring** — routes ranked by value, total points, reward percentage

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | JavaScript (ES Modules) |
| Styling | Vanilla CSS (Dark / Premium theme) |
| Map | [Leaflet.js](https://leafletjs.com) |
| Data | [Seats.aero Partner API](https://seats.aero) |
| Hosting | Vercel (recommended) |

---

## ⚙️ Setup — Step by Step

### 1. Prerequisites

Make sure you have these installed on your computer:

- [Node.js](https://nodejs.org) — version 18 or higher
- [Git](https://git-scm.com)
- A **Seats.aero Partner API key** (you need a paid partner account at [seats.aero](https://seats.aero))

---

### 2. Clone the Repository

```bash
git clone https://github.com/soulhacker010/departure_club.git
cd departureclub
```

---

### 3. Install Dependencies

```bash
cd app
npm install
```

---

### 4. Set Up Environment Variables

Inside the `app/` folder, create a file called `.env.local`:

```bash
# app/.env.local

SEATS_AERO_KEY=your_seats_aero_partner_api_key_here
```

> ⚠️ **Important:** Never commit this file to GitHub. It's already in `.gitignore`.

To get your API key:
1. Sign up at [seats.aero](https://seats.aero)
2. Subscribe to the Partner API plan
3. Copy your key from the dashboard

---

### 5. Run Locally

```bash
npm run dev
```

Then open your browser and go to:
```
http://localhost:3000
```

You should see the full search interface! 🎉

---

## 🌐 Deploy to Vercel (Recommended)

Vercel is the easiest way to host this for free.

### Option A — Via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"New Project"** → import your GitHub repository
3. Set the **Root Directory** to `app`
4. Under **Environment Variables**, add:
   - `SEATS_AERO_KEY` = your API key
5. Click **Deploy** ✅

### Option B — Via CLI

```bash
npm install -g vercel
cd app
vercel --prod
```

Follow the prompts. When asked for environment variables, add `SEATS_AERO_KEY`.

---

## 🗂️ Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── page.js          ← Main search page (UI + results display)
│   │   ├── globals.css      ← All styles (dark premium theme)
│   │   └── api/
│   │       └── search/
│   │           └── route.js ← API endpoint that handles search requests
│   ├── components/
│   │   ├── SearchPanel.jsx  ← The search form (origin, destination, dates, etc.)
│   │   ├── DateRangePicker.jsx ← Single calendar date range picker
│   │   ├── AirportPicker.jsx   ← Airport dropdown with regions
│   │   ├── FilterBar.jsx       ← Sort/filter options
│   │   ├── ResultsList.jsx     ← Sidebar results list
│   │   └── RouteMap.jsx        ← Interactive world map
│   └── lib/
│       ├── cascade.js       ← 🧠 Core search engine (10-step routing logic)
│       ├── airports.js      ← Airport data (200+ airports, regions, coordinates)
│       ├── constants.js     ← Hub definitions (SEA, EUR, Pacific, US hubs)
│       ├── cashEstimate.js  ← Cash fare price + duration estimates
│       ├── currencyConvert.js ← Tax currency conversion to AUD
│       ├── scoring.js       ← Route ranking algorithm
│       ├── cabinRules.js    ← Cabin class logic for positioning
│       ├── seatsAero.js     ← Seats.aero API client
│       └── cache.js         ← In-memory API response caching
```

---

## 🔍 How the Search Engine Works

The search runs up to **10 steps** in sequence, each looking for a different routing pattern:

| Step | Route Pattern | Type |
|------|--------------|------|
| 1 | Origin → Destination (direct) | Reward |
| 2 | Origin → Destination (1-2 stops) | Reward |
| 3 | Origin → SEA Hub → Destination | Reward |
| 4 | Origin → SEA Hub → EUR Hub → Destination | Reward |
| 5 | Origin → SEA Hub (cash) + EUR Hub → Destination | Hybrid |
| 6 | Origin → SEA Hub (cash) + EUR Hub → EUR Hub2 (cash) | Hybrid |
| 7 | EUR Hub → nearby EUR cities (cash last-mile) | Hybrid |
| 8 | Origin → Pacific Hub → USA | Reward |
| 8b | Origin → Pacific Hub (cash) + USA | Hybrid |
| 9 | Origin → SEA Hub → South America / Asia / Africa | Reward |
| 9b | Origin → SEA Hub (cash) + SAM / Asia / Africa | Hybrid |

Results are **deduplicated, ranked by value**, and displayed as visual timeline cards.

---

## 🔧 Configuration

### Supported Reward Programs

| Option | Description |
|--------|-------------|
| `both` | Searches Qantas FF + Velocity (default) |
| `qantas` | Qantas Frequent Flyer only |
| `velocity` | Virgin Australia Velocity only |
| `all` | All programs supported by Seats.aero |

### Search Limits

- **Max date range:** 15 days
- **Max API pages per step:** 5 (up to 2,500 results per step)
- **Cache TTL:** 10 minutes (reduces API calls)

---

## ❓ FAQ

**Q: Why are some cash leg prices estimated?**
A: We estimate cash fare prices using Google Flights formulas because real-time booking data requires the Duffel API (a separate integration). The estimates are close but not exact.

**Q: Cash legs don't show departure/arrival times — why?**
A: Same reason above — without Duffel API, we have no real-time schedule data for cash legs. Reward legs show exact times from the Seats.aero API.

**Q: Why do taxes show in AUD even for flights from Manila or Kuala Lumpur?**
A: We automatically convert taxes from the origin country's currency (PHP, MYR, THB, etc.) to AUD using our built-in currency converter.

**Q: How do I add a new airport?**
A: Add it to `src/lib/airports.js` with its IATA code, name, region, and coordinates. It will automatically appear in the search dropdown.

---

## 📄 License

Private / Proprietary — built for Departure Club.

---

## 🤝 Credits

- Flight availability data: [Seats.aero Partner API](https://seats.aero)
- Maps: [Leaflet.js](https://leafletjs.com) + [OpenStreetMap](https://openstreetmap.org)
- Framework: [Next.js](https://nextjs.org) by Vercel
