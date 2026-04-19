/**
 * Apartment Service - PostgreSQL API Version
 * Replaces Firebase/Firestore with Express.js backend
 */

import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api';
import { uploadImagesToImgBB } from './imageService';

export interface Apartment {
  id: string;
  firebase_id?: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  price_unit: 'day' | 'week' | 'month';
  wilaya: string;
  wilaya_id: number;
  municipality: string;
  rooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  is_featured: boolean;
  is_active: boolean;
  views: number;
  phone_clicks: number;
  created_at: string;
  landlord_id: string;
  landlord_phone: string;
  landlord_name: string;
  status: 'approved' | 'pending' | 'rejected';
  updated_at?: string;
  verification_docs?: string[];
  verification_status?: 'pending' | 'verified' | 'rejected';
  verification_feedback?: string;
  lat?: number;
  lng?: number;
}

/**
 * Map PostgreSQL apartment to frontend format
 */
function mapApartmentToFrontend(data: any): Apartment {
  return {
    id: data.id || data.firebase_id,
    firebase_id: data.firebase_id,
    title: data.title,
    description: data.description,
    images: Array.isArray(data.images) ? data.images : JSON.parse(data.images || '[]'),
    price: parseFloat(data.price),
    price_unit: data.price_unit,
    wilaya: data.wilaya,
    wilaya_id: data.wilaya_id,
    municipality: data.municipality,
    rooms: data.rooms,
    bathrooms: data.bathrooms,
    area: parseFloat(data.area),
    amenities: Array.isArray(data.amenities) ? data.amenities : JSON.parse(data.amenities || '[]'),
    is_featured: data.is_featured,
    is_active: data.is_active,
    views: data.views,
    phone_clicks: data.phone_clicks,
    created_at: data.created_at,
    landlord_id: data.landlord_id,
    landlord_phone: data.landlord_phone,
    landlord_name: data.landlord_name,
    status: data.status,
    updated_at: data.updated_at,
    verification_docs: Array.isArray(data.verification_docs) ? data.verification_docs : (data.verification_docs ? JSON.parse(data.verification_docs) : []),
    verification_status: data.verification_status,
    verification_feedback: data.verification_feedback,
    lat: data.lat != null ? parseFloat(data.lat) : undefined,
    lng: data.lng != null ? parseFloat(data.lng) : undefined,
  };
}

/**
 * Map frontend apartment data to API format
 */
function mapApartmentToDB(data: Partial<Apartment>): Record<string, any> {
  const mapped: Record<string, any> = {};

  if (data.title) mapped.title = data.title;
  if (data.description) mapped.description = data.description;
  if (data.images) mapped.images = data.images;
  if (data.price !== undefined) mapped.price = data.price;
  if (data.price_unit) mapped.price_unit = data.price_unit;
  if (data.wilaya) mapped.wilaya = data.wilaya;
  if (data.wilaya_id) mapped.wilaya_id = data.wilaya_id;
  if (data.municipality) mapped.municipality = data.municipality;
  if (data.rooms !== undefined) mapped.rooms = data.rooms;
  if (data.bathrooms !== undefined) mapped.bathrooms = data.bathrooms;
  if (data.area !== undefined) mapped.area = data.area;
  if (data.amenities) mapped.amenities = data.amenities;
  if (data.is_featured !== undefined) mapped.is_featured = data.is_featured;
  if (data.landlord_phone) mapped.landlord_phone = data.landlord_phone;
  if (data.landlord_name) mapped.landlord_name = data.landlord_name;
  if (data.status) mapped.status = data.status;
  if (data.lat !== undefined) mapped.lat = data.lat;
  if (data.lng !== undefined) mapped.lng = data.lng;

  return mapped;
}

// ============================================================
// APARTMENT CRUD OPERATIONS
// ============================================================

/**
 * Upload images to ImgBB
 */
export const uploadApartmentImages = async (
  files: File[]
): Promise<string[]> => {
  return uploadImagesToImgBB(files);
};

/**
 * Create a new apartment
 */
export const createApartment = async (
  apartmentData: Omit<
    Apartment,
    'id' | 'created_at' | 'updated_at' | 'views' | 'phone_clicks' | 'status'
  >
): Promise<string> => {
  // Convert to backend format (camelCase for request body)
  const payload = {
    title: apartmentData.title,
    description: apartmentData.description,
    images: apartmentData.images,
    price: apartmentData.price,
    priceUnit: apartmentData.price_unit,
    wilaya: apartmentData.wilaya,
    wilayaId: apartmentData.wilaya_id,
    municipality: apartmentData.municipality,
    rooms: apartmentData.rooms,
    bathrooms: apartmentData.bathrooms,
    area: apartmentData.area,
    amenities: apartmentData.amenities,
    verificationDocs: apartmentData.verification_docs || [],
    isFeatured: apartmentData.is_featured,
    isActive: apartmentData.is_active,
    landlordId: apartmentData.landlord_id,
    landlordPhone: apartmentData.landlord_phone,
    landlordName: apartmentData.landlord_name,
    lat: apartmentData.lat,
    lng: apartmentData.lng,
  };

  const response = await apiPost<Apartment>('/apartments', payload);
  return response.id;
};

/**
 * Get apartment by ID
 */
export const getApartmentById = async (
  id: string
): Promise<Apartment | null> => {
  try {
    const response = await apiGet<Apartment>(`/apartments/${id}`);
    return mapApartmentToFrontend(response);
  } catch (error) {
    console.error('Apartment not found:', error);
    return null;
  }
};

/**
 * Get all active apartments (newest first)
 */
export const getAllApartments = async (): Promise<Apartment[]> => {
  const response = await apiGet<{ apartments: any[] }>('/apartments');
  return response.apartments.map(mapApartmentToFrontend);
};

/**
 * Get featured apartments (limited to 6)
 */
export const getFeaturedApartments = async (): Promise<Apartment[]> => {
  const response = await apiGet<Apartment[]>('/apartments/featured');
  return response.map(mapApartmentToFrontend);
};

/**
 * Get apartments by landlord
 */
export const getApartmentsByLandlord = async (
  landlordId: string
): Promise<Apartment[]> => {
  const response = await apiGet<Apartment[]>(`/apartments/landlord/${landlordId}`);
  return response.map(mapApartmentToFrontend);
};

/**
 * Get apartments by wilaya
 */
export const getApartmentsByWilaya = async (
  wilayaId: number
): Promise<Apartment[]> => {
  const response = await apiGet<Apartment[]>(`/apartments/wilaya/${wilayaId}`);
  return response.map(mapApartmentToFrontend);
};

/**
 * Update apartment
 */
export const updateApartment = async (
  id: string,
  data: Partial<Apartment>
): Promise<void> => {
  const payload = mapApartmentToDB(data);
  await apiPut(`/apartments/${id}`, payload);
};

/**
 * Toggle apartment active status
 */
export const toggleApartmentStatus = async (
  id: string,
  isActive: boolean
): Promise<void> => {
  await apiPatch(`/apartments/${id}/status`, { isActive });
};

/**
 * Increment views counter
 */
export const incrementViews = async (id: string): Promise<void> => {
  await apiPatch(`/apartments/${id}/phone-click`, {});
};

/**
 * Increment phone clicks counter
 */
export const incrementPhoneClicks = async (id: string): Promise<void> => {
  await apiPatch(`/apartments/${id}/phone-click`, {});
};

/**
 * Delete apartment
 */
export const deleteApartment = async (id: string): Promise<void> => {
  await apiDelete(`/apartments/${id}`);
};

/**
 * Search apartments with filters
 */
export const searchApartments = async (filters: {
  wilaya_id?: number;
  price_unit?: string;
  rooms?: number;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
}): Promise<{ apartments: Apartment[]; pagination: any }> => {
  const params = new URLSearchParams();
  if (filters.wilaya_id) params.append('wilayaId', filters.wilaya_id.toString());
  if (filters.price_unit) params.append('priceUnit', filters.price_unit);
  if (filters.rooms) params.append('rooms', filters.rooms.toString());
  if (filters.min_price) params.append('minPrice', filters.min_price.toString());
  if (filters.max_price) params.append('maxPrice', filters.max_price.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  const response = await apiGet<{ apartments: any[]; pagination: any }>(
    `/apartments?${params.toString()}`
  );

  return {
    apartments: response.apartments.map(mapApartmentToFrontend),
    pagination: response.pagination,
  };
};

/**
 * Delete apartment images (placeholder)
 */
export const deleteApartmentImages = async (imageUrls: string[]): Promise<void> => {
  console.log('Images to delete:', imageUrls);
};
