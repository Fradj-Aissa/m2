/**
 * ============================================================
 *  Airbnb Algeria Scraper
 *  Strategy: __NEXT_DATA__ JSON extraction via Playwright
 *  Cities: Algiers, Oran, Constantine, Djelfa, Annaba,
 *          Bejaia, Tlemcen, Ghardaia
 * ============================================================
 */

const { chromium } = require("playwright");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const randomUseragent = require("random-useragent");

// ─── Configuration ──────────────────────────────────────────
const TARGET_CITIES = [
    { name: "Algiers", query: "Algiers--Algeria" },
    { name: "Oran", query: "Oran--Algeria" },
    { name: "Constantine", query: "Constantine--Algeria" },
    { name: "Djelfa", query: "Djelfa--Algeria" },
    { name: "Annaba", query: "Annaba--Algeria" },
    { name: "Bejaia", query: "Béjaïa--Algeria" },
    { name: "Tlemcen", query: "Tlemcen--Algeria" },
    { name: "Ghardaia", query: "Ghardaïa--Algeria" },
];

const BASE_URL = "https://ar.airbnb.com";
const DATA_DIR = path.join(__dirname, "scraped_data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const DATA_FILE = path.join(DATA_DIR, "data.json");

const DELAY_MIN_MS = 2000;
const DELAY_MAX_MS = 5000;
const MAX_PAGES_PER_CITY = 15; // pagination safety cap

// ─── Helpers ────────────────────────────────────────────────

/** Sleep for a random duration between min and max (ms) */
function randomDelay(min = DELAY_MIN_MS, max = DELAY_MAX_MS) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`   ⏳ Waiting ${ms}ms ...`);
    return new Promise((r) => setTimeout(r, ms));
}

/** Ensure required directories exist */
function ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/** Load existing scraped data (for de-duplication) */
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const raw = fs.readFileSync(DATA_FILE, "utf-8");
            return JSON.parse(raw);
        } catch {
            console.warn("⚠️  Could not parse existing data.json – starting fresh.");
        }
    }
    return [];
}

/** Persist data array to disk */
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/** Extract the numeric Airbnb ID from a listing URL */
function extractListingId(url) {
    const match = url.match(/\/rooms\/(\d+)/);
    return match ? match[1] : null;
}

/** Build a Set of already-scraped IDs for O(1) lookups */
function buildIdSet(data) {
    return new Set(data.map((d) => d.id));
}

/** Download a single image, return local filename or null */
async function downloadImage(url, listingId, index) {
    const filename = `apt_${listingId}_${index}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Skip if already downloaded
    if (fs.existsSync(filepath)) return filename;

    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                "User-Agent": randomUseragent.getRandom(),
                Referer: BASE_URL,
            },
        });
        fs.writeFileSync(filepath, response.data);
        return filename;
    } catch (err) {
        console.error(`   ❌ Image download failed (${filename}): ${err.message}`);
        return null;
    }
}

// ─── __NEXT_DATA__ Parsing ──────────────────────────────────

/**
 * Deep-search a nested object for a key.
 * Returns the first value found or undefined.
 */
function deepFind(obj, targetKey) {
    if (!obj || typeof obj !== "object") return undefined;
    if (targetKey in obj) return obj[targetKey];
    for (const key of Object.keys(obj)) {
        const result = deepFind(obj[key], targetKey);
        if (result !== undefined) return result;
    }
    return undefined;
}

/**
 * Collect ALL values for a given key throughout a nested object.
 * Useful when `deepFind` returns a wrong match (e.g. "title" → "treatment").
 */
function deepFindAll(obj, targetKey, results = []) {
    if (!obj || typeof obj !== "object") return results;
    if (targetKey in obj) results.push(obj[targetKey]);
    for (const key of Object.keys(obj)) {
        deepFindAll(obj[key], targetKey, results);
    }
    return results;
}

/**
 * Try to parse a stringified description object and extract the clean text.
 * Handles the GraphQL DemandStayListingDescription shape.
 */
function cleanDescription(rawDesc) {
    if (!rawDesc || rawDesc === "N/A") return "N/A";

    // If it's already a clean string (no JSON), return it
    if (typeof rawDesc === "string" && !rawDesc.includes("__typename")) return rawDesc;

    try {
        const parsed = typeof rawDesc === "string" ? JSON.parse(rawDesc) : rawDesc;

        // Shape: { summary: { localizedString: "..." }, name: { localizedString: "..." } }
        const summary =
            parsed?.summary?.localizedString ||
            parsed?.description?.localizedString ||
            parsed?.localizedString ||
            null;

        if (summary) return summary;

        // Fallback: stringify and strip __typename keys
        const flat = JSON.stringify(parsed);
        const stripped = flat.replace(/"__typename":"[^"]*",?/g, "");
        return stripped;
    } catch {
        // Not valid JSON, return as-is
        return typeof rawDesc === "string" ? rawDesc : JSON.stringify(rawDesc);
    }
}

/**
 * Pick the best title from all "title" values found in __NEXT_DATA__.
 * Skips generic strings like "treatment", "Airbnb", single words < 3 chars, etc.
 */
function pickBestTitle(allTitles) {
    const blacklist = ["treatment", "airbnb", "null", "undefined", ""];
    const candidates = allTitles
        .filter((t) => typeof t === "string" && t.length > 2)
        .filter((t) => !blacklist.includes(t.toLowerCase().trim()));

    // Prefer longer, more descriptive titles
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
}

/**
 * Extract listing data from the __NEXT_DATA__ JSON blob.
 * Uses a combination of deep-find + smart filtering to avoid
 * generic/wrong matches like "treatment" for title.
 */
function parseNextData(nextData, listingId) {
    try {
        const raw = JSON.stringify(nextData);

        // --- Title (from JSON, used as fallback) ---
        const allTitles = deepFindAll(nextData, "title");
        const allNames = deepFindAll(nextData, "name");
        // Also check localizedString inside name objects
        const nameStrings = allNames
            .filter((n) => n && typeof n === "object" && n.localizedString)
            .map((n) => n.localizedString);
        const titleFromJson = pickBestTitle([...allTitles, ...nameStrings]) || "N/A";

        // --- Description (from JSON, cleaned) ---
        const rawDescription =
            deepFind(nextData, "description") ||
            deepFind(nextData, "sectioned_description")?.description ||
            deepFind(nextData, "htmlDescription")?.htmlText ||
            "N/A";
        const descriptionFromJson = cleanDescription(rawDescription);

        // --- Price (from JSON) ---
        let priceFromJson = "N/A";
        const priceObj =
            deepFind(nextData, "structuredDisplayPrice") ||
            deepFind(nextData, "price");
        if (priceObj) {
            priceFromJson =
                priceObj.primaryLine?.price ||
                priceObj.primaryLine?.discountedPrice ||
                priceObj.price ||
                priceObj.rate?.amount ||
                (typeof priceObj === "string" ? priceObj : "N/A");
        }

        // --- Rating (from JSON) ---
        const ratingFromJson =
            deepFind(nextData, "avgRating") ||
            deepFind(nextData, "guestSatisfactionOverall") ||
            deepFind(nextData, "reviewsModule")?.avgRating ||
            deepFind(nextData, "overallRating") ||
            deepFind(nextData, "overallGuestRating") ||
            "N/A";

        // --- Review count (from JSON) ---
        const reviewCountFromJson =
            deepFind(nextData, "reviewCount") ||
            deepFind(nextData, "visibleReviewCount") ||
            deepFind(nextData, "reviewsCount") ||
            "N/A";

        // --- Room details (from JSON) ---
        let beds = "N/A";
        let bedrooms = "N/A";
        let bathrooms = "N/A";
        let guests = "N/A";

        // Strategy 1: overview items array
        const overview = deepFind(nextData, "listingInfoOverview");
        if (Array.isArray(overview)) {
            for (const item of overview) {
                const label = (item.label || item.title || "").toLowerCase();
                if (/bed(?!room)|سرير|أسر/.test(label)) beds = item.label || item.title;
                if (/bedroom|غرفة.?نوم/.test(label)) bedrooms = item.label || item.title;
                if (/bath|حمّام|حمام/.test(label)) bathrooms = item.label || item.title;
                if (/guest|ضيف/.test(label)) guests = item.label || item.title;
            }
        }

        // Strategy 2: overview items within sections
        const overviewSections =
            deepFind(nextData, "overviewItems") ||
            deepFind(nextData, "detailItems") ||
            [];
        if (Array.isArray(overviewSections) && beds === "N/A") {
            for (const item of overviewSections) {
                const label = (item.title || item.label || item.value || "").toLowerCase();
                if (/bed(?!room)|سرير|أسر/.test(label) && beds === "N/A") beds = item.title || item.label || item.value;
                if (/bedroom|غرفة.?نوم/.test(label) && bedrooms === "N/A") bedrooms = item.title || item.label || item.value;
                if (/bath|حمّام|حمام/.test(label) && bathrooms === "N/A") bathrooms = item.title || item.label || item.value;
                if (/guest|ضيف/.test(label) && guests === "N/A") guests = item.title || item.label || item.value;
            }
        }

        // Fallback: individual fields
        if (beds === "N/A") beds = deepFind(nextData, "bedCount") || deepFind(nextData, "beds") || "N/A";
        if (bedrooms === "N/A") bedrooms = deepFind(nextData, "bedroomCount") || deepFind(nextData, "bedrooms") || "N/A";
        if (bathrooms === "N/A") bathrooms = deepFind(nextData, "bathroomCount") || deepFind(nextData, "bathrooms") || "N/A";
        if (guests === "N/A") guests = deepFind(nextData, "personCapacity") || deepFind(nextData, "guestCapacity") || "N/A";

        // --- Coordinates (from JSON via regex on raw string) ---
        let lat = null;
        let lng = null;
        const latMatch = raw.match(/"lat"\s*:\s*(-?\d+\.\d+)/);
        const lngMatch = raw.match(/"lng"\s*:\s*(-?\d+\.\d+)/);
        if (latMatch) lat = parseFloat(latMatch[1]);
        if (lngMatch) lng = parseFloat(lngMatch[1]);

        // --- Images ---
        let imageUrls = [];

        // Strategy 1: photoTour / photos array
        const photos =
            deepFind(nextData, "photos") ||
            deepFind(nextData, "photoTour")?.images ||
            [];
        if (Array.isArray(photos)) {
            imageUrls = photos
                .map((p) => {
                    if (typeof p === "string") return p;
                    return (
                        p.baseUrl ||
                        p.large ||
                        p.pictureUrl ||
                        p.url ||
                        p.picture ||
                        null
                    );
                })
                .filter(Boolean);
        }

        // Strategy 2: scan raw JSON for high-res image URLs
        if (imageUrls.length === 0) {
            const urlRegex = /https:\/\/a0\.muscache\.com\/im\/pictures\/[^"\\]+/g;
            const matches = raw.match(urlRegex) || [];
            imageUrls = [...new Set(matches)];
        }

        return {
            id: listingId,
            titleFromJson,
            descriptionFromJson,
            priceFromJson: typeof priceFromJson === "string" ? priceFromJson : String(priceFromJson),
            ratingFromJson,
            reviewCountFromJson,
            beds,
            bedrooms,
            bathrooms,
            guests,
            lat,
            lng,
            images: [],
            imageUrls,
        };
    } catch (err) {
        console.error(`   ❌ Parse error for listing ${listingId}: ${err.message}`);
        return null;
    }
}

// ─── Scraping Logic ─────────────────────────────────────────

/**
 * Collect listing URLs from a city search results page.
 * Handles pagination by following "Next" buttons.
 */
async function collectListingUrls(page, city) {
    const urls = new Set();
    const searchUrl = `${BASE_URL}/s/${encodeURIComponent(city.query)}/homes`;

    console.log(`\n🔍 Searching: ${city.name} → ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await randomDelay(5000, 8000); // Give it a bit more time for the UI to settle

    for (let pageNum = 1; pageNum <= MAX_PAGES_PER_CITY; pageNum++) {
        console.log(`   📄 Page ${pageNum} – extracting links ...`);

        // Strategy 1: Simple links
        let links = await page.$$eval('a[href*="/rooms/"]', (anchors) =>
            anchors.map((a) => a.href)
        );

        // Strategy 2: Listing card specific selectors if Strategy 1 found nothing
        if (links.length === 0) {
            links = await page.$$eval('[data-testid="listing-card-title"]', (els) => {
                // look for parent links
                return els.map(el => {
                    const a = el.closest('a');
                    return a ? a.href : null;
                }).filter(Boolean);
            });
        }

        for (const link of links) {
            try {
                const url = new URL(link);
                // Normalize: keep only the /rooms/{id} path
                const cleanUrl = `${url.origin}${url.pathname}`;
                if (/\/rooms\/\d+/.test(cleanUrl)) {
                    urls.add(cleanUrl);
                }
            } catch {
                // ignore malformed URLs
            }
        }

        console.log(`   ✅ Total unique listing URLs so far: ${urls.size}`);

        // Try to go to the next page
        const nextButton = await page.$(
            'a[aria-label="التالي"], a[aria-label="Next"], nav[aria-label*="pagination"] a:last-child'
        );
        if (!nextButton) {
            console.log(`   🛑 No more pages for ${city.name}.`);
            break;
        }

        try {
            await nextButton.click();
            await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
            await randomDelay(2000, 4000);
        } catch {
            console.log(`   🛑 Pagination ended for ${city.name}.`);
            break;
        }
    }

    return [...urls];
}

/**
 * Extract text data directly from the rendered DOM.
 * This is more reliable than __NEXT_DATA__ for visible text content.
 */
async function extractFromDOM(page) {
    return await page.evaluate(() => {
        const result = {
            title: null,
            description: null,
            price: null,
            rating: null,
            reviewCount: null,
            neighborhood: null,
            beds: null,
            bedrooms: null,
            bathrooms: null,
            guests: null,
        };

        // --- Title: h1 element ---
        const h1 = document.querySelector("h1");
        if (h1) result.title = h1.textContent.trim();

        // --- Description: meta tag ---
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) result.description = metaDesc.getAttribute("content");

        // --- Price: look for spans with currency indicators ---
        // We look for specific price blocks or general text
        const allText = document.body.innerText || "";
        const pricePatterns = [
            /([\d.,\s]+)\s*(?:DZD|د\.ج\.?|دج|Dinar|DA)/i,
            /(?:DZD|د\.ج\.?|دج|DA)\s*([\d.,\s]+)/i,
            /\$[\s\d.,]+/,
            /€[\s\d.,]+/,
            /[\d.,]+\s*\$/,
            /[\d.,]+\s*€/,
        ];

        const priceSpans = document.querySelectorAll(
            'span[class*="price"], span[class*="Price"], span[class*="_1y74zjx"], span[class*="_tyxjp1"], div[data-testid*="price"] span'
        );
        let priceText = "";
        for (const span of priceSpans) {
            const t = span.textContent.trim();
            if (/\d/.test(t) && /DZD|د\.ج|دج|Dinar|DA|\$|€/i.test(t)) {
                priceText = t;
                break;
            }
        }

        // If no specific price container found, search broader page text
        if (!priceText) {
            for (const pattern of pricePatterns) {
                const m = allText.match(pattern);
                if (m) {
                    priceText = m[0];
                    break;
                }
            }
        }
        if (priceText) result.price = priceText.trim();

        // --- Rating & Reviews from the header area ---
        // Airbnb typically renders something like "★ 4.85 · 47 تقييم" or "4.85 (47 reviews)"
        const ratingPatterns = [
            /(\d+[.,]\d+)\s*[·•]\s*(\d+)\s*(?:تقييم|مراجعة|reviews?|avis)/i,
            /★\s*(\d+[.,]\d+)/,
            /(\d+[.,]\d+)\s*★/,
        ];

        // Search in header/subtitle area first
        const headerArea = document.querySelector('h1')?.parentElement?.parentElement || document.querySelector('[data-section-id="TITLE_DEFAULT"]');
        const searchText = headerArea ? headerArea.textContent : allText;

        for (const pattern of ratingPatterns) {
            const m = searchText.match(pattern);
            if (m) {
                result.rating = parseFloat(m[1].replace(",", "."));
                if (m[2]) result.reviewCount = parseInt(m[2], 10);
                break;
            }
        }

        // Fallback: look for specific rating elements globally
        if (!result.rating) {
            for (const pattern of ratingPatterns) {
                const globalMatch = allText.match(pattern);
                if (globalMatch) {
                    result.rating = parseFloat(globalMatch[1].replace(",", "."));
                    if (globalMatch[2]) result.reviewCount = parseInt(globalMatch[2], 10);
                    break;
                }
            }
        }

        // Fallback: look for specific rating elements
        if (!result.rating) {
            const ratingEl = document.querySelector(
                '[class*="rating"], [data-testid*="rating"], [aria-label*="rating"], [aria-label*="تقييم"]'
            );
            if (ratingEl) {
                const rText = ratingEl.textContent || ratingEl.getAttribute("aria-label") || "";
                const rMatch = rText.match(/(\d+[.,]\d+)/);
                if (rMatch) result.rating = parseFloat(rMatch[1].replace(",", "."));
            }
        }

        // --- Neighborhood / Location from breadcrumbs or subtitle ---
        const breadcrumb = document.querySelector('nav[aria-label*="breadcrumb"], nav[aria-label*="مسار"], nav ol, nav ul');
        if (breadcrumb) {
            const crumbs = Array.from(breadcrumb.querySelectorAll("li, a, span"))
                .map((el) => el.textContent.trim())
                .filter((t) => t.length > 1 && !t.includes(">") && !t.includes("Airbnb"));
            result.neighborhood = crumbs.length > 0 ? crumbs[crumbs.length - 1] : null;
        }
        // Also try subtitle below h1
        if (!result.neighborhood) {
            const h1Element = document.querySelector("h1");
            if (h1Element && h1Element.nextElementSibling) {
                const subText = h1Element.nextElementSibling.textContent.trim();
                // If it looks like "Oran, Algeria" or similar
                if (subText.length > 2 && subText.length < 100) {
                    result.neighborhood = subText.split('·')[0].trim();
                }
            }
        }

        // --- Room details from the details/overview section ---
        const detailStrings = [];
        const detailEls = document.querySelectorAll(
            '[data-section-id="OVERVIEW_DEFAULT"] li, [data-section-id="OVERVIEW_DEFAULT"] span, [class*="overview"] li, [class*="overview"] span, ._1tanv1h'
        );
        for (const el of detailEls) {
            detailStrings.push(el.textContent.trim().toLowerCase());
        }
        // Also add the overview text as a whole
        const overviewSection = document.querySelector('[data-section-id="OVERVIEW_DEFAULT"]');
        if (overviewSection) detailStrings.push(overviewSection.textContent.toLowerCase());

        // As a last fallback, search titles of all `li` components on the page
        const allLis = document.querySelectorAll('li');
        for (const li of allLis) detailStrings.push(li.textContent.toLowerCase());

        for (const text of detailStrings) {
            // Beds (Arabic: سرير / أسرة)
            if (!result.beds && ((/bed(?!room)/i.test(text)) || /سرير|أسر/.test(text))) {
                const bedMatch = text.match(/(\d+)/);
                if (bedMatch) result.beds = parseInt(bedMatch[1], 10);
            }
            // Bedrooms (Arabic: غرفة نوم / غرف نوم)
            if (!result.bedrooms && (/bedroom/i.test(text) || /غرف.?.?نوم/.test(text) || /chambre/.test(text))) {
                const brMatch = text.match(/(\d+)/);
                if (brMatch) result.bedrooms = parseInt(brMatch[1], 10);
            }
            // Bathrooms (Arabic: حمّام / حمامات)
            if (!result.bathrooms && (/bath/i.test(text) || /حمّام|حمام|حمامات/.test(text) || /salle de bain/.test(text))) {
                const baMatch = text.match(/(\d+)/);
                if (baMatch) result.bathrooms = parseInt(baMatch[1], 10);
            }
            // Guests
            if (!result.guests && (/guest/i.test(text) || /ضيف|ضيوف|أشخاص/.test(text) || /voyageur/.test(text))) {
                const gMatch = text.match(/(\d+)/);
                if (gMatch) result.guests = parseInt(gMatch[1], 10);
            }
        }

        return result;
    });
}

/**
 * Append Check-in, Check-out dates and guests=1 to the URL.
 * This triggers Airbnb to show the price in the DOM.
 */
function addDatesToUrl(baseUrl) {
    try {
        const urlObj = new URL(baseUrl);
        const today = new Date();

        // Check-in: 7 days from now
        const checkInDate = new Date(today);
        checkInDate.setDate(today.getDate() + 7);

        // Check-out: 8 days from now
        const checkOutDate = new Date(today);
        checkOutDate.setDate(today.getDate() + 8);

        const formatDate = (date) => date.toISOString().split('T')[0];

        urlObj.searchParams.set('check_in', formatDate(checkInDate));
        urlObj.searchParams.set('check_out', formatDate(checkOutDate));
        urlObj.searchParams.set('adults', '1');

        return urlObj.toString();
    } catch {
        return baseUrl;
    }
}

/**
 * Scrape a single listing page.
 * Hybrid approach: DOM extraction + __NEXT_DATA__ JSON as fallback.
 */
async function scrapeListing(page, url, existingIds, cityName) {
    const listingId = extractListingId(url);
    if (!listingId) {
        console.log(`   ⚠️  Could not extract ID from: ${url}`);
        return null;
    }

    // De-duplication check
    if (existingIds.has(listingId)) {
        console.log(`   ⏭️  Skipping (already scraped): ${listingId}`);
        return null;
    }

    console.log(`\n🏠 Scraping listing: ${listingId} → ${url}`);

    try {
        const urlWithDates = addDatesToUrl(url);
        console.log(`   🔗 Loading URL (with dates to show price): ${urlWithDates}`);
        await page.goto(urlWithDates, { waitUntil: "domcontentloaded", timeout: 90000 });

        // Human-like action: scroll to trigger hydration/lazy-loading
        await page.evaluate(() => window.scrollBy(0, 500));
        await randomDelay(3000, 5000);
        await page.evaluate(() => window.scrollBy(0, 500));
        await randomDelay(2000, 3000); // Give extra time for price element to render

        // ── Step 1: Extract from DOM ────────────────────────
        const domData = await extractFromDOM(page);
        console.log(`   🔍 DOM title: "${domData.title || "—"}"  |  price: ${domData.price || "—"}  |  rating: ${domData.rating || "—"}`);

        // ── Step 2: Extract __NEXT_DATA__ JSON ──────────────
        let nextDataRaw = null;

        const selectors = ['script#__NEXT_DATA__', 'script[id="__NEXT_DATA__"]', 'script#data-state', 'script#booking-data-bootstrapper', 'script#niobe-minimal-client-data-core'];
        for (const selector of selectors) {
            try {
                nextDataRaw = await page.$eval(selector, (el) => el.textContent);
                if (nextDataRaw && nextDataRaw.trim().startsWith('{')) break;
            } catch (e) { /* continue */ }
        }

        if (!nextDataRaw) {
            nextDataRaw = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const target = scripts.find(s => {
                    const text = s.textContent || "";
                    return text.includes('niobeMinimalClientData') ||
                        text.includes('niobeMinimalClientStore') ||
                        text.includes('bootstrapData') ||
                        (text.includes('"pageProps"') && text.includes('"listingId"'));
                });
                if (target) return target.textContent;

                const jsonScripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
                const targetJson = jsonScripts.find(s => s.textContent.includes('listingId') || s.textContent.includes('niobe'));
                return targetJson ? targetJson.textContent : null;
            });
        }

        // Parse __NEXT_DATA__
        let jsonData = null;
        if (nextDataRaw) {
            try {
                const nextData = JSON.parse(nextDataRaw);
                jsonData = parseNextData(nextData, listingId);
            } catch (err) {
                console.log(`   ⚠️  Failed to parse __NEXT_DATA__: ${err.message}`);
            }
        } else {
            console.log(`   ⚠️  No __NEXT_DATA__ script found for ${listingId}.`);
        }

        // ── Step 3: Extract coordinates from full page source ──
        let lat = jsonData?.lat || null;
        let lng = jsonData?.lng || null;
        if (!lat || !lng) {
            try {
                const pageSource = await page.content();
                const latMatch = pageSource.match(/"lat"\s*:\s*(-?\d+\.\d+)/);
                const lngMatch = pageSource.match(/"lng"\s*:\s*(-?\d+\.\d+)/);
                if (latMatch) lat = parseFloat(latMatch[1]);
                if (lngMatch) lng = parseFloat(lngMatch[1]);
            } catch (err) {
                console.log(`   ⚠️  Could not extract coordinates: ${err.message}`);
            }
        }

        // ── Step 4: Merge DOM + JSON data (DOM takes priority for text) ──
        const title = domData.title || jsonData?.titleFromJson || "N/A";
        const description = domData.description || jsonData?.descriptionFromJson || "N/A";
        const price = domData.price || jsonData?.priceFromJson || "N/A";
        const rating = domData.rating || jsonData?.ratingFromJson || "N/A";
        const reviewCount = domData.reviewCount || jsonData?.reviewCountFromJson || "N/A";
        const beds = domData.beds || jsonData?.beds || "N/A";
        const bedrooms = domData.bedrooms || jsonData?.bedrooms || "N/A";
        const bathrooms = domData.bathrooms || jsonData?.bathrooms || "N/A";
        const guests = domData.guests || jsonData?.guests || "N/A";

        const listing = {
            id: listingId,
            title,
            description,
            price,
            rating,
            reviewCount,
            beds,
            bedrooms,
            bathrooms,
            guests,
            wilaya: cityName || "N/A",
            neighborhood: domData.neighborhood || "N/A",
            lat: lat || "N/A",
            lng: lng || "N/A",
            url,
            images: [],
        };

        // ── Step 5: Download images ──
        const imageUrls = jsonData?.imageUrls || [];
        console.log(`   📸 Downloading ${imageUrls.length} images ...`);
        const localFilenames = [];
        for (let i = 0; i < imageUrls.length; i++) {
            const filename = await downloadImage(imageUrls[i], listingId, i + 1);
            if (filename) localFilenames.push(filename);
        }
        listing.images = localFilenames;

        console.log(`   ✅ Done: "${listing.title}" – ${localFilenames.length} images saved`);
        return listing;
    } catch (err) {
        console.error(`   ❌ Failed to scrape ${listingId}: ${err.message}`);
        return null;
    }
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
    console.log("═══════════════════════════════════════════════");
    console.log("  Airbnb Algeria Scraper – ar.airbnb.com");
    console.log("═══════════════════════════════════════════════\n");

    ensureDirectories();

    const data = loadData();
    const existingIds = buildIdSet(data);
    console.log(`📦 Loaded ${data.length} existing records (${existingIds.size} unique IDs)\n`);

    // Launch browser
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    console.log(`🌐 User-Agent: ${userAgent}\n`);

    const browser = await chromium.launch({
        headless: false, // Set to false so you can see the browser
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
    });

    const context = await browser.newContext({
        userAgent,
        locale: "ar",
        viewport: { width: 1366, height: 768 },
        extraHTTPHeaders: {
            "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
        },
    });

    // Stealth: override navigator.webdriver
    await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
            get: () => false,
        });
    });

    const page = await context.newPage();

    let totalNewListings = 0;

    for (const city of TARGET_CITIES) {
        console.log(`\n${"─".repeat(50)}`);
        console.log(`🏙️  CITY: ${city.name}`);
        console.log(`${"─".repeat(50)}`);

        try {
            // Step 1: Collect listing URLs from search pages
            const listingUrls = await collectListingUrls(page, city);
            console.log(`\n📋 Found ${listingUrls.length} listing URLs in ${city.name}`);

            // Step 2: Scrape each listing
            for (const url of listingUrls) {
                try {
                    const listing = await scrapeListing(page, url, existingIds, city.name);

                    if (listing) {
                        data.push(listing);
                        existingIds.add(listing.id);
                        totalNewListings++;

                        // Save after EACH successful scrape
                        saveData(data);
                        console.log(`   💾 Saved (total: ${data.length} records)`);
                    }
                } catch (err) {
                    console.error(`   ❌ Unexpected error on ${url}: ${err.message}`);
                }

                // Delay between listings
                await randomDelay();
            }
        } catch (err) {
            console.error(`❌ Error processing city ${city.name}: ${err.message}`);
        }
    }

    await browser.close();

    console.log(`\n${"═".repeat(50)}`);
    console.log(`✅ Scraping complete!`);
    console.log(`   New listings scraped: ${totalNewListings}`);
    console.log(`   Total records in data.json: ${data.length}`);
    console.log(`${"═".repeat(50)}`);
}

// ─── Entry Point ────────────────────────────────────────────
main().catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
});
