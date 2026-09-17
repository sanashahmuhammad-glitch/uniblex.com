import type { AdType } from "./protocol";

export type AdSurfaceLease = { container: HTMLElement; close: (reason?: string) => void };
export type AdSurfaceOpenOptions = { format: AdType; placement: string; onRequestClose?: () => void; closeAllowed?: boolean };

/** A host-owned, single-lease surface. It never creates or simulates ad creative. */
export class HostAdSurfaceController {
  private active: { overlay: HTMLElement; previousFocus: Element | null; close: (reason?: string) => void } | null = null;
  constructor(private host: HTMLElement, private gameFrame: HTMLIFrameElement) {}

  isOpen() { return !!this.active; }

  open(options: AdSurfaceOpenOptions): AdSurfaceLease {
    if (this.active) throw new Error("Host ad surface is already occupied.");
    const document = this.host.ownerDocument;
    const previousFocus = document.activeElement;
    const overlay = document.createElement("section");
    overlay.className = "absolute inset-0 z-[100] flex min-h-0 items-center justify-center bg-black/95 p-3 text-white sm:p-6";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", options.format === "rewarded" ? "Rewarded advertisement" : "Advertisement");
    overlay.tabIndex = -1;
    overlay.dataset.uniblexAdSurface = "host";
    const panel = document.createElement("div");
    panel.className = "relative flex h-full max-h-[900px] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-white/15 bg-black";
    const label = document.createElement("p");
    label.className = "sr-only";
    label.textContent = `Advertisement surface for ${options.placement}`;
    const container = document.createElement("div");
    container.className = "min-h-0 flex-1";
    container.dataset.uniblexProviderMount = "true";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "absolute right-3 top-3 z-10 min-h-11 rounded-lg border border-white/20 bg-black/80 px-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-uniblex-blue";
    closeButton.textContent = "Close ad";
    if (options.closeAllowed === false) closeButton.hidden = true;
    panel.append(label, container, closeButton);
    overlay.append(panel);
    this.host.append(overlay);
    const close = (_reason?: string) => {
      if (this.active?.overlay !== overlay) return;
      this.active = null;
      overlay.remove();
      const view = document.defaultView;
      if (view && previousFocus instanceof view.HTMLElement && previousFocus.isConnected) previousFocus.focus();
      else if (this.gameFrame.isConnected) this.gameFrame.focus();
    };
    closeButton.addEventListener("click", () => {
      try { options.onRequestClose?.(); } finally { close("user"); }
    });
    this.active = { overlay, previousFocus, close };
    (options.closeAllowed === false ? overlay : closeButton).focus();
    return { container, close };
  }

  close(reason = "host") { this.active?.close(reason); }
  destroy() { this.close("destroyed"); }
}
