const FASTAPI_PREDICT_URL =
  process.env.FASTAPI_PREDICT_URL || 'https://aissaf-smart-rent-ml-api.hf.space/predict';

const DEFAULT_PREDICTION_INPUTS = {
  accommodates: 2,
  minimum_nights: 1,
  number_of_reviews: 0,
  availability_365: 365,
  review_scores_rating: 4.5,
};

const PROPERTY_TYPES = ['Apartment', 'Villa', 'House', 'Loft', 'Condo', 'Studio'];
const ML_PROPERTY_TYPE_MAP = {
  apartment: 'Apartment',
  condo: 'Apartment',
  loft: 'Apartment',
  studio: 'Studio',
  villa: 'House',
  house: 'House',
};

// Convert local wilaya ids to the English labels expected by the ML model.
const WILAYA_ID_TO_NAME = {
  1: 'Adrar',
  2: 'Chlef',
  3: 'Laghouat',
  4: 'Oum El Bouaghi',
  5: 'Batna',
  6: 'Bejaia',
  7: 'Biskra',
  8: 'Bechar',
  9: 'Blida',
  10: 'Bouira',
  11: 'Tamanrasset',
  12: 'Tebessa',
  13: 'Tlemcen',
  14: 'Tiaret',
  15: 'Tizi Ouzou',
  16: 'Alger',
  17: 'Djelfa',
  18: 'Jijel',
  19: 'Setif',
  20: 'Saida',
  21: 'Skikda',
  22: 'Sidi Bel Abbes',
  23: 'Annaba',
  24: 'Guelma',
  25: 'Constantine',
  26: 'Medea',
  27: 'Mostaganem',
  28: 'Msila',
  29: 'Mascara',
  30: 'Ouargla',
  31: 'Oran',
  32: 'El Bayadh',
  33: 'Illizi',
  34: 'Bordj Bou Arreridj',
  35: 'Boumerdes',
  36: 'El Tarf',
  37: 'Tindouf',
  38: 'Tissemsilt',
  39: 'El Oued',
  40: 'Khenchela',
  41: 'Souk Ahras',
  42: 'Tipaza',
  43: 'Mila',
  44: 'Ain Defla',
  45: 'Naama',
  46: 'Ain Temouchent',
  47: 'Ghardaia',
  48: 'Relizane',
  49: 'Timimoun',
  50: 'Bordj Badji Mokhtar',
  51: 'Ouled Djellal',
  52: 'Beni Abbes',
  53: 'In Salah',
  54: 'In Guezzam',
  55: 'Touggourt',
  56: 'Djanet',
  57: "El M'Ghair",
  58: 'El Meniaa',
};

class PredictionMappingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PredictionMappingError';
    this.statusCode = 400;
  }
}

function coercePositiveNumber(value, fieldName) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new PredictionMappingError(`${fieldName} is required and must be greater than zero`);
  }

  return numericValue;
}

function coerceNonNegativeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
}

function normalizePropertyType(value) {
  const propertyType = String(value || 'Apartment').trim();
  const supportedType = PROPERTY_TYPES.find(
    (candidate) => candidate.toLowerCase() === propertyType.toLowerCase()
  );

  if (!supportedType) {
    throw new PredictionMappingError(
      `property_type must be one of: ${PROPERTY_TYPES.join(', ')}`
    );
  }

  return supportedType;
}

function mapPropertyTypeForMl(value) {
  const normalized = normalizePropertyType(value);
  return ML_PROPERTY_TYPE_MAP[normalized.toLowerCase()] || 'Apartment';
}

function resolveWilayaName(input) {
  const wilayaId = Number(input.wilayaId ?? input.wilaya_id);
  if (Number.isInteger(wilayaId) && WILAYA_ID_TO_NAME[wilayaId]) {
    return WILAYA_ID_TO_NAME[wilayaId];
  }

  const wilayaName = String(input.wilaya || '').trim();
  if (wilayaName) {
    return wilayaName;
  }

  throw new PredictionMappingError('wilayaId is required to predict the market price');
}

function mapPriceUnitToMinimumNights(priceUnit) {
  const normalizedUnit = String(priceUnit || 'day').trim().toLowerCase();

  if (normalizedUnit === 'month') return 30;
  if (normalizedUnit === 'week') return 7;
  return 1;
}

function mapPredictionRequest(input = {}) {
  const requestedPrice = coercePositiveNumber(
    input.requested_price ?? input.requestedPrice ?? input.price,
    'requested_price'
  );
  const bedrooms = Math.round(coercePositiveNumber(input.bedrooms ?? input.rooms, 'bedrooms'));
  const bathrooms = coercePositiveNumber(input.bathrooms, 'bathrooms');
  const propertyType = mapPropertyTypeForMl(input.property_type ?? input.propertyType);
  const wilaya = resolveWilayaName(input);
  const accommodates = Math.round(
    coercePositiveNumber(
      input.accommodates ?? bedrooms * 2 ?? DEFAULT_PREDICTION_INPUTS.accommodates,
      'accommodates'
    )
  );
  const minimumNights = Math.max(
    1,
    Math.round(
      coerceNonNegativeNumber(
        input.minimum_nights ?? input.minimumNights,
        mapPriceUnitToMinimumNights(input.price_unit ?? input.priceUnit)
      )
    )
  );
  const numberOfReviews = Math.max(
    0,
    Math.round(
      coerceNonNegativeNumber(
        input.number_of_reviews ?? input.numberOfReviews,
        DEFAULT_PREDICTION_INPUTS.number_of_reviews
      )
    )
  );
  const reviewScoresRating = Math.min(
    5,
    Math.max(
      1,
      Number(input.review_scores_rating ?? input.reviewScoresRating) ||
        DEFAULT_PREDICTION_INPUTS.review_scores_rating
    )
  );
  const availability365 = Math.min(
    365,
    Math.max(
      0,
      Math.round(
        coerceNonNegativeNumber(
          input.availability_365 ?? input.availability365,
          DEFAULT_PREDICTION_INPUTS.availability_365
        )
      )
    )
  );
  const pricePerPerson = Number((requestedPrice / accommodates).toFixed(2));

  return {
    mappedPayload: {
      accommodates,
      bedrooms,
      bathrooms,
      wilaya,
      property_type: propertyType,
      minimum_nights: minimumNights,
      number_of_reviews: numberOfReviews,
      review_scores_rating: reviewScoresRating,
      availability_365: availability365,
      price_per_person: pricePerPerson,
    },
    requestedPrice,
  };
}

module.exports = {
  FASTAPI_PREDICT_URL,
  PROPERTY_TYPES,
  PredictionMappingError,
  WILAYA_ID_TO_NAME,
  mapPredictionRequest,
};
