// =====================================================================
// EcoSwap Shell — Group 11
// Integration method: iframe composition + postMessage event contract
// =====================================================================
//
// >>> STEP 1: replace these 3 URLs with your teammates' LIVE deployed
//     URLs before you deploy the shell. <<<
//
const APPS = {
  catalog: {
    url: "https://ecoswap-catalog-discovery-lit.netlify.app/",
    source: "ecoswap-catalog",
  },
  cart: {
    url: "https://ecoswap-cart-checkout-vue.netlify.app/",
    source: "ecoswap-cart",
  },
  account: {
    url: "https://ecoswap-account-orders-7tqv.vercel.app/",
    source: "ecoswap-account",
  },
};

// ---------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------
const frames = {
  catalog: document.getElementById("frame-catalog"),
  cart: document.getElementById("frame-cart"),
  account: document.getElementById("frame-account"),
};

const navButtons = document.querySelectorAll(".nav-btn");
const cartBadge = document.getElementById("cart-badge");
const toastEl = document.getElementById("toast");

let activeApp = "catalog";
let cartCount = 0;
let toastTimer = null;

// Track readiness per child app + queue any forwarded message that arrives
// before that app's iframe has actually finished loading/mounting.
const frameReady = { catalog: false, cart: false, account: false };
const pendingQueue = { catalog: [], cart: [], account: [] };

function flushQueue(appId) {
  const frame = frames[appId];
  const app = APPS[appId];
  if (!frame?.contentWindow) return;

  while (pendingQueue[appId].length) {
    const { type, detail } = pendingQueue[appId].shift();
    frame.contentWindow.postMessage(
      { source: "ecoswap-shell", type, detail },
      new URL(app.url).origin
    );
  }
}

Object.keys(frames).forEach((appId) => {
  frames[appId].addEventListener("load", () => {
    frameReady[appId] = true;
    flushQueue(appId);
  });
});

// Load iframe src once (lazily is fine too, but loading all 3 up front
// keeps their state alive when you switch tabs back and forth).
Object.entries(APPS).forEach(([id, app]) => {
  frames[id].src = app.url;
});

// ---------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------
function switchApp(appId) {
  if (!frames[appId]) return;

  activeApp = appId;

  Object.entries(frames).forEach(([id, frame]) => {
    frame.classList.toggle("active", id === appId);
  });

  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.app === appId);
  });

  if (window.location.hash.slice(1) !== appId) {
    window.history.replaceState(null, "", `#${appId}`);
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchApp(btn.dataset.app));
});

document.querySelector(".brand").addEventListener("click", () => switchApp("catalog"));

window.addEventListener("hashchange", () => {
  const target = window.location.hash.slice(1);
  if (frames[target]) switchApp(target);
});

// Respect a deep link like shell-url.com/#cart on first load
const initialHash = window.location.hash.slice(1);
switchApp(frames[initialHash] ? initialHash : "catalog");

// ---------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

// ---------------------------------------------------------------------
// Cart badge
// ---------------------------------------------------------------------
function bumpCartBadge(by = 1) {
  cartCount += by;
  renderCartBadge();
}

function resetCartBadge() {
  cartCount = 0;
  renderCartBadge();
}

function renderCartBadge() {
  cartBadge.hidden = cartCount <= 0;
  cartBadge.textContent = String(cartCount);
}

// ---------------------------------------------------------------------
// Forward a message into one of the child apps
// ---------------------------------------------------------------------
function forwardTo(appId, type, detail) {
  const frame = frames[appId];
  const app = APPS[appId];
  if (!frame?.contentWindow) return;

  if (!frameReady[appId]) {
    // App hasn't finished loading yet — queue it and send once it's ready.
    pendingQueue[appId].push({ type, detail });
    return;
  }

  frame.contentWindow.postMessage(
    { source: "ecoswap-shell", type, detail },
    new URL(app.url).origin
  );
}

// ---------------------------------------------------------------------
// Central message bus — every child app talks to the shell through
// window.postMessage. Only accept messages from the 3 approved origins.
// ---------------------------------------------------------------------
const approvedOrigins = new Set(
  Object.values(APPS).map((app) => new URL(app.url).origin)
);

window.addEventListener("message", (event) => {
  if (!approvedOrigins.has(event.origin)) return;

  const data = event.data;
  if (!data || typeof data !== "object" || !data.type) return;

  switch (data.type) {
    // ---- from Catalog (Lit) ----
    case "catalog:navigate":
      switchApp(data.detail?.page === "cart" ? "cart" : "account");
      break;

    case "catalog:add-to-cart":
      bumpCartBadge(Number(data.detail?.quantity) || 1);
      forwardTo("cart", "shell:add-to-cart", data.detail);
      toast(`${data.detail?.product?.name || "Product"} sent to cart`);
      break;

    case "catalog:wishlist-toggle":
      forwardTo("account", "shell:wishlist-toggle", data.detail);
      toast(data.detail?.favorite ? "Saved to wishlist" : "Removed from wishlist");
      break;

    case "catalog:contact-seller":
      toast(`Message request sent to ${data.detail?.seller || "seller"}`);
      break;

    // ---- from Cart (Vue) ----
    case "cart:continue-shopping":
      switchApp("catalog");
      break;

    case "cart:go-to-account":
      switchApp("account");
      break;

    case "cart:order-placed":
      resetCartBadge();
      forwardTo("account", "shell:order-placed", data.detail);
      toast("Order placed! Check your order history in Account.");
      break;

    // ---- from Account (React) ----
    case "account:go-to-cart":
      switchApp("cart");
      break;

    case "ecoswap:user-login":
      toast(`Welcome back, ${data.detail?.name || data.detail?.email || "friend"}!`);
      break;

    case "ecoswap:user-register":
      toast(`Account created for ${data.detail?.name || data.detail?.email || "you"}!`);
      break;

    case "ecoswap:user-logout":
      toast("Logged out");
      break;

    default:
      console.log("[Shell] Unhandled message:", data);
  }
});
