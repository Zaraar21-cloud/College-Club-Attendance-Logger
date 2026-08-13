/**
 * Vanilla JavaScript implementation of BorderGlow
 * Converted from React component
 */

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x) { return x * x * x; }

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
  const t0 = performance.now() + delay;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(Math.max(elapsed / duration, 0), 1);
    if (elapsed >= 0) {
      onUpdate(start + (end - start) * ease(t));
    }
    if (t < 1) requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  requestAnimationFrame(tick);
}

class BorderGlow {
  constructor(element, options = {}) {
    this.element = element;

    this.options = {
      className: '',
      edgeSensitivity: 30,
      glowColor: '40 80 80',
      backgroundColor: '#120F17',
      borderRadius: 28,
      glowRadius: 40,
      glowIntensity: 1.0,
      coneSpread: 25,
      animated: false,
      colors: ['#c084fc', '#f472b6', '#38bdf8'],
      fillOpacity: 0.5,
      ...options
    };

    this.init();
  }

  init() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'border-glow-card ' + this.options.className;

    this.edgeLight = document.createElement('span');
    this.edgeLight.className = 'edge-light';

    this.inner = document.createElement('div');
    this.inner.className = 'border-glow-inner';

    this.element.parentNode.insertBefore(this.wrapper, this.element);
    this.inner.appendChild(this.element);
    this.wrapper.appendChild(this.edgeLight);
    this.wrapper.appendChild(this.inner);

    this.applyStyles();

    this.handlePointerMove = this.handlePointerMove.bind(this);
    window.addEventListener('pointermove', this.handlePointerMove);

    this.isFocused = false;
    this.element.addEventListener('focus', () => {
      this.isFocused = true;
      this.wrapper.style.setProperty('--edge-proximity', '100');
    });
    this.element.addEventListener('blur', () => {
      this.isFocused = false;
    });

    if (this.options.animated) {
      this.playAnimation();
    }
  }

  applyStyles() {
    const vars = {
      '--card-bg': this.options.backgroundColor,
      '--edge-sensitivity': this.options.edgeSensitivity,
      '--border-radius': `${this.options.borderRadius}px`,
      '--glow-padding': `${this.options.glowRadius}px`,
      '--cone-spread': this.options.coneSpread,
      '--fill-opacity': this.options.fillOpacity,
      ...buildGlowVars(this.options.glowColor, this.options.glowIntensity),
      ...buildGradientVars(this.options.colors)
    };

    for (const [key, value] of Object.entries(vars)) {
      this.wrapper.style.setProperty(key, value);
    }
  }

  getCenterOfElement(el) {
    const rect = el.getBoundingClientRect();
    return [rect.width / 2, rect.height / 2];
  }

  getEdgeProximity(el, x, y) {
    const [cx, cy] = this.getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }

  getCursorAngle(el, x, y) {
    const [cx, cy] = this.getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }

  handlePointerMove(e) {
    const rect = this.wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let edge = this.getEdgeProximity(this.wrapper, x, y);
    const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    if (isInside || this.isFocused) {
      edge = 1; // Full glow when inside or focused!
    }
    const angle = this.getCursorAngle(this.wrapper, x, y);

    this.wrapper.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    this.wrapper.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }

  playAnimation() {
    const card = this.wrapper;
    const angleStart = 110;
    const angleEnd = 465;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animateValue({ duration: 500, onUpdate: v => card.style.setProperty('--edge-proximity', v) });
    animateValue({
      ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
        card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
      }
    });
    animateValue({
      ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
        card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
      }
    });
    animateValue({
      ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => card.style.setProperty('--edge-proximity', v),
      onEnd: () => card.classList.remove('sweep-active'),
    });
  }
}
