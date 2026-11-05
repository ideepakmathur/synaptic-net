# Synaptic Net: Interactive Three.js Backgrounds

High-performance, lightweight, interactive WebGL background effects for modern websites. Includes organic neural networks, cosmic starfields, and concentric water-ripple particle nets.

Designed with a **zero-code drop-in API**: simply add a `<script>` tag and a `data-synaptic-bg` attribute to any HTML element.

---

## 🚀 Quick Start (Zero Code Drop-In)

### 1. Include the CDN Script

Add this to your HTML `<head>`:

```html
<script src="https://cdn.jsdelivr.net/gh/ideepakmathur/synaptic-net@main/synaptic-net.min.js"></script>
```

### 2. Add `data-synaptic-bg` to any section or div

```html
<section style="height: 500px; background: linear-gradient(135deg, #2a42f7, #0a1128);" data-synaptic-bg="ripple-net">
  <div style="position: relative; z-index: 2; color: #fff; text-align: center; padding-top: 150px;">
    <h1>Welcome to My Website</h1>
    <p>Interactive water ripple net renders automatically behind this content.</p>
  </div>
</section>
```

---

## 🎨 Available Background Effects

| Attribute Value | Description |
| :--- | :--- |
| `data-synaptic-bg="ripple-net"` | **(Recommended)** Synaptic network of connected nodes with slow, organic water ripples on mouse hover & click. |
| `data-synaptic-bg="dots-only"` | Matrix of dots that generate concentric water ripples on hover (Lottie-style droplet waves). |
| `data-synaptic-bg="neural-pulse"` | Connected neural nodes that send shockwave ring pulses through the network. |
| `data-synaptic-bg="starfield"` | Cosmic starfield with gentle directional drift on a modern blue gradient. |
| `data-synaptic-bg="geometric-net"` | Classic geometric network mesh with distance-based node connections. |

---

## ⚙️ How It Works

- **Zero Dependencies Needed**: If `three.js` is not already loaded on your page, the script will automatically load a minimal version asynchronously.
- **Auto Responsive**: Uses native `ResizeObserver` to instantly match the dimensions of any container (heroes, cards, sidebars, or full viewport).
- **Non-blocking Interaction**: The canvas automatically receives `pointer-events: none` and `z-index: 1`, ensuring your buttons, links, and forms remain 100% clickable.

---

## 💻 Vanilla JS / Modular Usage

If you prefer to initialize backgrounds manually with custom controls:

```javascript
import { createDemo5 } from './demos-engine.js';

const container = document.getElementById('hero');
const instance = createDemo5(container, {
  color: 0xffffff,
  lineColor: 0x64b5f6,
  nodeCount: 160
});

// Clean up when leaving or unmounting
// instance.destroy();
```

---

## 📁 Repository Structure

```
├── synaptic-net.min.js    # Self-contained zero-config drop-in bundle
├── demos-engine.js        # ES Module source with full customizer API
├── index.html             # Interactive showcase & real-time section sizer
├── test-cdn.html          # Minimal drop-in verification test page
└── README.md
```

---

## 📄 License

MIT License. Free to use in personal and commercial projects.
