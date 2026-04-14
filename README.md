# Emerald Vault

Emerald Vault is a premium financial management dashboard for tracking net worth, savings, and investments.

## Features
- **Dashboard**: Overview of total net worth and monthly income.
- **Goals**: Track and manage financial goals.
- **Savings**: Monitor liquid savings across multiple accounts.
- **Investments**: Manage market investments and track performance.
- **Bills**: Track recurring payments, subscriptions, and due dates.
- **Reports**: Visual analytics and spending breakdowns by category.
- **Data Persistence**: Local persistence using a custom Vite API plugin saving to `data.json`.

## Tech Stack
- **Frontend**: Vanilla JavaScript (ESM) + Tailwind CSS 4.
- **Visuals**: Chart.js 4 for advanced financial analytics.
- **Typography**: Google Fonts (Inter) for a premium look.
- **Design Strategy**: Modern Glassmorphism with dynamic radial gradients.
- **Builder**: Vite 7.
- **Persistence**: Custom JSON storage using Vite's server-side API.

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure
- `index.html`, `goals.html`, `savings.html`, `investments.html`: Main application pages.
- `src/main.js`: Core dashboard logic.
- `src/style.css`: Modern glassmorphism design system using Tailwind 4.
- `data.json`: Local data storage.
- `vite.config.js`: Custom server logic for data persistence.
