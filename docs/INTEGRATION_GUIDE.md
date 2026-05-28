# NHAI Offline Auth Integration Guide

This project can run as a complete standalone terminal or as a drop-in offline authentication module inside an existing app.

## Web Widget

Add the widget script and mount the terminal where your existing app needs face authentication.

```html
<script type="module" src="./sdk/web/nhai-offline-auth-widget.js"></script>

<nhai-offline-auth
  src="./web_terminal/"
  view="verify"
  height="820px"
  theme="dark">
</nhai-offline-auth>
```

Supported `view` values:

- `dashboard`
- `enroll`
- `verify`
- `liveness`
- `database`
- `logs`
- `system`
- `architecture`

The iframe uses `allow="camera; fullscreen"` so browser camera permission works from the embedded widget.

## Iframe `postMessage` API

When embedded, control the terminal through messages:

```js
const frame = document.querySelector("nhai-offline-auth").shadowRoot.querySelector("iframe");

frame.contentWindow.postMessage({
  scope: "NHAI_OFFLINE_AUTH",
  type: "setView",
  view: "enroll"
}, "*");

frame.contentWindow.postMessage({
  scope: "NHAI_OFFLINE_AUTH",
  type: "openEnrollment",
  entityId: "NHAI-EMP-014",
  name: "New Operator"
}, "*");

window.addEventListener("message", (event) => {
  if (event.data?.scope === "NHAI_OFFLINE_AUTH" && event.data.type === "ready") {
    console.log("Offline auth module ready", event.data.version);
  }
});
```

## Direct Browser API

If the terminal page is loaded directly in the same window, the page exposes:

```js
window.NHAIOfflineAuth.setView("verify");
window.NHAIOfflineAuth.openEnrollment("NHAI-EMP-012", "NEW USER");
window.NHAIOfflineAuth.getUsers();
window.NHAIOfflineAuth.addUser(["NHAI-EMP-013", "TEST USER", "2026-05-27 22:00", "91%", "0"]);
window.NHAIOfflineAuth.setUsers(existingUsers);
window.NHAIOfflineAuth.exportUsers();
```

## Python SDK

Use the Python facade when integrating into an existing backend, kiosk app, or offline processing script.

```python
from sdk.python.nhai_offline_auth import NHAIOfflineAuth

auth = NHAIOfflineAuth()
auth.enroll("person.jpg", user_id="NHAI-EMP-012", name="New User")
result = auth.authenticate("camera_frame.jpg")

if result.accepted:
    print(result.user_id, result.confidence)
else:
    print(result.reasons)
```

## Local HTTP API

For existing apps that prefer HTTP integration, run:

```bash
./run_full_system.sh
```

Then call:

```text
GET  http://localhost:8080/health
POST http://localhost:8080/detect
POST http://localhost:8080/datalake/v3/enroll
POST http://localhost:8080/datalake/v3/authenticate
```

All inference remains local. No cloud APIs are required.

## Responsive Behavior

The terminal is responsive across:

- mobile phones: stacked nav, single-column cards, portrait camera viewport
- tablets: reduced sidebar and collapsed dashboards
- laptops/desktops: full terminal layout with side navigation
- embedded mode: sidebar hidden and content fills the host container
