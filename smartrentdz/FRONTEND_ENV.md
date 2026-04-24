Frontend production environment variables:

- VITE_API_URL=https://smartrentdz-api.onrender.com/api
- VITE_GROQ_API_KEY=your_groq_api_key

Notes:
- Add these on the frontend hosting platform, not on the Render backend service.
- For better security, move Groq calls to the backend later and remove VITE_GROQ_API_KEY from the frontend.

