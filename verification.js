/* ============================================================
   Sreenidhi Ascend — Presence Verification Engine
   ============================================================
   Verification: GPS Geolocation
   A transaction is approved if GPS verification succeeds.
   ============================================================ */

const VerificationConfig = {
  CLUB_LAT: 0.0,
  CLUB_LNG: 0.0,

  // Distance threshold — how close the user must be (meters)
  MAX_RADIUS_METERS: 100,

  // Total time budget for the GPS warmup + reading cycle (ms)
  GPS_TIMEOUT_MS: 15000,

  // Minimum time to collect readings before deciding (ms).
  // GPS needs a few seconds to lock onto satellites indoors.
  GPS_MIN_WATCH_MS: 3000,

  // Hard cap — if reported distance exceeds this, reject even if accuracy is poor.
  // Prevents someone genuinely far away from passing due to huge accuracy circles.
  ABSOLUTE_MAX_DISTANCE: 1000,
};

/**
 * Haversine formula — compute distance in meters between two lat/lng points.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines if a GPS reading places the user plausibly within the club room.
 *
 * The phone reports: "I am at point X, but my true position could be anywhere
 * within ±accuracy meters of X." So the closest the user could actually be to
 * the club is (distance - accuracy). If that value is ≤ MAX_RADIUS_METERS,
 * the user COULD be inside the radius — we accept it.
 *
 * A hard cap (ABSOLUTE_MAX_DISTANCE) prevents someone 5km away with ±4.9km
 * accuracy from sneaking through.
 *
 * @param {number} distance  — haversine distance in meters
 * @param {number} accuracy  — GPS accuracy in meters (±)
 * @returns {boolean}
 */
function isWithinRange(distance, accuracy) {
  // Hard cap: no matter what, reject if reported distance is absurd
  if (distance > VerificationConfig.ABSOLUTE_MAX_DISTANCE) return false;

  // The closest the user could truly be = distance - accuracy (floor at 0)
  const closestPossible = Math.max(0, distance - accuracy);
  return closestPossible <= VerificationConfig.MAX_RADIUS_METERS;
}

/**
 * Check if the user's GPS location is within the allowed radius of the club room.
 *
 * Uses watchPosition to collect multiple readings as the GPS warms up.
 * Picks the most accurate reading and uses accuracy-aware distance logic
 * so indoor readings with poor accuracy (±200m–1km) still work.
 *
 * @returns {Promise<{success: boolean, distance: number|null, accuracy: number|null, error: string|null}>}
 */
function checkGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ success: false, distance: null, accuracy: null, error: 'Geolocation not supported by this browser.' });
      return;
    }

    let bestReading = null;   // { latitude, longitude, accuracy, distance }
    let watchId = null;
    let settled = false;
    const startTime = Date.now();

    function settle(result) {
      if (settled) return;
      settled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      clearTimeout(hardTimeoutId);
      resolve(result);
    }

    // Hard timeout — use best reading we have, or fail
    const hardTimeoutId = setTimeout(() => {
      if (bestReading) {
        evaluateAndSettle(true);
      } else {
        settle({
          success: false,
          distance: null,
          accuracy: null,
          error: 'GPS check timed out. Could not get a location fix — try moving near a window.',
        });
      }
    }, VerificationConfig.GPS_TIMEOUT_MS);

    function evaluateAndSettle(forced = false) {
      if (!bestReading) return;

      const elapsed = Date.now() - startTime;

      // Wait for minimum watch period to collect better readings (unless forced by timeout)
      if (!forced && elapsed < VerificationConfig.GPS_MIN_WATCH_MS) return;

      const { distance, accuracy } = bestReading;

      if (isWithinRange(distance, accuracy)) {
        settle({
          success: true,
          distance: Math.round(distance),
          accuracy: Math.round(accuracy),
          error: null,
        });
      } else {
        settle({
          success: false,
          distance: Math.round(distance),
          accuracy: Math.round(accuracy),
          error: `Too far from club room: ${Math.round(distance)}m away (accuracy ±${Math.round(accuracy)}m, max allowed ${VerificationConfig.MAX_RADIUS_METERS}m).`,
        });
      }
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const distance = haversineDistance(
          latitude,
          longitude,
          VerificationConfig.CLUB_LAT,
          VerificationConfig.CLUB_LNG
        );

        console.log(`[GPS] Reading: ${distance.toFixed(1)}m away, accuracy ±${accuracy.toFixed(1)}m`);

        // Keep the reading with the best (lowest) accuracy value
        if (!bestReading || accuracy < bestReading.accuracy) {
          bestReading = { latitude, longitude, accuracy, distance };
        }

        // If we got a reading that's clearly within range, resolve immediately
        if (isWithinRange(distance, accuracy)) {
          settle({
            success: true,
            distance: Math.round(distance),
            accuracy: Math.round(accuracy),
            error: null,
          });
          return;
        }

        // Otherwise, try to settle after the minimum watch period
        evaluateAndSettle();
      },
      (geoError) => {
        let errorMsg;
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMsg = 'Location permission denied. Please allow GPS access.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable.';
            break;
          case geoError.TIMEOUT:
            errorMsg = 'GPS request timed out. Try again near a window.';
            break;
          default:
            errorMsg = 'Unknown geolocation error.';
        }
        settle({ success: false, distance: null, accuracy: null, error: errorMsg });
      },
      {
        enableHighAccuracy: true,
        timeout: VerificationConfig.GPS_TIMEOUT_MS - 1000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Master verification — verifies user presence via GPS.
 * @returns {Promise<{verified: boolean, method: string|null, details: string}>}
 */
async function verifyPresence() {
  const gpsResult = await checkGPSLocation();

  if (gpsResult.success) {
    return {
      verified: true,
      method: 'GPS',
      details: `Verified via GPS (${gpsResult.distance}m from club)`,
    };
  }

  console.log(`[Verification] GPS check failed: ${gpsResult.error}`);

  return {
    verified: false,
    method: null,
    details: `Verification failed.\n• GPS: ${gpsResult.error}`,
  };
}
