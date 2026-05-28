class NHAIOfflineAuthWidget extends HTMLElement {
  static get observedAttributes() {
    return ["src", "view", "height", "theme"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const src = this.getAttribute("src") || "./web_terminal/";
    const view = this.getAttribute("view") || "";
    const height = this.getAttribute("height") || "760px";
    const theme = this.getAttribute("theme") || "dark";
    const base = src.endsWith("/") ? src : `${src}/`;
    const url = view ? `${base}?embed=1&view=${encodeURIComponent(view)}` : base;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          inline-size: 100%;
          min-inline-size: 280px;
          color-scheme: ${theme};
        }
        iframe {
          display: block;
          inline-size: 100%;
          block-size: min(${height}, 100dvh);
          min-block-size: 560px;
          border: 1px solid rgba(34, 247, 238, 0.32);
          background: #050910;
        }
        @media (max-width: 700px) {
          iframe {
            block-size: 100dvh;
            min-block-size: 640px;
          }
        }
      </style>
      <iframe title="NHAI Offline Face Authentication" allow="camera; fullscreen" src="${url}"></iframe>
    `;
  }
}

if (!customElements.get("nhai-offline-auth")) {
  customElements.define("nhai-offline-auth", NHAIOfflineAuthWidget);
}

export { NHAIOfflineAuthWidget };
