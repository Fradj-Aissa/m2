const express = require('express');
const axios = require('axios');
const {
  FASTAPI_PREDICT_URL,
  PredictionMappingError,
  mapPredictionRequest,
} = require('../utils/predictionMapper');

const router = express.Router();

/**
 * POST /api/predict-price
 *
 * Smart mapping layer between the React form and the hosted ML API:
 * - wilayaId   -> wilaya
 * - propertyType UI values -> ML-compatible property_type
 * - priceUnit  -> minimum_nights
 * - requested price -> price_per_person
 */
router.post('/predict-price', async (req, res) => {
  try {
    const { mappedPayload } = mapPredictionRequest(req.body);

    const predictionResponse = await axios.post(FASTAPI_PREDICT_URL, mappedPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const predictedPrice = Number(predictionResponse.data?.predicted_price);
    const confidence =
      predictionResponse.data?.confidence === null ||
      predictionResponse.data?.confidence === undefined
        ? null
        : Number(predictionResponse.data.confidence);

    if (!Number.isFinite(predictedPrice)) {
      throw new Error('FastAPI returned an invalid prediction payload');
    }

    res.json({
      predicted_price: predictedPrice,
      confidence: Number.isFinite(confidence) ? confidence : null,
    });
  } catch (error) {
    if (error instanceof PredictionMappingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    if (axios.isAxiosError(error)) {
      const upstreamStatus = error.response?.status;
      const upstreamMessage =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        'AI prediction failed';

      console.error('FastAPI prediction error:', {
        status: upstreamStatus,
        message: upstreamMessage,
        data: error.response?.data,
      });

      return res.status(upstreamStatus === 422 ? 400 : 502).json({
        error: upstreamMessage,
      });
    }

    console.error('Unexpected prediction route error:', error);
    res.status(500).json({ error: 'Failed to predict apartment price' });
  }
});

module.exports = router;
