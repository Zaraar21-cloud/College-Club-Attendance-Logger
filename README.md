# College Club Attendance Logger

**Published Version:** [https://ascend-attendance-logger.web.app/](https://ascend-attendance-logger.web.app/)

An automated Attendance Logger System designed for college clubs to seamlessly track attendance using HTML5 Geolocation API and Google Apps Script backend. It features a modern, responsive "Soft Claymorphism" UI with dynamic visual feedback.

## Features

- **Geolocation Verification:** Ensures students are physically present in the club room by calculating Haversine distance from the club's center coordinates.
- **Modern UI:** Built with "Soft Claymorphism" design, 3D inflated cards, and responsive layouts.
- **Dynamic Feedback:** Real-time visual feedback using interactive SVGs (e.g., checkmarks) during the attendance logging process.
- **Secure Backend Integration:** Connects to a Google Apps Script backend to log data directly into a Google Sheet securely.
- **Firebase Hosted:** The application is hosted using Firebase Hosting for fast and reliable access.

## Recent Updates & Constraints

- **Removed IP Logic:** The previous public IP tracking logic was removed. Since college WiFi typically shares the same public IP across the entire campus, IP tracking was ineffective for room-level verification. We now strictly rely on GPS-based geolocation.
- **Sanitized Repository:** All sensitive information including exact latitude/longitude coordinates of the club room and Google Apps Script URLs have been sanitized and replaced with placeholders for security.

## Setup Instructions

1. Clone the repository.
2. In `app.js`, replace the `APPS_SCRIPT_URL` placeholder with your own Google Apps Script Web App URL.
3. In `verification.js`, update `CLUB_LAT` and `CLUB_LNG` with the actual coordinates of your club room.
4. Deploy the frontend using Firebase Hosting or your preferred static hosting provider.
