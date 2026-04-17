# 🏡 Airbnb Algeria Scraper

A robust Node.js scraper for **ar.airbnb.com** focused on Algerian cities using **Playwright** and the `__NEXT_DATA__` extraction strategy.

## Target Cities
- Algiers, Oran, Constantine, Djelfa
- Annaba, Bejaia, Tlemcen, Ghardaia

## Features
- **Stealth mode**: Random User-Agent rotation + anti-detection flags
- **`__NEXT_DATA__` strategy**: No button clicking – extracts structured JSON directly
- **De-duplication**: Skips already-scraped listings based on Airbnb ID
- **Image downloading**: Saves all high-res images locally
- **Crash-safe**: Saves `data.json` after every successful scrape
- **Error-resilient**: Logs failures but continues scraping

## Setup

```bash
# Install dependencies
npm install

# Install Chromium browser (required by Playwright)
npm run install-browsers
```

## Usage

```bash
npm start
```

## Output Structure

```
scraped_data/
├── data.json                # All scraped listing data
└── images/
    ├── apt_12345_1.jpg
    ├── apt_12345_2.jpg
    └── ...
```

### data.json Schema

```json
[
  {
    "id": "12345",
    "title": "Listing title",
    "description": "Original description",
    "price": "5,000 د.ج / ليلة",
    "rating": 4.85,
    "beds": "3 أسرّة",
    "bathrooms": "2 حمام",
    "images": ["apt_12345_1.jpg", "apt_12345_2.jpg"]
  }
]
```

## Configuration

Edit the constants at the top of `scraper.js`:

| Variable | Default | Description |
|---|---|---|
| `DELAY_MIN_MS` | 2000 | Minimum delay between requests (ms) |
| `DELAY_MAX_MS` | 5000 | Maximum delay between requests (ms) |
| `MAX_PAGES_PER_CITY` | 15 | Max search result pages per city |
| `headless` | `true` | Set to `false` to watch the browser |

## Re-running

The scraper is **idempotent** – re-runs will skip already-scraped listings. Just run `npm start` again to pick up new listings.
