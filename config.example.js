/* ============================================================
   Sreenidhi Ascend — Deployment Configuration (template)
   ============================================================
   Copy this file to `config.js` and fill in the real values for
   your own deployment. `config.js` is git-ignored so that project
   credentials and the club room's physical coordinates never end
   up in version control.

       cp config.example.js config.js

   IMPORTANT — read before you assume these values are secret:
   this is a fully client-side application. Every value below is
   downloaded by the browser and is therefore readable by anyone
   who opens DevTools on the deployed site. Keeping them out of
   the repository limits casual discovery, but it is not access
   control. Real protection comes from Firestore security rules
   (see `firestore.rules`) and from restricting the Firebase API
   key by HTTP referrer in the Google Cloud console.
   ============================================================ */

window.AppSecrets = {
  /**
   * Firebase Web SDK configuration.
   * Console → Project settings → General → Your apps → Web app.
   */
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
  },

  /**
   * The club room's centre point, used as the origin for the
   * Haversine distance check in `verification.js`.
   *
   * To find these: open Google Maps, right-click the centre of the
   * room, and click the "lat, lng" pair at the top of the menu to
   * copy it.
   */
  club: {
    // Left as null deliberately: the app refuses to run a proximity check
    // against unset coordinates rather than silently measuring your distance
    // from (0, 0) and telling members they are 6,000 km from the club.
    lat: null,
    lng: null,

    /** How close a member must be to check in, in metres. */
    radiusMeters: 30,
  },

  /**
   * Deployed Google Apps Script web app URL that receives attendance
   * payloads and writes them into the Google Sheet (see `Code.gs`).
   * Deploy → New deployment → Web app → Execute as "Me",
   * Who has access "Anyone". Leave as an empty string to run the UI
   * without a backend — submissions are then logged to the console
   * instead of being sent anywhere.
   */
  appsScriptUrl: '',
};
