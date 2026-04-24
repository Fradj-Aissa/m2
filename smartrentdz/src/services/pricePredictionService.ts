import { apiPost } from "@/lib/api";

export type PropertyType = "Apartment" | "Villa" | "House" | "Loft" | "Condo" | "Studio";
export type PriceUnit = "day" | "week" | "month";

export interface PricePredictionInput {
  requested_price: number;
  rooms: number;
  bathrooms: number;
  wilayaId: number;
  property_type: PropertyType;
  price_unit: PriceUnit;
}

export interface PricePredictionResult {
  predicted_price: number;
  confidence: number | null;
}

/**
 * Send the current form values to the Node/Express mapper which then proxies
 * the request to the FastAPI model.
 */
export async function predictApartmentPrice(
  payload: PricePredictionInput
): Promise<PricePredictionResult> {
  return apiPost<PricePredictionResult>("/predict-price", payload);
}
