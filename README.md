# WedPlan

WedPlan is a full-stack wedding planning and vendor marketplace web application where couples can discover wedding services, manage bookings, and access role-based dashboards, while vendors can showcase their offerings and manage subscriptions.

## Live Demo

- **Frontend:** https://wedplan-alpha.vercel.app
- **Backend API:** https://wedplan-server-1-ubfx.onrender.com

## Overview & Key Features

- **Role-Based Experiences:** Dedicated workflows and dashboards for customers, vendors, and administrators.
- **Authentication & Session Sync:** Supports email/password sign-up and sign-in alongside Google OAuth with Better Auth, role syncing, and JWT session handling.
- **Service Discovery & Bookings:** Browse wedding services, inspect service details, and manage bookings.
- **Vendor Subscriptions & Payments:** Integrated Stripe checkout and webhook support for vendor plans.
- **Custom Editorial UI & Error Handling:** Built with responsive layouts, Framer Motion animations, and a custom 404 page.

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Better Auth Client
- **Backend:** Node.js, Express, TypeScript, Mongoose / MongoDB, Better Auth, Stripe

## Getting Started (Clone & Run)

### 1. Clone the Repositories

```bash
# Clone the frontend repository
git clone <YOUR_FRONTEND_REPO_URL> wedplan
cd wedplan

# Clone the backend repository (in a separate folder)
git clone [https://github.com/NairaMehjabin/Wedplan-Server.git](https://github.com/NairaMehjabin/Wedplan-Server.git) wedplan-server
2. Frontend Setup
Bash
cd wedplan
npm install
npm run dev
Create a .env.local file in the frontend root with your environment variables:

Code snippet
NEXT_PUBLIC_API_URL=[https://wedplan-server-1-ubfx.onrender.com](https://wedplan-server-1-ubfx.onrender.com)
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key
3. Backend Setup
Bash
cd wedplan-server
npm install
npm run build
npm run start
Create a .env file in wedplan-server with your server configuration:

Code snippet
PORT=5000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=wedplan_db
CLIENT_URL=[https://wedplan-alpha.vercel.app](https://wedplan-alpha.vercel.app)
BETTER_AUTH_URL=[https://wedplan-server-1-ubfx.onrender.com](https://wedplan-server-1-ubfx.onrender.com)
BETTER_AUTH_SECRET=your_better_auth_secret
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_VENDOR_PRICE_ID=your_stripe_price_id
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

Replace `<YOUR_FRONTEND_REPO_URL>` with your frontend GitHub repository URL and fill in your environment secrets before running locally.