# Sreenidhi Ascend Club Entry & Attendance Automation System — Technical Requirements Document (`requirements.md`)

## 1. Project Overview & Scope
This project is a single-page, web-based automated attendance and entry management system for **Sreenidhi Ascend**. It replaces traditional physical registers with a mobile-first, soft Claymorphic UI application that retains user details locally and validates physical presence (via Wi-Fi or Geolocation) before logging records into a Google Sheet database.

### Core User Workflow:
1. **Initial Access & Local Storage Sync:**
   * Upon opening the web app, form fields (**Name, Branch, Roll Number, Phone Number, Club Role**) auto-fill from `LocalStorage` if previously saved.
2. **State-Aware Actions:**
   * The system checks the user's current session state (`IDLE`, `CHECKED_IN`):
     * If **Checked-In**: The "Check-In" button becomes disabled and transparent. The "Check-Out" button is fully active.
     * If **Not Checked-In** and the user clicks **Check-Out**: The app presents a popup modal asking for an approximate entry time (manual override log).
3. **Verification Mechanism (Geolocation):**
   * Before logging an entry/exit transaction, the system validates the member's physical presence in the club room via:
     * HTML5 Geolocation API verifying distance against the predefined Club Room latitude/longitude bounding radius.
4. **Data Persistence:**
   * Upon passing verification, transaction payloads are dispatched via HTTP POST to a Google Apps Script endpoint and recorded in Google Sheets.

---

## 2. Technical Stack Specifications & UI Theme Design

| Component | Technology / Platform | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, Modern CSS, Vanilla JavaScript (ES6+) | Mobile-first single-page application (SPA) |
| **UI Design System** | **Soft Claymorphism** | Tactile 3D inflated cards, soft dual inner/outer shadows, pill inputs |
| **Client Persistence**| Browser `window.localStorage` | Storing member details & active check-in state |

| **Location API** | Browser `navigator.geolocation` API | Physical distance fallback check |
| **Backend API** | Google Apps Script (`Code.gs`) | Micro-backend service handling incoming logs |
| **Database** | Google Sheets | Structured cloud repository for attendance logs |

---

## 3. Visual UI Guidelines: Soft Claymorphism (Sreenidhi Ascend Brand Palette)

### 3.1 Color Palette Extracted from Logo
The UI theme must integrate the vibrant, energetic gradient tones from the **Sreenidhi Ascend** logo while maintaining a soft, comfortable light-mode background suitable for Claymorphism.

```css
:root {
  /* Brand Palette (From Logo) */
  --ascend-navy: #2d1b69;       /* Deep Navy / Dark Purple ("ASCEND" text) */
  --ascend-coral: #f0533c;      /* Vibrant Orange-Coral */
  --ascend-magenta: #d81b60;    /* Pink / Magenta gradient accent */
  --ascend-blue: #0091ea;       /* Electric Sky Blue */
  --ascend-cyan: #00b0ff;       /* Light Blue highlight */

  /* Claymorphism Theme Base Settings */
  --clay-bg: #f3f0f7;           /* Very light pastel indigo/lavender base canvas */
  --clay-card-bg: #f8f6fc;      /* Slightly brighter clay card surface */
  --clay-text-primary: #2d1b69; /* Deep Navy for maximum legibility */
  --clay-text-muted: #6b5b95;   /* Soft purple tint for secondary labels */

  /* Claymorphism Dual-Shadow Constants */
  --clay-card-shadow: 12px 12px 24px #d8d2e3, -12px -12px 24px #ffffff, inset 2px 2px 4px rgba(255, 255, 255, 0.8), inset -2px -2px 4px rgba(0, 0, 0, 0.05);
  --clay-btn-checkin-shadow: 6px 6px 14px rgba(0, 145, 234, 0.35), -6px -6px 14px #ffffff, inset 2px 2px 4px rgba(255, 255, 255, 0.6), inset -2px -2px 4px rgba(0, 0, 0, 0.15);
  --clay-btn-checkout-shadow: 6px 6px 14px rgba(240, 83, 60, 0.35), -6px -6px 14px #ffffff, inset 2px 2px 4px rgba(255, 255, 255, 0.6), inset -2px -2px 4px rgba(0, 0, 0, 0.15);
  --clay-input-inset-shadow: inset 4px 4px 8px #d8d2e3, inset -4px -4px 8px #ffffff;
}
```

### 3.2 Claymorphic Component Specs
* **Main Card Container:**
  * `border-radius: 28px;`
  * `background: var(--clay-card-bg);`
  * `box-shadow: var(--clay-card-shadow);`
* **Form Input Fields:**
  * Rounded pill shape: `border-radius: 16px;`
  * Inset depth effect: `box-shadow: var(--clay-input-inset-shadow);`
  * Focus state: Border highlight using `--ascend-blue` or `--ascend-magenta`.
* **Action Buttons:**
  * **Check-In Button:** Gradient background from `--ascend-blue` to `--ascend-cyan` with `var(--clay-btn-checkin-shadow)`.
  * **Check-Out Button:** Gradient background from `--ascend-coral` to `--ascend-magenta` with `var(--clay-btn-checkout-shadow)`.
  * **Pressed State (`:active`):** Scale down slightly (`transform: scale(0.97)`), shadows compress to create a squishy, tactile button press.
  * **Disabled Check-In State:** `opacity: 0.35; filter: grayscale(50%); cursor: not-allowed; box-shadow: none;`

---

## 4. Core Features & Business Logic

### 4.1 Button State & Session Logic
* **State Storage:** Browser `LocalStorage` must store `club_session_status` (`"OUT"` or `"IN"`) and `club_checkin_timestamp`.
* **Visual States:**
  * If `club_session_status === "IN"`:
    * `"Check-In"` button: Disabled, translucent, non-interactive.
    * `"Check-Out"` button: Fully active with soft red/magenta clay elevation.
* **Manual Entry Time Modal:**
  * Trigger: User clicks "Check-Out" while `club_session_status !== "IN"`.
  * Style: Claymorphic floating pop-up card asking: *"You haven't checked in today. Please select what time you entered the club room:"*.
  * Result: Appends the manual time to the payload under `purpose` (`"Manual Check-In at HH:MM + Check-Out"`).

### 4.2 Presence Verification Engine (Geolocation)
A transaction is **APPROVED** if the GPS verification succeeds.

```
                  ┌───────────────────────────────┐
                  │   User Clicks Action Button   │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Request HTML5 Geolocation │
                    └─────────────┬─────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │                               │
            (Within Radius)                (Out of Radius)
                  │                               │
                  ▼                               ▼
        [✔ VERIFIED via GPS]             [❌ DENY SUBMISSION]
                  │                               │
                  └───────────────────────────────┼
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Send Log to Google Sheets │
                    └───────────────────────────┘
```

---

## 5. Data Schema Definitions

### 5.1 Local Storage Keys
* `club_name`: String
* `club_branch`: String
* `club_rollNumber`: String
* `club_phone`: String
* `club_role`: Enum (`Member`, `Executive`, `Lead/Head`, `Visitor`)
* `club_session_status`: String (`"IN"` | `"OUT"`)
* `club_last_checkin_time`: ISO DateTime String

### 5.2 Google Sheets Database Schema

| Col | Header Name | Data Type | Example Value | Notes |
| :--- | :--- | :--- | :--- | :--- |
| A | `Timestamp` | DateTime | `06/08/2026, 17:15:00` | Server/Client Log Time |
| B | `Action` | String | `CHECK-IN` / `CHECK-OUT` | Action executed |
| C | `Name` | String | `Rahul Sharma` | Member full name |
| D | `Branch` | String | `CSE` | Department / Branch |
| E | `Roll Number` | String | `21B91A0501` | College ID |
| F | `Phone Number` | String | `9876543210` | 10-digit mobile number |
| G | `Role` | String | `Executive` | Selected club role |
| H | `Purpose / Notes` | String | `Web Dev Project` | Purpose or manual check-in note |
| I | `Verification Method`| String | `Wi-Fi` / `GPS` | Verification method passed |

---

## 6. Development Tasks for Antigravity Agents

### Task 1: Claymorphic UI & Form Persistence (`index.html` & `styles.css`)
* [ ] Implement mobile-responsive layout styled with **Soft Claymorphism** using CSS custom properties (`:root`).
* [ ] Build header featuring the **Sreenidhi Ascend** branding theme.
* [ ] Implement `LocalStorage` auto-fill logic on page load.
* [ ] Add dynamic Check-In button disabling logic (faded, squishy disabled state) when session is active.
* [ ] Build a Claymorphic Modal for unlinked Check-Out attempts asking for entry time.

### Task 2: Presence Verification Engine (`verification.js`)
* [ ] Implement `checkGPSLocation(targetLat, targetLng, maxRadiusMeters)` using Haversine distance formula.
* [ ] Create master function `verifyPresence()` that calls the GPS check.
* [ ] Add Claymorphic error toast/banner when the verification check fails.

### Task 3: Google Apps Script Backend (`Code.gs` & Fetch Dispatcher)
* [ ] Implement `doPost(e)` function in Google Apps Script to parse JSON payload and append rows.
* [ ] Implement `submitAttendance(payload)` in JS using `fetch()` with `mode: 'no-cors'`.
* [ ] Update `club_session_status` in `LocalStorage` upon successful responses.

---

## 7. Verification & Acceptance Criteria

1. **Claymorphic Styling Test:**
   * Form inputs look recessed into the card surface (`inset` shadows).
   * Buttons display 3D inflated appearance with distinct drop/highlight shadows.
   * Palette strictly utilizes Ascend Navy (`#2d1b69`), Coral (`#f0533c`), Magenta (`#d81b60`), and Blue (`#0091ea`).
2. **Button State Test:**
   * Perform Check-In -> Check-In button transitions to transparent/disabled state (`opacity: 0.35`). State persists on refresh.
3. **Unlinked Check-Out Test:**
   * Clear session -> Click "Check-Out" -> Claymorphic prompt modal appears for manual time selection.
4. **Verification Test:**
   * Validates GPS radius and blocks entry if it fails.
