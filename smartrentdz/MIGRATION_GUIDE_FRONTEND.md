# React Frontend: PostgreSQL API Guide

The frontend now talks only to the REST API served by `my-express-backend`. Firebase SDKs are no longer used.

---

## 🔄 Current Data Flow
- API wrapper: `src/lib/api.ts` handles base URL and error handling.
- Services: `src/services/apartmentService.ts` and `src/services/favoritesService.ts` map API responses to UI-friendly shapes.
- IDs: `firebase_id` fields are kept as **static legacy strings** for reference; they do not trigger any Firebase calls.

---

## 📁 Files to Know
- `src/lib/api.ts` – API helpers (`apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`).
- `src/services/apartmentService.ts` – apartment CRUD + search via API.
- `src/services/favoritesService.ts` – favorites CRUD via API.
- `src/pages/Search.tsx`, `src/pages/ApartmentDetail.tsx` – use services; accept either `id` (UUID) or `firebase_id` as legacy identifiers.

---

## 🗺️ Field Mapping (API → UI)
| PostgreSQL (snake_case) | Frontend expectation |
|-------------------------|----------------------|
| `price_unit` | `price_unit` (string) |
| `wilaya_id` | `wilaya_id` (number) |
| `is_featured` | `is_featured` (boolean) |
| `is_active` | `is_active` (boolean) |
| `phone_clicks` | `phone_clicks` (number) |
| `landlord_id` | `landlord_id` (string) |
| `created_at` / `updated_at` | ISO strings |
| `images` / `amenities` | arrays (JSONB) |

The service helpers already normalize arrays whether they arrive as JSON strings or arrays.

---

## 🌐 Environment
```
REACT_APP_API_URL=http://localhost:3000/api
```
`src/lib/api.ts` falls back to this local URL when the env variable is absent.

---

## ✅ Quick Usage Examples
```typescript
import { getAllApartments, searchApartments } from '@/services/apartmentService';
import { addToFavorites, getUserFavoritesWithDetails } from '@/services/favoritesService';

const apartments = await getAllApartments();
const filtered = await searchApartments({ wilaya_id: 16, rooms: 2 });

await addToFavorites(userId, apartmentId);
const favorites = await getUserFavoritesWithDetails(userId);
```

---

## 🔍 Testing Checklist
- List apartments, fetch single apartment, and filter queries work via API.
- Favorites add/remove endpoints return expected data.
- `firebase_id` values are handled as plain strings; no Firebase SDK is referenced.
