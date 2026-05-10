# SmartRentDZ - Technical Project Report

## 1. Project Overview
**Name:** SmartRentDZ  
**Concept:** A smart real estate platform designed specifically for the Algerian market. It empowers users to seamlessly find, rent, and list apartments by leveraging modern web technologies and Artificial Intelligence.  
**Core Value:** The platform's unique selling proposition is the integration of advanced AI capabilities (Google Gemini) that provide automatic, intelligent property analysis and intelligent price prediction to streamline the real estate experience for both landlords and renters.

---

## 2. Technical Stack (Tools & Technologies)

Based on a thorough analysis of the project's codebase, the application utilizes a robust and modern technology stack:

### **Frontend**
- **Core:** React (initialized via Vite) with TypeScript for strong typing and better developer experience.
- **Styling & UI:** Tailwind CSS for utility-first styling, complemented by Shadcn/UI for accessible, reusable components.
- **Icons & Animations:** Lucide React for consistent iconography and Framer Motion / Tailwind Animate for smooth, modern micro-animations.

### **Backend & Persistence**
- **Environment:** Node.js utilizing the Express.js framework to build robust RESTful APIs.
- **Database:** While originally conceptualized with MySQL, the current architecture implements **PostgreSQL** using the **Prisma ORM** for type-safe database queries and migrations.
- **Real-time Engine:** Socket.io is integrated for real-time, bi-directional communication (crucial for live notifications).

### **AI Integration**
- **Model:** Google Gemini 2.5 Flash (via `@google/generative-ai`).
- **Use Cases:** Automated image analysis to dynamically extract apartment amenities, descriptive generation, and an AI-powered pricing predictor.

### **Authentication, Storage & Security**
- **Authentication:** A hybrid approach using JSON Web Tokens (JWT) for securing local sessions alongside Google OAuth via `@react-oauth/google`. The system bridges Google Identity with the custom Express backend. *(Note: The architecture indicates a migration from Firebase to a custom PostgreSQL+JWT solution, retaining reference IDs to Firebase for historical tracking)*.
- **Storage:** Secure processing and upload logic for images, preparing for integrations with cloud storage solutions.
- **Security:** Passwords are cryptographically hashed using `bcrypt`, and sensitive keys are managed via environment variables (`.env`).

### **Other Key Tools**
- **State & Data Fetching:** Axios for HTTP requests and React Query / Context API for state management.
- **Routing:** React Router DOM for client-side navigation.
- **Forms:** React Hook Form coupled with Zod for robust schema-based validation.
- **Mapping:** Leaflet & React-Leaflet for interactive geographic property maps.

---

## 3. Key Features Implemented

1. **AI Image Analysis:** Landlords can upload property photos, and the system automatically leverages Google Gemini to detect features, extract amenities, and generate comprehensive apartment descriptions.
2. **AI Price Predictor:** Intelligent algorithm providing data-driven pricing suggestions based on current property data and market characteristics.
3. **Advanced UI/UX:** A highly responsive design featuring dark/light mode toggles, interactive maps, dynamic carousels, and smooth page transitions.
4. **Smart Notification System:** Real-time, socket-driven notification alerts featuring user avatars, informing users instantly of approvals, messages, or system updates.
5. **Role-Based User Dashboard:** Distinct interfaces tailored for 'renters' and 'landlords', allowing users to manage property listings, track favorites, update profiles, and manage subscription plans.

---

## 4. Architecture & Security

### **System Architecture**
The project follows a decoupled **Client-Server Architecture**:
- **Client (Vite/React):** Handles presentation, form validation, and client-side routing. It communicates asynchronously with the backend via Axios interceptors.
- **Server (Express):** Serves as the central API gateway. It processes business logic, communicates with third-party APIs (like Google Gemini and OAuth), and manages WebSocket connections for real-time features.
- **Database (PostgreSQL via Prisma):** Acts as the single source of truth. The Express server uses Prisma Client to securely read and write structured data.

### **Security Measures**
- **JWT Protection:** API routes are guarded by middleware that verifies JSON Web Tokens. Only authenticated users can access protected endpoints (e.g., creating a listing, viewing a dashboard).
- **Environment Isolation:** Crucial credentials such as the Google Client ID, Database Connection Strings, and JWT Secrets are strictly kept out of source control using `.env` files.
- **Data Sanitization & Validation:** Inputs are validated on the frontend (Zod) and verified against schemas in the backend to prevent SQL injection and malicious payloads.
- **CORS Configuration:** The backend explicitly defines Cross-Origin Resource Sharing rules to only accept requests from the designated Vite frontend application.

---

## 5. Database Schema

The database is built with relational integrity and enforces strict constraints to ensure data consistency. Here is a high-level overview of the primary entities:

- **Users (`users`):**
  - Acts as the core identity table storing details like `uid`, `email`, `name`, `phone`, and `hashed_password`.
  - Distinguishes user privileges via `type` / `account_type` (renter vs. landlord) and `role` (user vs. admin).
  - Tracks subscription statuses and links to external auth providers (`google_id`, `firebase_id`).

- **Apartments (`apartments`):**
  - Contains all property listing information such as `title`, `description`, `price` (and `price_unit`), and localization data (`wilaya`, `municipality`).
  - Stores complex attributes like `images` and `amenities` using `JSONB` for flexibility.
  - Links directly to the `users` table via `landlord_id` with cascading deletes.
  - Maintains state variables like `is_active`, `is_featured`, and listing `status` (approved/pending/rejected).

- **Notifications (`notifications`):**
  - Manages the real-time alerting system.
  - Includes `recipient_id` and `sender_id` for user-to-user or system-to-user messages.
  - Utilizes an Enum (`notification_type`) to categorize alerts (e.g., rating, contact, approval).
  - Tracks the read state via an `is_read` boolean flag.

*(Additional supportive tables include `favorites` for user wishlists, `reviews` for property feedback, and `subscriptions` for premium plan tracking).*
