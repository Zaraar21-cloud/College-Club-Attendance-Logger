/**
 * Vanilla JavaScript implementation of DotField
 * Converted from React component
 */

class DotField {
  constructor(container, options = {}) {
    this.container = container;
    
    // Default options
    this.options = {
      dotRadius: 1.5,
      dotSpacing: 14,
      cursorRadius: 500,
      cursorForce: 0.1,
      bulgeOnly: true,
      bulgeStrength: 67,
      glowRadius: 160,
      sparkle: false,
      waveAmplitude: 0,
      gradientFrom: 'rgba(168, 85, 247, 0.35)',
      gradientTo: 'rgba(180, 151, 207, 0.25)',
      glowColor: '#120F17',
      ...options
    };

    this.TWO_PI = Math.PI * 2;
    this.dots = [];
    this.mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    this.size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
    this.glowOpacity = 0;
    this.engagement = 0;
    this.frameCount = 0;
    this.rafId = null;
    this.resizeTimer = null;
    this.glowId = `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`;

    this.init();
  }

  init() {
    // Set up container styling
    // Removed position: relative to allow CSS (like position: fixed) to control it
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.container.appendChild(this.canvas);

    // Create SVG glow
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.position = 'absolute';
    this.svg.style.inset = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.pointerEvents = 'none';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    radialGradient.id = this.glowId;

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', this.options.glowColor);
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'transparent');

    radialGradient.appendChild(stop1);
    radialGradient.appendChild(stop2);
    defs.appendChild(radialGradient);
    this.svg.appendChild(defs);

    this.glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.glowCircle.setAttribute('cx', '-9999');
    this.glowCircle.setAttribute('cy', '-9999');
    this.glowCircle.setAttribute('r', this.options.glowRadius);
    this.glowCircle.setAttribute('fill', `url(#${this.glowId})`);
    this.glowCircle.style.opacity = '0';
    this.glowCircle.style.willChange = 'opacity';
    
    this.svg.appendChild(this.glowCircle);
    this.container.appendChild(this.svg);

    // Bind methods
    this.resize = this.resize.bind(this);
    this.doResize = this.doResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.updateMouseSpeed = this.updateMouseSpeed.bind(this);
    this.tick = this.tick.bind(this);

    // Event listeners
    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    
    this.speedInterval = setInterval(this.updateMouseSpeed, 20);
    
    this.doResize();
    this.rafId = requestAnimationFrame(this.tick);
  }

  resize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(this.doResize, 100);
  }

  doResize() {
    const rect = this.container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.size = {
      w,
      h,
      offsetX: rect.left + window.scrollX,
      offsetY: rect.top + window.scrollY,
    };

    this.buildDots(w, h);
  }

  buildDots(w, h) {
    const p = this.options;
    const step = p.dotRadius + p.dotSpacing;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    const padX = (w % step) / 2;
    const padY = (h % step) / 2;
    this.dots = new Array(rows * cols);
    let idx = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ax = padX + col * step + step / 2;
        const ay = padY + row * step + step / 2;
        this.dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
      }
    }
  }

  onMouseMove(e) {
    this.mouse.x = e.pageX - this.size.offsetX;
    this.mouse.y = e.pageY - this.size.offsetY;
  }

  updateMouseSpeed() {
    const dx = this.mouse.prevX - this.mouse.x;
    const dy = this.mouse.prevY - this.mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.mouse.speed += (dist - this.mouse.speed) * 0.5;
    if (this.mouse.speed < 0.001) this.mouse.speed = 0;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
  }

  tick() {
    this.frameCount++;
    const p = this.options;
    const len = this.dots.length;
    const t = this.frameCount * 0.02;

    const targetEngagement = Math.min(this.mouse.speed / 5, 1);
    this.engagement += (targetEngagement - this.engagement) * 0.06;
    if (this.engagement < 0.001) this.engagement = 0;
    
    this.glowOpacity += (this.engagement - this.glowOpacity) * 0.08;

    if (this.glowCircle) {
      this.glowCircle.setAttribute('cx', this.mouse.x);
      this.glowCircle.setAttribute('cy', this.mouse.y);
      this.glowCircle.style.opacity = this.glowOpacity;
    }

    this.ctx.clearRect(0, 0, this.size.w, this.size.h);

    const grad = this.ctx.createLinearGradient(0, 0, this.size.w, this.size.h);
    grad.addColorStop(0, p.gradientFrom);
    grad.addColorStop(1, p.gradientTo);
    this.ctx.fillStyle = grad;

    const cr = p.cursorRadius;
    const crSq = cr * cr;
    const rad = p.dotRadius / 2;
    const isBulge = p.bulgeOnly;

    this.ctx.beginPath();

    for (let i = 0; i < len; i++) {
      const d = this.dots[i];
      const dx = this.mouse.x - d.ax;
      const dy = this.mouse.y - d.ay;
      const distSq = dx * dx + dy * dy;

      if (distSq < crSq && this.engagement > 0.01) {
        const dist = Math.sqrt(distSq);
        if (isBulge) {
          const t = 1 - dist / cr;
          const push = t * t * p.bulgeStrength * this.engagement;
          const angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          const angle = Math.atan2(dy, dx);
          const move = (500 / dist) * (this.mouse.speed * p.cursorForce);
          d.vx += Math.cos(angle) * -move;
          d.vy += Math.sin(angle) * -move;
        }
      } else if (isBulge) {
        d.sx += (d.ax - d.sx) * 0.1;
        d.sy += (d.ay - d.sy) * 0.1;
      }

      if (!isBulge) {
        d.vx *= 0.9;
        d.vy *= 0.9;
        d.x = d.ax + d.vx;
        d.y = d.ay + d.vy;
        d.sx += (d.x - d.sx) * 0.1;
        d.sy += (d.y - d.sy) * 0.1;
      }

      let drawX = d.sx;
      let drawY = d.sy;
      if (p.waveAmplitude > 0) {
        drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
      }

      if (p.sparkle) {
        const hash = ((i * 2654435761) ^ (this.frameCount >> 3)) >>> 0;
        if ((hash % 100) < 3) {
          this.ctx.moveTo(drawX + rad * 1.8, drawY);
          this.ctx.arc(drawX, drawY, rad * 1.8, 0, this.TWO_PI);
        } else {
          this.ctx.moveTo(drawX + rad, drawY);
          this.ctx.arc(drawX, drawY, rad, 0, this.TWO_PI);
        }
      } else {
        this.ctx.moveTo(drawX + rad, drawY);
        this.ctx.arc(drawX, drawY, rad, 0, this.TWO_PI);
      }
    }

    this.ctx.fill();
    this.rafId = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    clearInterval(this.speedInterval);
    clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('mousemove', this.onMouseMove);
    if(this.container.contains(this.canvas)) this.container.removeChild(this.canvas);
    if(this.container.contains(this.svg)) this.container.removeChild(this.svg);
  }
}
