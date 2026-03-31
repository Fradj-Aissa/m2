/**
 * Favorites Service - PostgreSQL API Version
 * Replaces Firebase/Firestore with Express.js backend
 */

import { apiGet, apiPost, apiDelete } from '@/lib/api';

export interface Favorite {
  id: string;
  firebase_id?: string;
  user_id: string;
  apartment_id: string;
  created_at: string;
}

/**
 * Add apartment to user's favorites
 */
export const addToFavorites = async (userId: string, apartmentId: string): Promise<string> => {
  const response = await apiPost<Favorite>('/favorites', {
    userId,
    apartmentId,
  });
  return response.id;
};

/**
 * Remove apartment from user's favorites
 */
export const removeFromFavorites = async (
  userId: string,
  apartmentId: string
): Promise<void> => {
  await apiDelete(`/favorites/${userId}/${apartmentId}`);
};

/**
 * Get favorite record for user and apartment
 */
export const getFavorite = async (
  userId: string,
  apartmentId: string
): Promise<Favorite | null> => {
  try {
    const response = await apiGet<{ isFavorited: boolean; favoriteId: string | null }>(
      `/favorites/${userId}/check/${apartmentId}`
    );

    if (response.isFavorited && response.favoriteId) {
      return {
        id: response.favoriteId,
        user_id: userId,
        apartment_id: apartmentId,
        created_at: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting favorite:', error);
    return null;
  }
};

/**
 * Get all apartment IDs that user has favorited
 */
export const getUserFavorites = async (userId: string): Promise<string[]> => {
  const response = await apiGet<string[]>(`/favorites/${userId}`);
  return response;
};

/**
 * Check if apartment is favorited by user
 */
export const isApartmentFavorited = async (
  userId: string,
  apartmentId: string
): Promise<boolean> => {
  try {
    const response = await apiGet<{ isFavorited: boolean }>(
      `/favorites/${userId}/check/${apartmentId}`
    );
    return response.isFavorited;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};

/**
 * Get full apartment details for all user's favorites
 */
export const getUserFavoritesWithDetails = async (userId: string): Promise<any[]> => {
  try {
    const response = await apiGet<any[]>(`/favorites/${userId}/apartments`);
    return response;
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return [];
  }
};
