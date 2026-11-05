import * as THREE from 'three';

/**
 * Creates an interactive Water Ripple Synaptic Net inside any target container element.
 * Automatically adapts to the target container's dimensions via ResizeObserver.
 * 
 * @param {HTMLElement} container - The DOM element to attach the effect to.
 * @param {Object} options - Customization options.
 * @returns {{ destroy: Function, resize: Function, triggerRipple: Function }}
 */
export function initRippleNet(container, options = {}) {
  if (!container) {
    throw new Error('[RippleNet] A valid container element must be provided.');
  }

  // Ensure container has relative/absolute positioning so canvas stays pinned within it
  const computedStyle = window.getComputedStyle(container);
  if (computedStyle.position === 'static') {
    container.style.position = 'relative';
  }

  const CONFIG = {
    nodeCount: options.nodeCount || 130,
    connectDistance: options.connectDistance || 42,
    maxConnectionsPerNode: options.maxConnectionsPerNode || 4,
    nodeBaseSize: options.nodeBaseSize || 5.5,
    bounds: {
      x: 180,
      y: 110,
      z: 70
    },
    ripple: {
      waveSpeed: options.waveSpeed || 36.0,
      wavelength: options.wavelength || 28.0,
      waveDuration: options.waveDuration || 4.5,
      amplitudeZ: options.amplitudeZ || 10.0,
      amplitudeRadial: options.amplitudeRadial || 3.5,
      maxRipples: options.maxRipples || 6
    }
  };

  // 1. Create Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'ripple-net-canvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = options.zIndex !== undefined ? options.zIndex : '-1';
  canvas.style.pointerEvents = 'none';
  container.prepend(canvas);

  let width = container.clientWidth || 300;
  let height = container.clientHeight || 200;

  // 2. Three.js Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  camera.position.set(0, 0, 165);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3. Procedural Star/Dot Glow Texture
  function createGlowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(240, 248, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(120, 195, 255, 0.45)');
    grad.addColorStop(0.8, 'rgba(42, 66, 247, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  const nodeTexture = createGlowTexture();

  // 4. Concentric Water Ripple Physics
  class WaterRipple {
    constructor(x, y, strength = 1.0) {
      this.origin = new THREE.Vector3(x, y, 0);
      this.radius = 0;
      this.age = 0;
      this.strength = strength;
      this.active = true;
    }

    update(dt) {
      this.age += dt;
      this.radius += CONFIG.ripple.waveSpeed * dt;
      if (this.age >= CONFIG.ripple.waveDuration) {
        this.active = false;
      }
    }

    get intensity() {
      const progress = this.age / CONFIG.ripple.waveDuration;
      return Math.max(0, (1 - progress) * (1 - progress) * this.strength);
    }
  }

  const ripples = [];

  function spawnRipple(x, y, strength = 1.0) {
    ripples.push(new WaterRipple(x, y, strength));
    if (ripples.length > CONFIG.ripple.maxRipples) {
      ripples.shift();
    }
  }

  // 5. Pointer Tracking within the specific container
  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2(-999, -999);
  const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouse3D = new THREE.Vector3();

  let lastSpawnTime = 0;
  const lastMousePos = new THREE.Vector2();

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }

    // Normalized coordinates inside the container
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNdc, camera);
    raycaster.ray.intersectPlane(planeZ0, mouse3D);

    const now = performance.now();
    const currentMouse = new THREE.Vector2(e.clientX, e.clientY);
    const movedDist = currentMouse.distanceTo(lastMousePos);

    if (movedDist > 55 && now - lastSpawnTime > 400) {
      lastSpawnTime = now;
      lastMousePos.copy(currentMouse);
      spawnRipple(mouse3D.x, mouse3D.y, 0.85);
    }
  }

  function onPointerDown(e) {
    const rect = container.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }

    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);
    raycaster.ray.intersectPlane(planeZ0, mouse3D);
    spawnRipple(mouse3D.x, mouse3D.y, 1.4);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerdown', onPointerDown);

  // 6. Node System
  class NetNode {
    constructor(id) {
      this.id = id;
      this.basePos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(CONFIG.bounds.x * 2),
        THREE.MathUtils.randFloatSpread(CONFIG.bounds.y * 2),
        THREE.MathUtils.randFloatSpread(CONFIG.bounds.z * 2)
      );
      this.renderPos = this.basePos.clone();
      this.vel = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(2.0),
        THREE.MathUtils.randFloatSpread(2.0),
        THREE.MathUtils.randFloatSpread(1.2)
      );
      this.pulse = 0;
    }

    update(dt) {
      this.basePos.addScaledVector(this.vel, dt);

      ['x', 'y', 'z'].forEach(axis => {
        const limit = CONFIG.bounds[axis];
        if (this.basePos[axis] > limit) {
          this.basePos[axis] = limit;
          this.vel[axis] *= -1;
        } else if (this.basePos[axis] < -limit) {
          this.basePos[axis] = -limit;
          this.vel[axis] *= -1;
        }
      });

      let totalDispZ = 0;
      let totalDispRadial = new THREE.Vector3();
      let maxExcitation = 0;

      for (let rip of ripples) {
        if (!rip.active) continue;
        const dx = this.basePos.x - rip.origin.x;
        const dy = this.basePos.y - rip.origin.y;
        const dist2D = Math.sqrt(dx * dx + dy * dy);
        const delta = dist2D - rip.radius;

        if (Math.abs(delta) < CONFIG.ripple.wavelength * 1.5) {
          const phase = (delta / CONFIG.ripple.wavelength) * Math.PI * 2;
          const envelope = Math.max(0, 1 - Math.abs(delta) / (CONFIG.ripple.wavelength * 1.5));
          const wave = Math.cos(phase) * envelope * rip.intensity;

          totalDispZ += wave * CONFIG.ripple.amplitudeZ;

          if (dist2D > 0.1) {
            const dirX = dx / dist2D;
            const dirY = dy / dist2D;
            totalDispRadial.x += dirX * wave * CONFIG.ripple.amplitudeRadial;
            totalDispRadial.y += dirY * wave * CONFIG.ripple.amplitudeRadial;
          }

          const excite = Math.max(0, wave);
          if (excite > maxExcitation) maxExcitation = excite;
        }
      }

      this.renderPos.x = this.basePos.x + totalDispRadial.x;
      this.renderPos.y = this.basePos.y + totalDispRadial.y;
      this.renderPos.z = this.basePos.z + totalDispZ;

      if (maxExcitation > 0.05) {
        this.pulse = Math.max(this.pulse, maxExcitation);
      } else if (this.pulse > 0) {
        this.pulse = Math.max(0, this.pulse - dt * 1.2);
      }
    }
  }

  const nodes = [];
  for (let i = 0; i < CONFIG.nodeCount; i++) {
    nodes.push(new NetNode(i));
  }

  // 7. Visual Geometry (Nodes & Lines)
  const nodeGeometry = new THREE.BufferGeometry();
  const nodePositions = new Float32Array(CONFIG.nodeCount * 3);
  const nodeColors = new Float32Array(CONFIG.nodeCount * 3);
  const nodeSizes = new Float32Array(CONFIG.nodeCount);

  nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
  nodeGeometry.setAttribute('size', new THREE.BufferAttribute(nodeSizes, 1));

  const nodeMaterial = new THREE.PointsMaterial({
    size: CONFIG.nodeBaseSize,
    map: nodeTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
  scene.add(nodePoints);

  const MAX_LINES = 900;
  const linePositions = new Float32Array(MAX_LINES * 2 * 3);
  const lineColors = new Float32Array(MAX_LINES * 2 * 3);

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lineSegments);

  // 8. Container Resize Observer
  function handleResize() {
    width = container.clientWidth || 300;
    height = container.clientHeight || 200;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const resizeObserver = new ResizeObserver(() => {
    handleResize();
  });
  resizeObserver.observe(container);

  // 9. Animation Loop
  let isRunning = true;
  let animId = null;
  const clock = new THREE.Clock();
  let idleTimer = 0;

  function animate() {
    if (!isRunning) return;
    animId = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);

    idleTimer += dt;
    if (idleTimer > 3.8) {
      idleTimer = 0;
      const rx = THREE.MathUtils.randFloatSpread(140);
      const ry = THREE.MathUtils.randFloatSpread(80);
      spawnRipple(rx, ry, 0.9);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].update(dt);
      if (!ripples[i].active) ripples.splice(i, 1);
    }

    const nPos = nodeGeometry.attributes.position.array;
    const nCol = nodeGeometry.attributes.color.array;
    const nSize = nodeGeometry.attributes.size.array;

    for (let i = 0; i < CONFIG.nodeCount; i++) {
      const node = nodes[i];
      node.update(dt);

      const i3 = i * 3;
      nPos[i3] = node.renderPos.x;
      nPos[i3 + 1] = node.renderPos.y;
      nPos[i3 + 2] = node.renderPos.z;

      if (node.pulse > 0.05) {
        const p = node.pulse;
        nCol[i3] = 0.50 + 0.50 * p;
        nCol[i3 + 1] = 0.80 + 0.20 * p;
        nCol[i3 + 2] = 1.0;
        nSize[i] = CONFIG.nodeBaseSize * (1 + 0.5 * p);
      } else {
        nCol[i3] = 0.40;
        nCol[i3 + 1] = 0.65;
        nCol[i3 + 2] = 1.0;
        nSize[i] = CONFIG.nodeBaseSize;
      }
    }

    nodeGeometry.attributes.position.needsUpdate = true;
    nodeGeometry.attributes.color.needsUpdate = true;
    nodeGeometry.attributes.size.needsUpdate = true;

    const lPos = lineGeometry.attributes.position.array;
    const lCol = lineGeometry.attributes.color.array;
    let lineCount = 0;

    for (let i = 0; i < CONFIG.nodeCount; i++) {
      const nodeA = nodes[i];
      let connections = 0;

      for (let j = i + 1; j < CONFIG.nodeCount; j++) {
        if (connections >= CONFIG.maxConnectionsPerNode) break;

        const nodeB = nodes[j];
        const dist = nodeA.renderPos.distanceTo(nodeB.renderPos);

        if (dist < CONFIG.connectDistance && lineCount < MAX_LINES) {
          connections++;
          const idx = lineCount * 6;

          lPos[idx] = nodeA.renderPos.x;
          lPos[idx + 1] = nodeA.renderPos.y;
          lPos[idx + 2] = nodeA.renderPos.z;

          lPos[idx + 3] = nodeB.renderPos.x;
          lPos[idx + 4] = nodeB.renderPos.y;
          lPos[idx + 5] = nodeB.renderPos.z;

          const alpha = Math.max(0.08, 1 - dist / CONFIG.connectDistance);
          const linePulse = Math.max(nodeA.pulse, nodeB.pulse);

          const r = 0.18 + 0.75 * linePulse;
          const g = (0.42 + 0.55 * linePulse) * alpha;
          const b = 1.0 * alpha;

          lCol[idx] = r;
          lCol[idx + 1] = g;
          lCol[idx + 2] = b;
          lCol[idx + 3] = r;
          lCol[idx + 4] = g;
          lCol[idx + 5] = b;

          lineCount++;
        }
      }
    }

    lineGeometry.setDrawRange(0, lineCount * 2);
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;

    if (mouseNdc.x !== -999) {
      camera.position.x += ((mouseNdc.x * 10) - camera.position.x) * 0.025;
      camera.position.y += ((mouseNdc.y * 7) - camera.position.y) * 0.025;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  animate();

  // 10. Public API
  return {
    resize: handleResize,
    triggerRipple: (x = 0, y = 0, strength = 1.5) => {
      spawnRipple(x, y, strength);
    },
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      resizeObserver.disconnect();
      renderer.dispose();
      canvas.remove();
    }
  };
}