/* ============================================================
   Sreenidhi Ascend — Application Controller (app.js)
   ============================================================
   Handles: LocalStorage sync, session state, form submission,
   Google Sheets dispatch, toast notifications, and modal logic.
   ============================================================ */

// ──────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────

const AppConfig = {
  // Deployed Google Apps Script Web App URL.
  // Set in config.js (git-ignored — see config.example.js).
  APPS_SCRIPT_URL: (window.AppSecrets && window.AppSecrets.appsScriptUrl) || '',

  // LocalStorage keys
  LS_KEYS: {
    name: 'club_name',
    branch: 'club_branch',
    rollNumber: 'club_rollNumber',
    phone: 'club_phone',
    role: 'club_role',
    sessionStatus: 'club_session_status',
    lastCheckinTime: 'club_last_checkin_time',
    sessionId: 'club_firestore_session_id',
  },

  // Toast auto-dismiss (ms)
  TOAST_DURATION: 4000,

  // Auto-checkout limit (3 hours in ms)
  AUTO_CHECKOUT_LIMIT_MS: 3 * 60 * 60 * 1000,
};

// ──────────────────────────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────────────────────────

const DOM = {
  // Form inputs
  nameInput: null,
  branchInput: null,
  rollInput: null,
  phoneInput: null,
  roleSelect: null,
  purposeInput: null,

  // Buttons
  btnCheckin: null,
  btnCheckout: null,

  // Status bar
  statusBar: null,
  statusText: null,

  // Modal
  modalOverlay: null,
  modalTimeInput: null,
  modalCancel: null,
  modalConfirm: null,

  // Toast container
  toastContainer: null,

  // Main card (form)
  mainCard: null,

  // Active session view
  activeSession: null,
  checkinTimeDisplay: null,
  countdownTimer: null,
  countdownLabel: null,

  // Success popup
  successOverlay: null,
  successOkayBtn: null,
};

// ──────────────────────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  cacheDOMReferences();
  loadFromLocalStorage();
  syncSessionUI();
  bindEvents();
  startAutoCheckoutMonitor();
});

function cacheDOMReferences() {
  DOM.nameInput = document.getElementById('input-name');
  DOM.branchInput = document.getElementById('input-branch');
  DOM.rollInput = document.getElementById('input-roll');
  DOM.phoneInput = document.getElementById('input-phone');
  DOM.roleSelect = document.getElementById('input-role');
  DOM.purposeInput = document.getElementById('input-purpose');

  DOM.btnCheckin = document.getElementById('btn-checkin');
  DOM.btnCheckout = document.getElementById('btn-checkout');

  DOM.statusBar = document.getElementById('status-bar');
  DOM.statusText = document.getElementById('status-text');

  DOM.modalOverlay = document.getElementById('modal-overlay');
  DOM.modalTimeInput = document.getElementById('modal-time');
  DOM.modalCancel = document.getElementById('modal-cancel');
  DOM.modalConfirm = document.getElementById('modal-confirm');

  DOM.toastContainer = document.getElementById('toast-container');

  // New elements
  DOM.mainCard = document.getElementById('main-card');
  DOM.activeSession = document.getElementById('active-session');
  DOM.checkinTimeDisplay = document.getElementById('checkin-time-display');
  DOM.countdownTimer = document.getElementById('countdown-timer');
  DOM.countdownLabel = document.getElementById('countdown-label');
  DOM.successOverlay = document.getElementById('success-overlay');
  DOM.successOkayBtn = document.getElementById('success-okay-btn');
}

// ──────────────────────────────────────────────────────────────
// LOCAL STORAGE — LOAD & SAVE
// ──────────────────────────────────────────────────────────────

function loadFromLocalStorage() {
  const keys = AppConfig.LS_KEYS;

  DOM.nameInput.value = localStorage.getItem(keys.name) || '';
  DOM.branchInput.value = localStorage.getItem(keys.branch) || '';
  DOM.rollInput.value = localStorage.getItem(keys.rollNumber) || '';
  DOM.phoneInput.value = localStorage.getItem(keys.phone) || '';
  DOM.roleSelect.value = localStorage.getItem(keys.role) || 'Member';
}

function saveFieldToLocalStorage(field, value) {
  const keyMap = {
    'input-name': AppConfig.LS_KEYS.name,
    'input-branch': AppConfig.LS_KEYS.branch,
    'input-roll': AppConfig.LS_KEYS.rollNumber,
    'input-phone': AppConfig.LS_KEYS.phone,
    'input-role': AppConfig.LS_KEYS.role,
  };

  const lsKey = keyMap[field];
  if (lsKey) {
    localStorage.setItem(lsKey, value);
  }
}

function setSessionStatus(status, timestamp) {
  localStorage.setItem(AppConfig.LS_KEYS.sessionStatus, status);
  if (timestamp) {
    localStorage.setItem(AppConfig.LS_KEYS.lastCheckinTime, timestamp);
  }
}

function getSessionStatus() {
  return localStorage.getItem(AppConfig.LS_KEYS.sessionStatus) || 'OUT';
}

// ──────────────────────────────────────────────────────────────
// SESSION UI SYNC
// ──────────────────────────────────────────────────────────────

let countdownIntervalId = null;

function syncSessionUI() {
  const status = getSessionStatus();

  if (status === 'IN') {
    // Show active session view, hide form
    DOM.mainCard.style.display = 'none';
    DOM.activeSession.style.display = 'block';

    // Display check-in time
    const checkinISO = localStorage.getItem(AppConfig.LS_KEYS.lastCheckinTime);
    if (checkinISO) {
      const checkinDate = new Date(checkinISO);
      DOM.checkinTimeDisplay.textContent = checkinDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    // Start countdown timer
    startCountdownTimer();

    DOM.statusBar.className = 'status-bar status--in';
    DOM.statusText.textContent = 'Checked In';
  } else {
    // Show form, hide active session view
    DOM.mainCard.style.display = 'block';
    DOM.activeSession.style.display = 'none';

    // Stop countdown
    stopCountdownTimer();

    DOM.btnCheckin.disabled = false;
    DOM.statusBar.className = 'status-bar status--out';
    DOM.statusText.textContent = 'Not Checked In';
  }
}

function startCountdownTimer() {
  stopCountdownTimer(); // clear any existing
  updateCountdownDisplay(); // immediate update
  countdownIntervalId = setInterval(updateCountdownDisplay, 1000);
}

function stopCountdownTimer() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

function updateCountdownDisplay() {
  const checkinISO = localStorage.getItem(AppConfig.LS_KEYS.lastCheckinTime);
  if (!checkinISO) return;

  const checkinDate = new Date(checkinISO);
  const autoCheckoutMs = getAutoCheckoutTime(checkinDate).getTime();
  const remainingMs = autoCheckoutMs - Date.now();

  if (remainingMs <= 0) {
    DOM.countdownTimer.textContent = '00:00:00';
    DOM.countdownLabel.textContent = '(Auto check-out imminent)';
    stopCountdownTimer();
    return;
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  DOM.countdownTimer.textContent =
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  DOM.countdownLabel.textContent = '(Auto check-out in this time)';
}

// ──────────────────────────────────────────────────────────────
// EVENT BINDINGS
// ──────────────────────────────────────────────────────────────

function bindEvents() {
  // Auto-save form fields on input
  const formFields = [
    DOM.nameInput,
    DOM.branchInput,
    DOM.rollInput,
    DOM.phoneInput,
    DOM.roleSelect,
  ];

  formFields.forEach((el) => {
    el.addEventListener('input', () => saveFieldToLocalStorage(el.id, el.value));
    el.addEventListener('change', () => saveFieldToLocalStorage(el.id, el.value));
  });

  // Action buttons
  DOM.btnCheckin.addEventListener('click', handleCheckIn);
  DOM.btnCheckout.addEventListener('click', handleCheckOut);

  // Success popup okay button
  DOM.successOkayBtn.addEventListener('click', closeSuccessPopup);

  // Modal buttons
  DOM.modalCancel.addEventListener('click', closeModal);
  DOM.modalConfirm.addEventListener('click', handleManualCheckout);

  // Close modal on overlay click
  DOM.modalOverlay.addEventListener('click', (e) => {
    if (e.target === DOM.modalOverlay) closeModal();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });
}

// ──────────────────────────────────────────────────────────────
// FORM VALIDATION
// ──────────────────────────────────────────────────────────────

function validateForm(isCheckOut = false) {
  const name = DOM.nameInput.value.trim();
  const branch = DOM.branchInput.value.trim();
  const roll = DOM.rollInput.value.trim();
  const phone = DOM.phoneInput.value.trim();
  const purpose = DOM.purposeInput.value.trim();

  if (!name) {
    showToast('Please enter your name.', 'warning');
    DOM.nameInput.focus();
    return false;
  }
  if (!branch) {
    showToast('Please enter your branch.', 'warning');
    DOM.branchInput.focus();
    return false;
  }
  if (!roll) {
    showToast('Please enter your roll number.', 'warning');
    DOM.rollInput.focus();
    return false;
  }
  if (!phone || !/^\d{10}$/.test(phone)) {
    showToast('Please enter a valid 10-digit phone number.', 'warning');
    DOM.phoneInput.focus();
    return false;
  }
  if (!isCheckOut && !purpose) {
    showToast('Please enter your purpose or notes.', 'warning');
    DOM.purposeInput.focus();
    return false;
  }

  return true;
}

// ──────────────────────────────────────────────────────────────
// TIME CONSTRAINTS
// ──────────────────────────────────────────────────────────────

function isWithinCollegeHours(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const isMorning = minutes >= 9 * 60 && minutes < 12 * 60 + 20; // 9:00 AM to 12:19 PM
  const isAfternoon = minutes >= 13 * 60 && minutes < 16 * 60 + 10; // 1:00 PM to 4:09 PM
  return isMorning || isAfternoon;
}

function getAutoCheckoutTime(checkinDate) {
  const baseCheckout = new Date(checkinDate.getTime() + AppConfig.AUTO_CHECKOUT_LIMIT_MS); // 3 hours

  const noonBound = new Date(checkinDate);
  noonBound.setHours(12, 20, 0, 0); // 12:20 PM

  const afternoonBound = new Date(checkinDate);
  afternoonBound.setHours(16, 10, 0, 0); // 4:10 PM

  if (checkinDate < noonBound) {
    return baseCheckout > noonBound ? noonBound : baseCheckout;
  } else {
    return baseCheckout > afternoonBound ? afternoonBound : baseCheckout;
  }
}

// ──────────────────────────────────────────────────────────────
// CHECK-IN HANDLER
// ──────────────────────────────────────────────────────────────

async function handleCheckIn() {
  if (!validateForm()) return;

  if (!isWithinCollegeHours()) {
    showToast('Check-ins are only allowed between 9:00 AM - 12:20 PM and 1:00 PM - 4:10 PM.', 'error');
    return;
  }

  const lastCheckin = localStorage.getItem(AppConfig.LS_KEYS.lastCheckinTime);
  if (lastCheckin) {
    const lastCheckinDate = new Date(lastCheckin);
    if (!isNaN(lastCheckinDate.getTime())) {
      const autoCheckoutTimeMs = getAutoCheckoutTime(lastCheckinDate).getTime();
      const remainingMs = autoCheckoutTimeMs - Date.now();
      if (remainingMs > 0) {
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remMins = remainingMinutes % 60;
        const timeMsg = remainingHours > 0
          ? `${remainingHours} hr ${remMins} min`
          : `${remMins} min`;
        showToast(`You have already checked in today. Cooldown active. Please wait ${timeMsg} before checking in again.`, 'warning');
        return;
      }
    }
  }

  setButtonLoading(DOM.btnCheckin, true);

  const verification = await verifyPresence();

  if (!verification.verified) {
    setButtonLoading(DOM.btnCheckin, false);
    showToast(verification.details, 'error');
    return;
  }

  const payload = buildPayload('CHECK-IN', verification.method, DOM.purposeInput.value.trim());

  // Write active session to Firestore
  try {
    const docRef = await db.collection('active_sessions').add({
      name: payload.name,
      branch: payload.branch,
      rollNumber: payload.rollNumber,
      phone: payload.phone,
      role: payload.role,
      clientTime: Date.now(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    localStorage.setItem(AppConfig.LS_KEYS.sessionId, docRef.id);
  } catch (err) {
    console.error('[Ascend] Firestore Check-in Error:', err);
  }

  // Submit attendance in the background (optimistic UI update)
  submitAttendance(payload);

  setButtonLoading(DOM.btnCheckin, false);
  setSessionStatus('IN', new Date().toISOString());

  // Show success popup (form will be hidden when popup closes)
  showSuccessPopup();
}

// ──────────────────────────────────────────────────────────────
// CHECK-OUT HANDLER
// ──────────────────────────────────────────────────────────────

async function handleCheckOut() {
  if (!validateForm(true)) return;

  if (!isWithinCollegeHours()) {
    showToast('Check-outs are only allowed between 9 AM and 4 PM.', 'error');
    return;
  }

  const status = getSessionStatus();

  if (status !== 'IN') {
    const lastCheckin = localStorage.getItem(AppConfig.LS_KEYS.lastCheckinTime);
    if (lastCheckin) {
      const lastCheckinDate = new Date(lastCheckin);
      if (!isNaN(lastCheckinDate.getTime())) {
        const autoCheckoutTimeMs = getAutoCheckoutTime(lastCheckinDate).getTime();
        const remainingMs = autoCheckoutTimeMs - Date.now();
        if (remainingMs > 0) {
          const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
          const remainingHours = Math.floor(remainingMinutes / 60);
          const remMins = remainingMinutes % 60;
          const timeMsg = remainingHours > 0
            ? `${remainingHours} hr ${remMins} min`
            : `${remMins} min`;
          showToast(`You have already checked in today. Cooldown active. Please wait ${timeMsg} before logging another session.`, 'warning');
          return;
        }
      }
    }

    // Unlinked check-out — show modal for manual entry time
    openModal();
    return;
  }

  // Normal check-out
  setButtonLoading(DOM.btnCheckout, true);

  const verification = await verifyPresence();

  if (!verification.verified) {
    setButtonLoading(DOM.btnCheckout, false);
    showToast(verification.details, 'error');
    return;
  }

  const payload = buildPayload('CHECK-OUT', verification.method, DOM.purposeInput.value.trim());

  // Remove from Firestore
  const sessionId = localStorage.getItem(AppConfig.LS_KEYS.sessionId);
  if (sessionId) {
    try {
      await db.collection('active_sessions').doc(sessionId).delete();
      localStorage.removeItem(AppConfig.LS_KEYS.sessionId);
    } catch (err) {
      console.error('[Ascend] Firestore Check-out Error:', err);
    }
  }

  // Submit attendance in the background
  submitAttendance(payload);

  setButtonLoading(DOM.btnCheckout, false);
  setSessionStatus('OUT', null);
  syncSessionUI();
  showToast(`Checked out successfully`, 'success');
}

// ──────────────────────────────────────────────────────────────
// MANUAL CHECK-OUT (MODAL)
// ──────────────────────────────────────────────────────────────

async function handleManualCheckout() {
  const manualTime = DOM.modalTimeInput.value;

  if (!manualTime) {
    showToast('Please select your entry time.', 'warning');
    return;
  }

  const [hoursStr, minutesStr] = manualTime.split(':');
  const h = parseInt(hoursStr, 10);
  const m = parseInt(minutesStr, 10);

  const now = new Date();
  const manualDate = new Date(now);
  manualDate.setHours(h, m, 0, 0);

  // Constraints Validation
  if (manualDate >= now) {
    showToast('Check-in time must be in the past (less than current check-out time).', 'warning');
    return;
  }

  const diffMs = now.getTime() - manualDate.getTime();
  if (diffMs > 3 * 60 * 60 * 1000) {
    showToast('Manual check-in time cannot be more than 3 hours ago.', 'warning');
    return;
  }

  if (!isWithinCollegeHours(manualDate)) {
    showToast('Selected check-in time must be between 9 AM and 4 PM.', 'warning');
    return;
  }

  closeModal();
  setButtonLoading(DOM.btnCheckout, true);

  const verification = await verifyPresence();

  if (!verification.verified) {
    setButtonLoading(DOM.btnCheckout, false);
    showToast(verification.details, 'error');
    return;
  }

  // Convert to 12-hour AM/PM format
  let displayH = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedManualTime = `${String(displayH).padStart(2, '0')}:${minutesStr}:00 ${ampm}`;

  const purposeValue = DOM.purposeInput.value.trim();

  const payload = buildPayload('CHECK-OUT', verification.method, purposeValue);
  payload.manualCheckInTime = formattedManualTime;
  // Submit attendance in the background
  submitAttendance(payload);

  setButtonLoading(DOM.btnCheckout, false);
  setSessionStatus('OUT', null);
  syncSessionUI();
  showToast(`✓ Manual entry logged & checked out (${verification.method})`, 'success');
}

// ──────────────────────────────────────────────────────────────
// PAYLOAD BUILDER
// ──────────────────────────────────────────────────────────────

function buildPayload(action, verificationMethod, purpose) {
  const dateStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = new Date().toLocaleTimeString('en-US'); // hh:mm:ss AM/PM

  return {
    timestamp: `${dateStr}, ${timeStr}`,
    action: action,
    name: DOM.nameInput.value.trim(),
    branch: DOM.branchInput.value.trim(),
    rollNumber: DOM.rollInput.value.trim(),
    phone: DOM.phoneInput.value.trim(),
    role: DOM.roleSelect.value,
    purpose: purpose || '',
    verificationMethod: verificationMethod || '',
  };
}

// ──────────────────────────────────────────────────────────────
// GOOGLE SHEETS SUBMISSION
// ──────────────────────────────────────────────────────────────

async function submitAttendance(payload) {
  try {
    if (!AppConfig.APPS_SCRIPT_URL) {
      showToast('⚠ Apps Script URL not configured. Check config.js', 'warning');
      console.warn('[Ascend] Apps Script URL placeholder — payload:', payload);
      // Return true for testing UI flow without backend
      return true;
    }

    const response = await fetch(AppConfig.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // no-cors responses are opaque — we treat them as success
    // since Apps Script returns 200 on successful doPost
    return true;
  } catch (err) {
    console.error('[Ascend] Submission error:', err);
    showToast('Failed to log attendance. Please try again.', 'error');
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// MODAL CONTROLS
// ──────────────────────────────────────────────────────────────

function openModal() {
  // Pre-fill with current time
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  DOM.modalTimeInput.value = `${hours}:${minutes}`;

  DOM.modalOverlay.classList.add('active');
  DOM.modalTimeInput.focus();
}

function closeModal() {
  DOM.modalOverlay.classList.remove('active');
}

// ──────────────────────────────────────────────────────────────
// SUCCESS POPUP CONTROLS
// ──────────────────────────────────────────────────────────────

function showSuccessPopup() {
  // Reset the checkmark animation by cloning the SVG
  const svg = DOM.successOverlay.querySelector('.checkmark-svg');
  if (svg) {
    const clone = svg.cloneNode(true);
    svg.parentNode.replaceChild(clone, svg);
  }

  DOM.successOverlay.classList.add('active');
}

function closeSuccessPopup() {
  DOM.successOverlay.classList.remove('active');
  // Now switch to the active session view
  syncSessionUI();
}

// ──────────────────────────────────────────────────────────────
// BUTTON LOADING STATE
// ──────────────────────────────────────────────────────────────

function setButtonLoading(btn, isLoading) {
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    // Re-sync disabled state based on session
    syncSessionUI();
  }
}

// ──────────────────────────────────────────────────────────────
// TOAST NOTIFICATION SYSTEM
// ──────────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, AppConfig.TOAST_DURATION);
}

// ──────────────────────────────────────────────────────────────
// AUTO CHECK-OUT SYSTEM
// ──────────────────────────────────────────────────────────────

let isAutoCheckingOut = false;

function startAutoCheckoutMonitor() {
  checkAutoCheckout();
  // Check every minute (when tab is active)
  setInterval(checkAutoCheckout, 60 * 1000);

  // Instantly check when user switches back to this tab or unlocks phone
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAutoCheckout();
    }
  });

  window.addEventListener('focus', checkAutoCheckout);
}

async function checkAutoCheckout() {
  if (isAutoCheckingOut) return;

  try {
    // Fetch all active sessions, since check-out times are dynamically bounded per session
    const snapshot = await db.collection('active_sessions').get();

    if (!snapshot.empty) {
      isAutoCheckingOut = true;
      const checkoutPromises = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const docId = docSnap.id;

        const checkinDate = new Date(data.clientTime);
        const checkoutDate = getAutoCheckoutTime(checkinDate);

        if (Date.now() >= checkoutDate.getTime()) {
          const dateStr = checkoutDate.toLocaleDateString('en-GB');
          const timeStr = checkoutDate.toLocaleTimeString('en-US');

          const autoPayload = {
            timestamp: `${dateStr}, ${timeStr}`,
            action: 'CHECK-OUT',
            name: data.name || 'Unknown',
            branch: data.branch || '',
            rollNumber: data.rollNumber || 'Unknown',
            phone: data.phone || '',
            role: data.role || '',
            purpose: '',
            verificationMethod: 'Auto (Time Limit Reached)',
          };

          const p = submitAttendance(autoPayload).then(() => {
            return db.collection('active_sessions').doc(docId).delete();
          });
          checkoutPromises.push(p);

          // If this is the current user's session, clear local status
          if (localStorage.getItem(AppConfig.LS_KEYS.sessionId) === docId) {
            setSessionStatus('OUT', null);
            localStorage.removeItem(AppConfig.LS_KEYS.sessionId);
            syncSessionUI();
            showToast('Auto checked-out (Time limit reached).', 'info');
          }
        }
      });

      await Promise.all(checkoutPromises);
      isAutoCheckingOut = false;
    }
  } catch (err) {
    console.error("[Ascend] Auto Sweep Error:", err);
    isAutoCheckingOut = false;
  }
}

// Function retained for compatibility if manually called, but logic moved above
async function performAutoCheckout(checkinTimeMs) {
  // Logic is now handled centrally in checkAutoCheckout
}
