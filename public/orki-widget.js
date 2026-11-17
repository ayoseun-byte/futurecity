/**
 * Orki Pay Button & Checkout SDK
 *
 * Compliance & Brand Rule:
 * - Button text wording is standardized ("Pay with Orki", "Buy with Orki", "Checkout with Orki").
 * - Merchants can customize font-family, text-color, background, size, border, radius, and shadow.
 * - Options:
 *    - `embedded`: boolean (default: true). If false, opens checkout in a new tab.
 *    - `redirectUrl`: string (optional URL to return customer after payment).
 */

(function (global) {
  'use strict';

  // Internal checkout host derived dynamically from the hosted script origin
  const SCRIPT_ORIGIN = (function () {
    try {
      if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
      }
    } catch (_) {}
    return typeof window !== 'undefined' ? window.location.origin : 'https://portal-orki.netlify.app';
  })();
  const INTERNAL_CHECKOUT_HOST = SCRIPT_ORIGIN;

  // Standardized Brand Copy Presets
  const BRAND_LABELS = {
    pay: 'Pay with Orki',
    buy: 'Buy with Orki',
    checkout: 'Checkout with Orki'
  };

  // Preset button sizes
  const SIZES = {
    sm: { padding: '8px 16px', fontSize: '13px', iconSize: '16px', gap: '8px', height: '36px' },
    md: { padding: '12px 22px', fontSize: '15px', iconSize: '20px', gap: '10px', height: '46px' },
    lg: { padding: '15px 28px', fontSize: '17px', iconSize: '24px', gap: '12px', height: '56px' }
  };

  // Preset shadows
  const SHADOWS = {
    none: 'none',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px -2px rgba(0, 0, 0, 0.15), 0 2px 6px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 25px -3px rgba(0, 0, 0, 0.2), 0 4px 10px -4px rgba(0, 0, 0, 0.1)',
    glow: '0 4px 20px rgba(99, 102, 241, 0.4)'
  };

  // SVG Monogram Icon
  const ORKI_ICON_SVG = `
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="currentColor" fill-opacity="0.2"/>
      <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7Z" fill="currentColor"/>
    </svg>
  `;

  class OrkiCheckoutModal {
    constructor(options = {}) {
      this.options = Object.assign(
        {
          embedded: true,
          redirectUrl: null,
          paylinkId: null,
          chargeToken: null,
          paymentUrl: null,
          onSuccess: () => {},
          onError: () => {},
          onClose: () => {},
        },
        options
      );

      this.overlay = null;
      this._messageListener = this._handleMessage.bind(this);
    }

    _resolveUrl() {
      let url = INTERNAL_CHECKOUT_HOST;
      if (this.options.paymentUrl) {
        url = this.options.paymentUrl;
      } else if (this.options.chargeToken) {
        url = `${INTERNAL_CHECKOUT_HOST}/charge/${this.options.chargeToken}`;
      } else if (this.options.paylinkId) {
        url = `${INTERNAL_CHECKOUT_HOST}/pay/${this.options.paylinkId}`;
      }

      // Append redirectUrl if provided
      if (this.options.redirectUrl) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}redirect_url=${encodeURIComponent(this.options.redirectUrl)}`;
      }

      return url;
    }

    open() {
      const targetUrl = this._resolveUrl();

      // If embedded is false, open in a new tab!
      if (!this.options.embedded) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // If embedded is true, maintain current behavior (modal overlay)
      if (this.overlay) return;

      this.overlay = document.createElement('div');
      this.overlay.id = 'orki-checkout-modal';
      Object.assign(this.overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: '999999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        transition: 'opacity 0.25s ease-out',
        opacity: '0',
      });

      const container = document.createElement('div');
      Object.assign(container.style, {
        position: 'relative',
        width: '100%',
        maxWidth: '460px',
        height: '660px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
      });

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Close payment';
      Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '-14px',
        right: '-14px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        color: '#f8fafc',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: '10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      closeBtn.addEventListener('click', () => this.close());
      container.appendChild(closeBtn);

      const iframe = document.createElement('iframe');
      iframe.src = targetUrl;
      iframe.setAttribute('allow', 'clipboard-write; payment; camera; microphone');
      Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '18px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backgroundColor: '#0f172a',
      });

      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      container.appendChild(iframe);
      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);

      window.addEventListener('message', this._messageListener);

      requestAnimationFrame(() => {
        this.overlay.style.opacity = '1';
      });
    }

    close() {
      if (!this.overlay) return;
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
      }, 250);

      window.removeEventListener('message', this._messageListener);
      if (this.options.onClose) this.options.onClose();
    }

    _handleMessage(event) {
      const data = event.data;
      if (!data) return;

      if (data.source === 'ORKI_WIDGET' || data.event?.startsWith('orki:')) {
        if (data.event === 'orki:payment:success') {
          if (this.options.onSuccess) {
            this.options.onSuccess(data.data);
          }
          // Redirect if redirectUrl is configured
          if (this.options.redirectUrl) {
            window.location.href = this.options.redirectUrl;
          }
        }
        if (data.event === 'orki:widget:close') {
          this.close();
        }
      }
    }
  }

  /**
   * The Standalone OrkiPayButton
   */
  const OrkiPayButton = {
    /**
     * Mount an Orki payment button into a target container
     * 
     * @param {string|HTMLElement} target - Selector or element
     * @param {Object} options - Config options
     */
    mount(target, options = {}) {
      const container = typeof target === 'string' ? document.querySelector(target) : target;
      if (!container) {
        console.error(`[OrkiPayButton] Target container "${target}" not found.`);
        return null;
      }

      const cfg = Object.assign(
        {
          // Identity
          paylinkId: null,
          chargeToken: null,

          // Embedded behavior (true: iframe modal, false: open in new tab)
          embedded: true,
          redirectUrl: null,

          // Standardized Label (Fixed wording)
          type: 'pay', // 'pay' ("Pay with Orki") | 'buy' | 'checkout'

          // Typography & Color Styling
          textColor: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '600',

          // Button Layout & Appearance
          background: '#0B1D3A',
          size: 'md',
          borderRadius: '12px',
          border: 'none',
          shadow: 'md',
          showIcon: true,
          fullWidth: true,

          // Callbacks
          onSuccess: () => {},
          onClose: () => {},
        },
        options
      );

      const labelText = BRAND_LABELS[cfg.type] || BRAND_LABELS.pay;
      const sizeProps = SIZES[cfg.size] || SIZES.md;
      const shadowValue = SHADOWS[cfg.shadow] || cfg.shadow;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'orki-pay-button';

      Object.assign(button.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sizeProps.gap,
        width: cfg.fullWidth ? '100%' : 'auto',
        minHeight: sizeProps.height,
        padding: sizeProps.padding,
        backgroundColor: cfg.background,
        color: cfg.textColor,
        fontSize: sizeProps.fontSize,
        fontWeight: cfg.fontWeight,
        fontFamily: cfg.fontFamily,
        borderRadius: cfg.borderRadius,
        border: cfg.border,
        boxShadow: shadowValue,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      });

      button.addEventListener('mouseenter', () => {
        button.style.filter = 'brightness(1.1)';
        button.style.transform = 'translateY(-1px)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.filter = 'brightness(1)';
        button.style.transform = 'translateY(0)';
      });
      button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.98)';
      });
      button.addEventListener('mouseup', () => {
        button.style.transform = 'translateY(-1px)';
      });

      let innerHTML = '';
      if (cfg.showIcon) {
        innerHTML += `<span style="width: ${sizeProps.iconSize}; height: ${sizeProps.iconSize}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${ORKI_ICON_SVG}</span>`;
      }
      innerHTML += `<span>${labelText}</span>`;
      button.innerHTML = innerHTML;

      const modal = new OrkiCheckoutModal(cfg);
      button.addEventListener('click', (e) => {
        e.preventDefault();
        modal.open();
      });

      container.innerHTML = '';
      container.appendChild(button);

      return {
        button,
        open: () => modal.open(),
        close: () => modal.close(),
      };
    }
  };

  // Export
  global.OrkiPayButton = OrkiPayButton;
  global.OrkiWidget = {
    renderButton: OrkiPayButton.mount,
    init: OrkiPayButton.mount
  };

})(typeof window !== 'undefined' ? window : this);
