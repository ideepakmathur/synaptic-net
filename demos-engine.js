import * as THREE from 'three';

// Procedural textures
function createDotTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.25, 'rgba(235, 245, 255, 0.95)');
  grad.addColorStop(0.5, 'rgba(120, 195, 255, 0.45)');
  grad.addColorStop(0.8, 'rgba(42, 66, 247, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// -------------------------------------------------------------
// DEMO 1: Starfield Drift
// -------------------------------------------------------------
export function createDemo1(canvas, container) {
  const scene = new THREE.Scene();
  let w = container.clientWidth || 800;
  let h = container.clientHeight || 500;
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.z = 250;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const STAR_COUNT = 1000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const speeds = new Float32Array(STAR_COUNT);

  const bounds = { xMin: -350, xMax: 350, yMin: -250, yMax: 250, zMin: -200, zMax: 150 };
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#e0e7ff'), new THREE.Color('#93c5fd'), new THREE.Color('#67e8f9')];

  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    positions[i3] = THREE.MathUtils.randFloat(bounds.xMin, bounds.xMax);
    positions[i3 + 1] = THREE.MathUtils.randFloat(bounds.yMin, bounds.yMax);
    positions[i3 + 2] = THREE.MathUtils.randFloat(bounds.zMin, bounds.zMax);
    const depthFactor = (positions[i3 + 2] - bounds.zMin) / (bounds.zMax - bounds.zMin);
    speeds[i] = 0.4 + 0.6 * depthFactor;
    const col = palette[Math.floor(Math.random() * palette.length)];
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 4.5,
    map: createDotTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const clock = new THREE.Clock();
  let isRunning = true;
  let animId;

  function loop() {
    if (!isRunning) return;
    animId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);
    const pos = geometry.attributes.position.array;
    const drift = 12.0 * dt;

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      pos[i3] += 0.85 * speeds[i] * drift;
      pos[i3 + 1] += 0.52 * speeds[i] * drift;
      if (pos[i3] > bounds.xMax || pos[i3 + 1] > bounds.yMax) {
        if (Math.random() > 0.5) {
          pos[i3] = bounds.xMin;
          pos[i3 + 1] = THREE.MathUtils.randFloat(bounds.yMin, bounds.yMax);
        } else {
          pos[i3] = THREE.MathUtils.randFloat(bounds.xMin, bounds.xMax);
          pos[i3 + 1] = bounds.yMin;
        }
      }
    }
    geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  loop();

  return {
    resize: (nw, nh) => {
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    },
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      renderer.dispose();
    }
  };
}

// -------------------------------------------------------------
// DEMO 2: Neural Net Connecting Nodes with Latch Pulses
// -------------------------------------------------------------
export function createDemo2(canvas, container) {
  const scene = new THREE.Scene();
  let w = container.clientWidth || 800;
  let h = container.clientHeight || 500;
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
  camera.position.z = 175;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const bounds = { x: 170, y: 110, z: 80 };
  const nodeCount = 100;
  const nodes = [];

  class NetNode {
    constructor(id) {
      this.id = id;
      this.pos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(bounds.x * 2),
        THREE.MathUtils.randFloatSpread(bounds.y * 2),
        THREE.MathUtils.randFloatSpread(bounds.z * 2)
      );
      this.vel = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(3.5),
        THREE.MathUtils.randFloatSpread(3.5),
        THREE.MathUtils.randFloatSpread(2.0)
      );
      this.pulseTimer = 0;
      this.connectedIds = new Set();
    }
    update(dt) {
      this.pos.addScaledVector(this.vel, dt);
      ['x', 'y', 'z'].forEach(axis => {
        if (this.pos[axis] > bounds[axis]) { this.pos[axis] = bounds[axis]; this.vel[axis] *= -1; }
        else if (this.pos[axis] < -bounds[axis]) { this.pos[axis] = -bounds[axis]; this.vel[axis] *= -1; }
      });
      if (this.pulseTimer > 0) this.pulseTimer = Math.max(0, this.pulseTimer - dt);
    }
  }

  for (let i = 0; i < nodeCount; i++) nodes.push(new NetNode(i));

  const activeLinks = [];
  class Link {
    constructor(a, b) {
      this.nodeA = a; this.nodeB = b;
      this.progress = 0; this.pulseTimer = 0; this.age = 0;
      this.lifetime = THREE.MathUtils.randFloat(7, 14);
      this.isFull = false;
    }
    update(dt) {
      this.age += dt;
      if (this.progress < 1) {
        this.progress += 0.8 * dt;
        if (this.progress >= 1) {
          this.progress = 1; this.isFull = true;
          this.pulseTimer = 1.2;
          this.nodeA.pulseTimer = 1.2;
          this.nodeB.pulseTimer = 1.2;
        }
      }
      if (this.pulseTimer > 0) this.pulseTimer = Math.max(0, this.pulseTimer - dt);
    }
    get isDead() {
      return this.nodeA.pos.distanceTo(this.nodeB.pos) > 85 || this.age > this.lifetime;
    }
  }

  const linkKeys = new Set();
  function pairKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

  function tryConnect() {
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    if (a.connectedIds.size >= 3) return;
    let closest = null, closestDist = Infinity;
    for (let b of nodes) {
      if (a === b || b.connectedIds.size >= 3 || a.connectedIds.has(b.id)) continue;
      const d = a.pos.distanceTo(b.pos);
      if (d < 65 && d < closestDist) { closestDist = d; closest = b; }
    }
    if (closest) {
      const key = pairKey(a.id, closest.id);
      if (!linkKeys.has(key)) {
        linkKeys.add(key);
        a.connectedIds.add(closest.id);
        closest.connectedIds.add(a.id);
        activeLinks.push(new Link(a, closest));
      }
    }
  }

  // Geometry
  const nodeGeo = new THREE.BufferGeometry();
  const nodePositions = new Float32Array(nodeCount * 3);
  const nodeColors = new Float32Array(nodeCount * 3);
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

  const nodeMat = new THREE.PointsMaterial({
    size: 5.5,
    map: createDotTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Points(nodeGeo, nodeMat));

  const maxLines = 400;
  const lineGeo = new THREE.BufferGeometry();
  const linePositions = new Float32Array(maxLines * 6);
  const lineColors = new Float32Array(maxLines * 6);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.LineSegments(lineGeo, lineMat));

  const clock = new THREE.Clock();
  let spawnTimer = 0;
  let isRunning = true;
  let animId;

  function loop() {
    if (!isRunning) return;
    animId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);

    spawnTimer += dt;
    if (spawnTimer > 0.22) { spawnTimer = 0; tryConnect(); }

    const nPos = nodeGeo.attributes.position.array;
    const nCol = nodeGeo.attributes.color.array;
    for (let i = 0; i < nodeCount; i++) {
      const n = nodes[i];
      n.update(dt);
      const i3 = i * 3;
      nPos[i3] = n.pos.x; nPos[i3 + 1] = n.pos.y; nPos[i3 + 2] = n.pos.z;
      if (n.pulseTimer > 0) {
        nCol[i3] = 1.0; nCol[i3 + 1] = 1.0; nCol[i3 + 2] = 1.0;
      } else {
        nCol[i3] = 0.55; nCol[i3 + 1] = 0.78; nCol[i3 + 2] = 1.0;
      }
    }
    nodeGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.color.needsUpdate = true;

    const lPos = lineGeo.attributes.position.array;
    const lCol = lineGeo.attributes.color.array;
    let lineIdx = 0;

    for (let i = activeLinks.length - 1; i >= 0; i--) {
      const link = activeLinks[i];
      link.update(dt);
      if (link.isDead) {
        linkKeys.delete(pairKey(link.nodeA.id, link.nodeB.id));
        link.nodeA.connectedIds.delete(link.nodeB.id);
        link.nodeB.connectedIds.delete(link.nodeA.id);
        activeLinks.splice(i, 1);
        continue;
      }
      if (lineIdx < maxLines) {
        const p1 = link.nodeA.pos;
        const p2 = link.nodeA.pos.clone().lerp(link.nodeB.pos, link.progress);
        const idx = lineIdx * 6;
        lPos[idx] = p1.x; lPos[idx+1] = p1.y; lPos[idx+2] = p1.z;
        lPos[idx+3] = p2.x; lPos[idx+4] = p2.y; lPos[idx+5] = p2.z;
        let r = 0.25, g = 0.55, b = 1.0;
        if (link.pulseTimer > 0) {
          const p = link.pulseTimer / 1.2;
          r += 0.75 * p; g += 0.45 * p;
        }
        lCol[idx] = r; lCol[idx+1] = g; lCol[idx+2] = b;
        lCol[idx+3] = r; lCol[idx+4] = g; lCol[idx+5] = b;
        lineIdx++;
      }
    }
    lineGeo.setDrawRange(0, lineIdx * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    scene.rotation.y += 0.0006;
    renderer.render(scene, camera);
  }
  loop();

  return {
    resize: (nw, nh) => {
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    },
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      renderer.dispose();
    }
  };
}

// -------------------------------------------------------------
// DEMO 3: Fast Neural Net with Ripple Waves
// -------------------------------------------------------------
export function createDemo3(canvas, container) {
  return createRippleNetCommon(canvas, container, {
    waveSpeed: 110.0,
    wavelength: 22.0,
    waveDuration: 1.6,
    hasLines: true,
    nodeCount: 150
  });
}

// -------------------------------------------------------------
// DEMO 4: Pure Dot Grid Water Ripple (Zero lines)
// -------------------------------------------------------------
export function createDemo4(canvas, container) {
  const scene = new THREE.Scene();
  let w = container.clientWidth || 800;
  let h = container.clientHeight || 500;
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  camera.position.set(0, 0, 180);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const spacing = 6.2;
  const cols = Math.ceil(240 / spacing);
  const rows = Math.ceil(150 / spacing);
  const total = cols * rows;

  const basePositions = new Float32Array(total * 3);
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);

  const xOff = ((cols - 1) * spacing) / 2;
  const yOff = ((rows - 1) * spacing) / 2;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i3 = idx * 3;
      const x = c * spacing - xOff;
      const y = r * spacing - yOff;
      basePositions[i3] = x; basePositions[i3+1] = y; basePositions[i3+2] = 0;
      positions[i3] = x; positions[i3+1] = y; positions[i3+2] = 0;
      colors[i3] = 0.40; colors[i3+1] = 0.62; colors[i3+2] = 0.95;
      idx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3.5,
    map: createDotTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Points(geometry, material));

  const ripples = [];
  class Ripple {
    constructor(x, y, str = 1.0) {
      this.x = x; this.y = y; this.str = str;
      this.age = 0; this.radius = 0; this.active = true;
    }
    update(dt) {
      this.age += dt; this.radius += 90.0 * dt;
      if (this.age >= 2.2) this.active = false;
    }
    get intensity() {
      const p = this.age / 2.2;
      return Math.max(0, (1 - p) * (1 - p) * this.str);
    }
  }

  function spawnRipple(x, y, str = 1.0) {
    ripples.push(new Ripple(x, y, str));
    if (ripples.length > 10) ripples.shift();
  }

  // Pointer
  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2(-999, -999);
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3();
  let lastTime = 0, lastPos = new THREE.Vector2();

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);
    raycaster.ray.intersectPlane(planeZ, mouseWorld);
    const now = performance.now();
    const cur = new THREE.Vector2(e.clientX, e.clientY);
    if (cur.distanceTo(lastPos) > 22 && now - lastTime > 65) {
      lastTime = now; lastPos.copy(cur);
      spawnRipple(mouseWorld.x, mouseWorld.y, 0.85);
    }
  }

  function onPointerDown(e) {
    const rect = container.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);
    raycaster.ray.intersectPlane(planeZ, mouseWorld);
    spawnRipple(mouseWorld.x, mouseWorld.y, 1.5);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerdown', onPointerDown);

  const clock = new THREE.Clock();
  let idleTimer = 0, isRunning = true, animId;

  function loop() {
    if (!isRunning) return;
    animId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);

    idleTimer += dt;
    if (idleTimer > 2.5) {
      idleTimer = 0;
      spawnRipple(THREE.MathUtils.randFloatSpread(160), THREE.MathUtils.randFloatSpread(100), 0.9);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].update(dt);
      if (!ripples[i].active) ripples.splice(i, 1);
    }

    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;

    for (let i = 0; i < total; i++) {
      const i3 = i * 3;
      const bx = basePositions[i3];
      const by = basePositions[i3+1];
      let dispZ = 0;
      let maxEx = 0;

      for (let r of ripples) {
        const dx = bx - r.x; const dy = by - r.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const delta = dist - r.radius;
        if (Math.abs(delta) < 36.0) {
          const phase = (delta / 24.0) * Math.PI * 2;
          const env = Math.max(0, 1 - Math.abs(delta) / 36.0);
          const wave = Math.cos(phase) * env * r.intensity;
          dispZ += wave * 14.0;
          if (wave > maxEx) maxEx = wave;
        }
      }

      pos[i3+2] = dispZ;
      if (maxEx > 0.05) {
        col[i3] = 0.40 + 0.60 * maxEx;
        col[i3+1] = 0.62 + 0.38 * maxEx;
        col[i3+2] = 1.0;
      } else {
        col[i3] = 0.38; col[i3+1] = 0.60; col[i3+2] = 0.94;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
  }
  loop();

  return {
    resize: (nw, nh) => {
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    },
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
    }
  };
}

// -------------------------------------------------------------
// DEMO 5: Synaptic Net with Slow Water Ripples (Your Chosen Default)
// -------------------------------------------------------------
export function createDemo5(canvas, container) {
  return createRippleNetCommon(canvas, container, {
    waveSpeed: 36.0,
    wavelength: 28.0,
    waveDuration: 4.5,
    hasLines: true,
    nodeCount: 130
  });
}

// Common function for Demo 3 & Demo 5
function createRippleNetCommon(canvas, container, opts) {
  const scene = new THREE.Scene();
  let w = container.clientWidth || 800;
  let h = container.clientHeight || 500;
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
  camera.position.set(0, 0, 165);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const bounds = { x: 180, y: 110, z: 70 };
  const nodeCount = opts.nodeCount || 130;
  const nodes = [];

  class NetNode {
    constructor(id) {
      this.id = id;
      this.basePos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(bounds.x * 2),
        THREE.MathUtils.randFloatSpread(bounds.y * 2),
        THREE.MathUtils.randFloatSpread(bounds.z * 2)
      );
      this.renderPos = this.basePos.clone();
      this.vel = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(2.0),
        THREE.MathUtils.randFloatSpread(2.0),
        THREE.MathUtils.randFloatSpread(1.2)
      );
      this.pulse = 0;
    }
    update(dt, ripples) {
      this.basePos.addScaledVector(this.vel, dt);
      ['x', 'y', 'z'].forEach(a => {
        if (this.basePos[a] > bounds[a]) { this.basePos[a] = bounds[a]; this.vel[a] *= -1; }
        else if (this.basePos[a] < -bounds[a]) { this.basePos[a] = -bounds[a]; this.vel[a] *= -1; }
      });

      let dispZ = 0, radX = 0, radY = 0, maxEx = 0;
      for (let r of ripples) {
        if (!r.active) continue;
        const dx = this.basePos.x - r.x;
        const dy = this.basePos.y - r.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        const delta = d - r.radius;
        const span = opts.wavelength * 1.5;
        if (Math.abs(delta) < span) {
          const phase = (delta / opts.wavelength) * Math.PI * 2;
          const env = Math.max(0, 1 - Math.abs(delta) / span);
          const wave = Math.cos(phase) * env * r.intensity;
          dispZ += wave * 10.0;
          if (d > 0.1) {
            radX += (dx / d) * wave * 3.5;
            radY += (dy / d) * wave * 3.5;
          }
          if (wave > maxEx) maxEx = wave;
        }
      }
      this.renderPos.x = this.basePos.x + radX;
      this.renderPos.y = this.basePos.y + radY;
      this.renderPos.z = this.basePos.z + dispZ;

      if (maxEx > 0.05) this.pulse = Math.max(this.pulse, maxEx);
      else if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 1.2);
    }
  }

  for (let i = 0; i < nodeCount; i++) nodes.push(new NetNode(i));

  const ripples = [];
  class Ripple {
    constructor(x, y, str = 1.0) {
      this.x = x; this.y = y; this.str = str;
      this.radius = 0; this.age = 0; this.active = true;
    }
    update(dt) {
      this.age += dt; this.radius += opts.waveSpeed * dt;
      if (this.age >= opts.waveDuration) this.active = false;
    }
    get intensity() {
      const p = this.age / opts.waveDuration;
      return Math.max(0, (1 - p) * (1 - p) * this.str);
    }
  }

  function spawnRipple(x, y, str = 1.0) {
    ripples.push(new Ripple(x, y, str));
    if (ripples.length > 6) ripples.shift();
  }

  // Pointer
  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2(-999, -999);
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3();
  let lastTime = 0, lastPos = new THREE.Vector2();

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);
    raycaster.ray.intersectPlane(planeZ, mouseWorld);

    const now = performance.now();
    const cur = new THREE.Vector2(e.clientX, e.clientY);
    const minMove = opts.waveSpeed < 50 ? 60 : 30;
    const minDelay = opts.waveSpeed < 50 ? 450 : 100;
    if (cur.distanceTo(lastPos) > minMove && now - lastTime > minDelay) {
      lastTime = now; lastPos.copy(cur);
      spawnRipple(mouseWorld.x, mouseWorld.y, 0.85);
    }
  }

  function onPointerDown(e) {
    const rect = container.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);
    raycaster.ray.intersectPlane(planeZ, mouseWorld);
    spawnRipple(mouseWorld.x, mouseWorld.y, 1.4);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerdown', onPointerDown);

  // Mesh
  const nodeGeo = new THREE.BufferGeometry();
  const nPositions = new Float32Array(nodeCount * 3);
  const nColors = new Float32Array(nodeCount * 3);
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nPositions, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(nColors, 3));

  const nodeMat = new THREE.PointsMaterial({
    size: 5.5,
    map: createDotTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Points(nodeGeo, nodeMat));

  const maxLines = 900;
  const lineGeo = new THREE.BufferGeometry();
  const lPositions = new Float32Array(maxLines * 6);
  const lColors = new Float32Array(maxLines * 6);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lPositions, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lColors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.LineSegments(lineGeo, lineMat));

  const clock = new THREE.Clock();
  let idleTimer = 0, isRunning = true, animId;

  function loop() {
    if (!isRunning) return;
    animId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);

    idleTimer += dt;
    if (idleTimer > 3.8) {
      idleTimer = 0;
      spawnRipple(THREE.MathUtils.randFloatSpread(140), THREE.MathUtils.randFloatSpread(80), 0.9);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].update(dt);
      if (!ripples[i].active) ripples.splice(i, 1);
    }

    const np = nodeGeo.attributes.position.array;
    const nc = nodeGeo.attributes.color.array;
    for (let i = 0; i < nodeCount; i++) {
      const n = nodes[i];
      n.update(dt, ripples);
      const i3 = i * 3;
      np[i3] = n.renderPos.x; np[i3+1] = n.renderPos.y; np[i3+2] = n.renderPos.z;
      if (n.pulse > 0.05) {
        const p = n.pulse;
        nc[i3] = 0.50 + 0.50*p; nc[i3+1] = 0.80 + 0.20*p; nc[i3+2] = 1.0;
      } else {
        nc[i3] = 0.40; nc[i3+1] = 0.65; nc[i3+2] = 1.0;
      }
    }
    nodeGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.color.needsUpdate = true;

    // Lines
    const lp = lineGeo.attributes.position.array;
    const lc = lineGeo.attributes.color.array;
    let lineCount = 0;

    for (let i = 0; i < nodeCount; i++) {
      const a = nodes[i];
      let conns = 0;
      for (let j = i + 1; j < nodeCount; j++) {
        if (conns >= 4) break;
        const b = nodes[j];
        const dist = a.renderPos.distanceTo(b.renderPos);
        if (dist < 42 && lineCount < maxLines) {
          conns++;
          const idx = lineCount * 6;
          lp[idx] = a.renderPos.x; lp[idx+1] = a.renderPos.y; lp[idx+2] = a.renderPos.z;
          lp[idx+3] = b.renderPos.x; lp[idx+4] = b.renderPos.y; lp[idx+5] = b.renderPos.z;
          const alpha = Math.max(0.08, 1 - dist / 42);
          const p = Math.max(a.pulse, b.pulse);
          const r = 0.18 + 0.75 * p;
          const g = (0.42 + 0.55 * p) * alpha;
          const bl = 1.0 * alpha;
          lc[idx] = r; lc[idx+1] = g; lc[idx+2] = bl;
          lc[idx+3] = r; lc[idx+4] = g; lc[idx+5] = bl;
          lineCount++;
        }
      }
    }
    lineGeo.setDrawRange(0, lineCount * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
  }
  loop();

  return {
    resize: (nw, nh) => {
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    },
    triggerRipple: (x = 0, y = 0, s = 1.5) => spawnRipple(x, y, s),
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
    }
  };
}