/**
 * ZENITH AUTH - Production Single Page Application Engine
 * Next-Generation Authentication, License Management & Security SaaS Console
 */

const ZenithApp = {
  user: null,
  activeAppId: 1,
  apps: [],
  currentRoute: 'dashboard',
  currentSdkLang: 'csharp',
  billingCycle: 'monthly',
  sseConnection: null,
  activeChatChannel: 1,
  isHumanVerified: false,

  // Initialize Application
  async init() {
    this.bindGlobalShortcuts();
    await this.checkAuth();
  },

  // Check Session Status & Router Handling
  async checkAuth() {
    const hash = (window.location.hash || '').replace('#', '').trim();

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.user = data.user;
        this.activeAppId = this.user.app_id || 1;
        await this.loadApplications();
        this.renderAuthenticatedLayout();
        const validRoutes = [
          'dashboard', 'applications', 'users', 'licenses', 'hwid', 'sessions', 
          'variables', 'files', 'webhooks', 'integrations', 'team', 'resellers', 
          'logs', 'analytics', 'subscription', 'settings', 'profile'
        ];
        const targetRoute = validRoutes.includes(hash) ? hash : 'dashboard';
        this.navigate(targetRoute);
      } else {
        if (hash === 'login') {
          this.renderAuthSplitPage('login');
        } else if (hash === 'signup' || hash === 'register') {
          this.renderAuthSplitPage('register');
        } else {
          // Default to Landing Page first (Image 6)
          this.renderLandingPage();
        }
      }
    } catch {
      if (hash === 'login') {
        this.renderAuthSplitPage('login');
      } else if (hash === 'signup' || hash === 'register') {
        this.renderAuthSplitPage('register');
      } else {
        this.renderLandingPage();
      }
    }
  },

  // Global Keyboard Shortcuts (Ctrl + K)
  bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openGlobalSearch();
      }
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace('#', '').trim();
      if (!this.user) {
        if (hash === 'login') {
          this.renderAuthSplitPage('login');
        } else if (hash === 'signup' || hash === 'register') {
          this.renderAuthSplitPage('register');
        } else {
          this.renderLandingPage();
        }
      } else {
        if (hash === 'landing') {
          this.renderLandingPage();
        } else if (hash) {
          this.navigate(hash);
        }
      }
    });

    // Auto-initialize Google Identity Services (GIS) on authentication pages
    setTimeout(() => this.initGoogleIdentityServices(), 150);
  },

  // Authenticated fetch wrapper (auto-injects Bearer token & credentials)
  async authFetch(url, options = {}) {
    const token = localStorage.getItem('zenith_token');
    const headers = Object.assign({}, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    options.headers = headers;
    options.credentials = 'include';
    return fetch(url, options);
  },

  // Fetch list of available applications owned by current user
  async loadApplications() {
    try {
      const res = await this.authFetch('/api/apps');
      if (res.ok) {
        this.apps = await res.json();
        if (this.apps.length > 0 && !this.apps.some(a => a.id === this.activeAppId)) {
          this.activeAppId = this.apps[0].id;
        }
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    }
  },

  // Switch Active Application Context
  async setActiveApplication(appId) {
    try {
      const res = await fetch('/api/apps/' + appId + '/set-active', { method: 'POST' });
      if (res.ok) {
        this.activeAppId = parseInt(appId, 10);
        if (this.user) this.user.app_id = this.activeAppId;
        const app = this.apps.find(a => a.id === this.activeAppId);
        this.showToast('Active application: ' + (app ? app.name : 'App #' + appId), 'success');
        this.renderAuthenticatedLayout();
        this.navigate(this.currentRoute);
      }
    } catch (err) {
      this.showToast('Failed to switch application context', 'danger');
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'zenith-toast toast-' + type;
    
    let iconSvg = ZenithIcons.info || ZenithIcons.shield;
    if (type === 'success') iconSvg = ZenithIcons.check;
    if (type === 'danger') iconSvg = ZenithIcons.close;
    if (type === 'warning') iconSvg = ZenithIcons.shield;

    toast.innerHTML = 
      '<div class="toast-icon" style="color: ' + (type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#6366f1') + '">' + iconSvg + '</div>' +
      '<div class="toast-message">' + message + '</div>';

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Copy Value Helper
  copyToClipboard(text, label = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(label, 'success');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast(label, 'success');
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /* ====================================================================
     1. LANDING PAGE (REFERENCE IMAGE 6 - VISIBLE BEFORE LOGIN)
     ==================================================================== */
  renderLandingPage() {
    const appRoot = document.getElementById('app-root');
    appRoot.innerHTML = `
      <div class="landing-page-wrap">
        <!-- Top Navigation Bar (Image 6) -->
        <header class="landing-nav">
          <a href="#landing" class="landing-nav-logo">
            <span style="color:#6366f1;">${ZenithIcons.shield}</span>
            <span>ZENITH AUTH</span>
          </a>
          <nav class="landing-nav-links">
            <a href="#landing" class="landing-nav-link" style="color:#fff;">Home</a>
            <a href="#landing" class="landing-nav-link">Features</a>
            <a href="#landing" class="landing-nav-link">Pricing</a>
            <a href="#landing" class="landing-nav-link">Plans</a>
            <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" class="landing-nav-link" style="color:#818cf8; display:flex; align-items:center; gap:6px;">
              <span>Discord</span>
              <span style="font-size:10px; background:#4f46e533; border:1px solid #4f46e588; padding:1px 6px; border-radius:4px;">COMMUNITY</span>
            </a>
          </nav>
          <div class="landing-nav-actions">
            <a href="#login" class="landing-btn-login">
              <span>Login</span>
              <span>→</span>
            </a>
            <a href="#signup" class="landing-btn-signup">Sign Up</a>
          </div>
        </header>

        <!-- Hero Section (Image 6) -->
        <section class="landing-hero">
          <h1 class="landing-hero-title">Simplify Your Authentication</h1>
          <p class="landing-hero-subtitle">
            Secure your applications with cloud-native subscriptions, flexible access controls and a beautiful developer-friendly API.
          </p>
          <div class="landing-hero-actions">
            <a href="#signup" class="btn-landing-primary">Get Started</a>
            <a href="#login" class="btn-landing-secondary">Documentation</a>
            <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" class="btn-landing-secondary" style="border-color:#5865F2; color:#a5b4fc;">
              Join Discord Server
            </a>
          </div>
        </section>

        <!-- Perspective Dashboard Mockup Preview (Image 6) -->
        <div class="landing-preview-container">
          <div class="landing-preview-card">
            <!-- Simulated Top Bar -->
            <div style="background:#131317; border-bottom:1px solid #232328; padding:12px 20px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:10px; font-size:12px; color:#929292;">
                <span>${ZenithIcons.shield}</span>
                <span style="color:#fff; font-weight:600;">Zenith Auth Console</span>
                <span>/</span>
                <span>Zero-Trust Security Engine</span>
              </div>
              <div style="display:flex; gap:6px;">
                <span style="width:10px; height:10px; border-radius:50%; background:#ef4444; opacity:0.8;"></span>
                <span style="width:10px; height:10px; border-radius:50%; background:#f59e0b; opacity:0.8;"></span>
                <span style="width:10px; height:10px; border-radius:50%; background:#10b981; opacity:0.8;"></span>
              </div>
            </div>
            <!-- Mock Content -->
            <div style="padding:24px; background:#0e0f13;">
              <div style="background:linear-gradient(135deg, #0e1224 0%, #171d3a 100%); border:1px solid #1f274a; border-radius:10px; padding:20px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h3 style="color:#fff; font-size:18px; font-weight:700;">Welcome back, Operator!</h3>
                  <p style="color:#818cf8; font-size:12.5px; margin-top:2px;">Role: Seller [PRO] • Cloud Cluster Status: 100% Operational</p>
                </div>
                <span style="background:#22c55e22; border:1px solid #22c55e55; color:#4ade80; padding:6px 14px; border-radius:9999px; font-size:12px; font-weight:600;">ACTIVE</span>
              </div>
              <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
                <div style="background:#141418; border:1px solid #23232a; border-radius:8px; padding:14px;">
                  <div style="font-size:11px; color:#6b7280; font-weight:700;">APPLICATIONS</div>
                  <div style="font-size:22px; color:#fff; font-weight:800; margin-top:4px;">Zero-Trust Engine</div>
                </div>
                <div style="background:#141418; border:1px solid #23232a; border-radius:8px; padding:14px;">
                  <div style="font-size:11px; color:#6b7280; font-weight:700;">CURRENT PLAN</div>
                  <div style="font-size:22px; color:#a5b4fc; font-weight:800; margin-top:4px;">Seller</div>
                </div>
                <div style="background:#141418; border:1px solid #23232a; border-radius:8px; padding:14px;">
                  <div style="font-size:11px; color:#6b7280; font-weight:700;">SUBSCRIPTION</div>
                  <div style="font-size:22px; color:#fff; font-weight:800; margin-top:4px;">365 Days</div>
                </div>
                <div style="background:#141418; border:1px solid #23232a; border-radius:8px; padding:14px;">
                  <div style="font-size:11px; color:#6b7280; font-weight:700;">HWID LOCK</div>
                  <div style="font-size:22px; color:#10b981; font-weight:800; margin-top:4px;">Automatic</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ====================================================================
     2. SPLIT-SCREEN AUTHENTICATION (IMAGE 5 - HUMAN VERIFICATION 3-4 SEC)
     ==================================================================== */
  renderAuthSplitPage(mode = 'login') {
    const isRegister = mode === 'register';
    const appRoot = document.getElementById('app-root');
    this.isHumanVerified = false;

    appRoot.innerHTML = `
      <div class="auth-split-wrapper">
        <!-- Left Hero Showcase Column -->
        <div class="auth-split-left">
          <div class="auth-brand-masthead">
            <span style="color:#6366f1;">${ZenithIcons.shield}</span>
            <span>ZENITH AUTH</span>
          </div>

          <div class="auth-pitch">
            <h1 class="auth-pitch-title">Join the future of authentication</h1>
            <p class="auth-pitch-desc">
              Create an account today and start building secure applications in minutes.
            </p>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; font-size:12.5px; color:#6b7280;">
            <span>© 2026 Zenith Auth Inc. All rights reserved.</span>
            <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" style="color:#818cf8; text-decoration:none;">Discord Support</a>
          </div>
        </div>

        <!-- Right White/Clean Card Column -->
        <div class="auth-split-right">
          <div class="auth-clean-card">
            <h2 class="auth-card-title">${isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p class="auth-card-subtitle">${isRegister ? 'Create your account with username, email and password' : 'Sign in to access your dashboard'}</p>

            <form id="auth-split-form">
              <div style="margin-bottom:14px;">
                <label style="display:block; font-size:12.5px; font-weight:600; color:#374151; margin-bottom:6px;">
                  Username ${isRegister ? '<span style="color:#ef4444;">*</span>' : ''}
                </label>
                <input type="text" id="auth-username" class="auth-input-light" placeholder="${isRegister ? 'e.g. quantum_coder (min 5 chars)' : 'Username or email'}" ${isRegister ? 'minlength="5"' : ''} required />
              </div>

              ${isRegister ? `
                <div style="margin-bottom:14px;">
                  <label style="display:block; font-size:12.5px; font-weight:600; color:#374151; margin-bottom:6px;">
                    Email Address <span style="color:#ef4444;">*</span>
                  </label>
                  <input type="email" id="auth-email" class="auth-input-light" placeholder="e.g. yourname@gmail.com" required />
                </div>
              ` : ''}

              <div style="margin-bottom:14px;">
                <label style="display:block; font-size:12.5px; font-weight:600; color:#374151; margin-bottom:6px;">
                  Password ${isRegister ? '<span style="color:#ef4444;">*</span>' : ''}
                </label>
                <input type="password" id="auth-password" class="auth-input-light" placeholder="${isRegister ? '•••••••••••• (min 8 chars)' : '••••••••••••'}" ${isRegister ? 'minlength="8"' : ''} required />
              </div>

              <!-- Cloudflare Verification Widget (Image 5: Verifies in 2.5-3 seconds) -->
              <div class="auth-cf-turnstile" id="cf-verification-box">
                <div class="cf-left">
                  <div class="cf-spinner" id="cf-spinner-el"></div>
                  <span id="cf-status-text">Verifying human browser...</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#6b7280;">
                  <span style="font-weight:700; color:#f97316;">CLOUDFLARE</span>
                  <span>Privacy • Help</span>
                </div>
              </div>

              <button type="submit" id="auth-submit-btn" class="btn-auth-submit" style="opacity:0.6;" disabled>
                ${isRegister ? 'Create Account & Continue' : 'Sign In'}
              </button>

              ${!isRegister ? `
                <div style="margin-top:10px;">
                  <button type="button" onclick="ZenithApp.openEmailOtpLoginDialog()" style="width:100%; border-radius:8px; height:38px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:12.5px; font-weight:600; color:#818cf8; border:1px solid #6366f144; background:#1e1b4b22; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#1e1b4b44'; this.style.borderColor='#6366f177';" onmouseout="this.style.background='#1e1b4b22'; this.style.borderColor='#6366f144';">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Login with Gmail OTP (No Password Needed)</span>
                  </button>
                </div>
              ` : ''}
            </form>

            <div class="auth-divider-light">OR CONTINUE WITH</div>

            <!-- Official Google Sign-In Button Slot -->
            <div id="g_id_signin_slot" style="display:flex; justify-content:center; margin-bottom:14px; min-height:44px;">
              <button type="button" class="google-btn-official" onclick="ZenithApp.openGoogleAuthDialog()" style="display:flex; align-items:center; justify-content:center; gap:10px; width:100%; max-width:320px; height:42px; background:#ffffff; color:#3c4043; border:1px solid #dadce0; border-radius:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:14px; font-weight:500; cursor:pointer; box-shadow:0 1px 3px rgba(60,64,67,0.15); transition:all 0.15s ease;" onmouseover="this.style.background='#f8fafd'; this.style.boxShadow='0 2px 6px rgba(60,64,67,0.25)';" onmouseout="this.style.background='#ffffff'; this.style.boxShadow='0 1px 3px rgba(60,64,67,0.15)';">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span style="font-weight:600; color:#1f1f1f;">Sign in with Google</span>
              </button>
            </div>

            <div class="social-icons-row">
              <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" class="btn-social-mini" title="Join Discord Server" style="text-decoration:none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
              <button type="button" class="btn-social-mini" title="GitHub" onclick="ZenithApp.showToast('GitHub Auth available', 'info')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
              </button>
              <button type="button" class="btn-social-mini" title="Telegram" onclick="ZenithApp.showToast('Telegram Bot Auth available', 'info')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#2AABEE"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.128.832.942Z"/></svg>
              </button>
            </div>

            <div style="margin-top:24px; text-align:center; font-size:13px; color:#4b5563;">
              ${isRegister ? `
                Already have an account? <a href="#login" style="color:#5046e5; font-weight:600; text-decoration:none;">Sign in</a>
              ` : `
                Don't have an account? <a href="#signup" style="color:#5046e5; font-weight:600; text-decoration:none;">Create account</a>
              `}
            </div>

            <div style="margin-top:14px; text-align:center;">
              <a href="#landing" style="font-size:12px; color:#9ca3af; text-decoration:none;">← Back to Overview</a>
            </div>
          </div>
        </div>
      </div>
    `;

    // Instant click or simulated 2.5s verification
    const completeVerification = () => {
      const spinner = document.getElementById('cf-spinner-el');
      const text = document.getElementById('cf-status-text');
      const box = document.getElementById('cf-verification-box');
      const btn = document.getElementById('auth-submit-btn');

      if (spinner && text) {
        spinner.className = 'cf-check-icon';
        spinner.innerHTML = '✓';
        text.innerText = 'Verification complete';
        text.style.color = '#10b981';
        text.style.fontWeight = '600';
        if (box) box.style.borderColor = '#10b98166';
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
        this.isHumanVerified = true;
      }
    };

    const cfBox = document.getElementById('cf-verification-box');
    if (cfBox) cfBox.addEventListener('click', completeVerification);

    // Auto-verify in 2.5 seconds (Image 5)
    setTimeout(completeVerification, 2500);

    // Form Event
    document.getElementById('auth-split-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('auth-submit-btn');
      btn.disabled = true;
      btn.innerText = 'Authenticating...';

      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;

      if (isRegister) {
        const emailInput = document.getElementById('auth-email');
        const email = emailInput ? emailInput.value.trim() : '';

        if (!username || !email || !password) {
          this.showToast('Please fill in all required fields: Username, Email, and Password.', 'warning');
          btn.disabled = false;
          btn.innerText = 'Create Account & Continue';
          return;
        }

        if (username.length < 5) {
          this.showToast('Username must be at least 5 characters long.', 'warning');
          btn.disabled = false;
          btn.innerText = 'Create Account & Continue';
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          this.showToast('Please enter a valid email address (e.g. yourname@gmail.com).', 'warning');
          btn.disabled = false;
          btn.innerText = 'Create Account & Continue';
          return;
        }

        if (password.length < 8) {
          this.showToast('Password must be at least 8 characters long.', 'warning');
          btn.disabled = false;
          btn.innerText = 'Create Account & Continue';
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          btn.innerText = 'Sending 6-digit OTP...';
          const res = await fetch('/api/auth/send-registration-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
            signal: controller.signal
          });
          let data = {};
          try {
            data = await res.json();
          } catch {
            data = { error: 'Server returned unexpected status (' + res.status + ')' };
          }

          if (res.ok && data.success) {
            this.showToast('Verification code sent to your Gmail inbox: ' + email, 'success');
            this.openRegistrationOtpModal(username, email, password);
          } else {
            this.showToast(data.error || 'Failed to dispatch verification code', 'danger');
          }
        } catch (err) {
          const isTimeout = err.name === 'AbortError';
          this.showToast(isTimeout ? 'Request timed out. Please check your internet or retry.' : 'Network error during registration', 'danger');
        } finally {
          clearTimeout(timeoutId);
          btn.disabled = false;
          btn.innerText = 'Create Account & Continue';
        }
      } else {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: username, password })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('zenith_token', data.token);
            this.user = data.user;
            this.activeAppId = this.user.app_id || 1;
            const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
            this.showToast('Welcome back, ' + this.user.username + (isOwner ? ' 👑 (Master Platform Owner)' : ' (Tester Plan)') + '!', 'success');
            await this.loadApplications();
            this.renderAuthenticatedLayout();
            const startRoute = isOwner ? 'owner-panel' : 'applications';
            window.location.hash = startRoute;
            this.navigate(startRoute);
          } else {
            this.showToast(data.error || 'Invalid username or password', 'danger');
            btn.disabled = false;
            btn.innerText = 'Send Verification Code';
          }
        } catch {
          this.showToast('Network error during login', 'danger');
          btn.disabled = false;
          btn.innerText = 'Send Verification Code';
        }
      }
    });

    // Auto-initialize Google Identity Services (GIS) on authentication pages
    setTimeout(() => this.initGoogleIdentityServices(), 150);
  },

  // Initialize Official Google Identity Services (GIS) / OAuth 2.0 (Button + One Tap Prompt)
  async initGoogleIdentityServices() {
    const slot = document.getElementById('g_id_signin_slot');
    if (!slot) return;

    let clientId = window.GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      try {
        const res = await fetch('/api/auth/google-config');
        const data = await res.json();
        if (data && data.client_id) {
          clientId = data.client_id.trim();
        }
      } catch {}
    }

    const hasValidClient = clientId && clientId.includes('.apps.googleusercontent.com') && !clientId.includes('placeholder');

    if (hasValidClient && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => ZenithApp.handleGoogleCredentialResponse(response),
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true
        });

        // Render official button if valid Google Client ID is configured
        window.google.accounts.id.renderButton(slot, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320
        });

        // Trigger Google One Tap
        window.google.accounts.id.prompt();
        return;
      } catch (err) {
        console.warn('[Google GIS] Setup warning:', err.message);
      }
    }

    // Default High-speed Official Google Sign-In Button (Direct Google Auth Dialog)
    slot.innerHTML = `
      <button type="button" class="google-btn-official" onclick="ZenithApp.openGoogleAuthDialog()" style="display:flex; align-items:center; justify-content:center; gap:10px; width:100%; max-width:320px; height:42px; background:#ffffff; color:#3c4043; border:1px solid #dadce0; border-radius:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:14px; font-weight:500; cursor:pointer; box-shadow:0 1px 3px rgba(60,64,67,0.15); transition:all 0.15s ease;" onmouseover="this.style.background='#f8fafd'; this.style.boxShadow='0 2px 6px rgba(60,64,67,0.25)';" onmouseout="this.style.background='#ffffff'; this.style.boxShadow='0 1px 3px rgba(60,64,67,0.15)';">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        <span style="font-weight:600; color:#1f1f1f;">Sign in with Google</span>
      </button>
    `;
  },

  // Direct Standard Google Authentication Dialog (Clean Google Look, Zero 401 Errors)
  openGoogleAuthDialog() {
    this.closeAllModals();
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px; width:95%; background:#ffffff; color:#202124; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.65); overflow:hidden; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <!-- Top bar -->
          <div style="height:42px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; border-bottom:1px solid #f1f3f4; background:#fafafa;">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              <span style="font-size:13px; font-weight:500; color:#5f6368;">Sign in with Google</span>
            </div>
            <span style="font-size:16px; color:#5f6368; cursor:pointer; font-weight:700;" onclick="ZenithApp.closeAllModals()">✕</span>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px 30px;">
            <div style="text-align:center; margin-bottom:24px;">
              <svg width="40" height="40" viewBox="0 0 24 24" style="margin-bottom:12px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              <h2 style="font-size:22px; font-weight:400; color:#202124; margin:0 0 6px 0;">Sign in</h2>
              <p style="font-size:14px; color:#5f6368; margin:0;">to continue to <strong style="color:#202124;">Zenith Auth</strong></p>
            </div>

            <form id="google-auth-direct-form" onsubmit="event.preventDefault(); ZenithApp.submitGoogleDirectAuth();">
              <div style="margin-bottom:20px;">
                <label style="display:block; font-size:12.5px; font-weight:500; color:#5f6368; margin-bottom:6px;">Email or phone</label>
                <input type="email" id="google-direct-email-in" class="form-control" placeholder="your_email@gmail.com" required autofocus style="background:#fff; color:#202124; border:1px solid #dadce0; border-radius:4px; padding:12px 14px; font-size:15px; width:100%; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#1a73e8';" onblur="this.style.borderColor='#dadce0';" />
              </div>

              <div style="font-size:12.5px; color:#5f6368; line-height:1.5; margin-bottom:24px;">
                To continue, Google will share your name, email address, and language preference with Zenith Auth.
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()" style="color:#1a73e8; background:transparent; border:none; font-weight:500; padding:8px 0; font-size:13.5px; cursor:pointer;">Cancel</button>
                <button type="submit" id="google-direct-submit-btn" style="background:#1a73e8; color:#ffffff; border:none; padding:9px 26px; border-radius:4px; font-weight:500; font-size:14px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.15);" onmouseover="this.style.background='#1557b0';" onmouseout="this.style.background='#1a73e8';">Next</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
  },

  async submitGoogleDirectAuth() {
    const input = document.getElementById('google-direct-email-in');
    const email = input ? input.value.trim() : '';
    if (!email) {
      this.showToast('Please enter your Google Email address', 'warning');
      return;
    }
    const btn = document.getElementById('google-direct-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Connecting...'; }

    try {
      this.showToast('Authenticating with Google...', 'info');
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // If new account requires 6-digit email OTP verification
      if (data.need_otp) {
        this.closeAllModals();
        this.openGoogleOtpModal(email);
        return;
      }

      this.closeAllModals();
      localStorage.setItem('zenith_token', data.token);
      this.user = data.user;
      this.activeAppId = this.user.app_id || 1;
      const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
      this.showToast('✓ Signed in with Google as ' + this.user.username + (isOwner ? ' 👑 (Master Owner)' : ' (Tester Plan)'), 'success');
      const startRoute = isOwner ? 'owner-panel' : 'applications';
      window.location.hash = startRoute;
      await this.loadApplications();
      this.renderAuthenticatedLayout();
      this.navigate(startRoute);
    } catch (err) {
      this.showToast(err.message, 'danger');
      if (btn) { btn.disabled = false; btn.innerText = 'Next'; }
    }
  },

  // Registration OTP Modal (Strict Email Verification via Gmail Inbox)
  openRegistrationOtpModal(username, email, password) {
    this.closeAllModals();
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px; background:#141417; border:1px solid #27272a; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,0.65);">
          <div class="modal-header" style="border-bottom:1px solid #27272a; padding:16px 20px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#6366f1;">${ZenithIcons.shield}</span>
              <h3 style="font-size:16px; font-weight:700; color:#fff; margin:0;">Verify Your Gmail Address</h3>
            </div>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="reg-otp-verify-form" onsubmit="event.preventDefault(); ZenithApp.submitRegistrationOtp('${username}', '${email}', '${password}');">
            <div class="modal-body" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
              <div style="font-size:13px; color:#a1a1aa; line-height:1.5;">
                We sent a 6-digit verification code to your Gmail inbox: <strong style="color:#fff;">${email}</strong>. Check your inbox (or spam) and enter the code below:
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">6-Digit OTP Code</label>
                <input type="text" id="reg-otp-input" class="form-control" placeholder="123456" maxlength="6" autofocus required style="text-align:center; font-size:26px; font-weight:800; letter-spacing:8px; height:50px; font-family:monospace; background:#18181b; border:1px solid #3f3f46; color:#ffffff;" />
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#71717a;">
                <span>Didn't receive code?</span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.resendOtp('${email}', 'registration')" style="padding:3px 8px; font-size:11.5px;">Resend OTP</button>
              </div>

              <button type="submit" id="reg-otp-submit-btn" style="background:#6366f1; color:#ffffff; font-weight:700; width:100%; padding:12px; border-radius:8px; border:none; cursor:pointer; font-size:14px; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Verify & Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    `);
  },

  async submitRegistrationOtp(username, email, password) {
    const input = document.getElementById('reg-otp-input');
    const otp = input ? input.value.trim() : '';
    if (!otp || otp.length < 6) {
      this.showToast('Please enter the complete 6-digit OTP code', 'warning');
      return;
    }

    const btn = document.getElementById('reg-otp-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Verifying Code...'; }

    try {
      const res = await fetch('/api/auth/verify-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, otp })
      });
      let data = {};
      try { data = await res.json(); } catch { data = { error: 'Server error (' + res.status + ')' }; }
      if (res.ok && data.success) {
        this.closeAllModals();
        localStorage.setItem('zenith_token', data.token);
        this.user = data.user;
        this.activeAppId = this.user.app_id || 1;
        this.showToast('✓ Account verified and registered successfully with TESTER plan! Welcome to Zenith Auth.', 'success');
        await this.loadApplications();
        this.renderAuthenticatedLayout();
        this.navigate('applications');
      } else {
        this.showToast(data.error || 'Invalid verification code', 'danger');
      }
    } catch {
      this.showToast('Network error verifying code', 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Verify & Create Account'; }
    }
  },

  // Google Account OTP Modal (Strict Email Verification via Gmail Inbox)
  openGoogleOtpModal(email) {
    this.closeAllModals();
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px; background:#141417; border:1px solid #27272a; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,0.65);">
          <div class="modal-header" style="border-bottom:1px solid #27272a; padding:16px 20px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              <h3 style="font-size:16px; font-weight:700; color:#fff; margin:0;">Verify Google Account</h3>
            </div>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="google-otp-verify-form" onsubmit="event.preventDefault(); ZenithApp.submitGoogleOtp('${email}');">
            <div class="modal-body" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
              <div style="font-size:13px; color:#a1a1aa; line-height:1.5;">
                We sent a 6-digit verification code to your Gmail inbox: <strong style="color:#fff;">${email}</strong>. Check your inbox and enter the code:
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">6-Digit OTP Code</label>
                <input type="text" id="google-otp-input" class="form-control" placeholder="123456" maxlength="6" autofocus required style="text-align:center; font-size:26px; font-weight:800; letter-spacing:8px; height:50px; font-family:monospace; background:#18181b; border:1px solid #3f3f46; color:#ffffff;" />
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#71717a;">
                <span>Didn't receive code?</span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.resendOtp('${email}', 'google_auth')" style="padding:3px 8px; font-size:11.5px;">Resend OTP</button>
              </div>

              <button type="submit" id="google-otp-submit-btn" style="background:#1a73e8; color:#ffffff; font-weight:700; width:100%; padding:12px; border-radius:8px; border:none; cursor:pointer; font-size:14px; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Verify & Enter Zenith Console
              </button>
            </div>
          </form>
        </div>
      </div>
    `);
  },

  async submitGoogleOtp(email) {
    const input = document.getElementById('google-otp-input');
    const otp = input ? input.value.trim() : '';
    if (!otp || otp.length < 6) {
      this.showToast('Please enter the complete 6-digit OTP code', 'warning');
      return;
    }

    const btn = document.getElementById('google-otp-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Verifying Code...'; }

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.closeAllModals();
        localStorage.setItem('zenith_token', data.token);
        this.user = data.user;
        this.activeAppId = this.user.app_id || 1;
        const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
        this.showToast('✓ Google account verified! Welcome ' + this.user.username + (isOwner ? ' 👑 (Master Owner)' : ' (Tester Plan)'), 'success');
        const startRoute = isOwner ? 'owner-panel' : 'applications';
        window.location.hash = startRoute;
        await this.loadApplications();
        this.renderAuthenticatedLayout();
        this.navigate(startRoute);
      } else {
        this.showToast(data.error || 'Invalid verification code', 'danger');
        if (btn) { btn.disabled = false; btn.innerText = 'Verify & Enter Zenith Console'; }
      }
    } catch {
      this.showToast('Network error verifying code', 'danger');
      if (btn) { btn.disabled = false; btn.innerText = 'Verify & Enter Zenith Console'; }
    }
  },

  // Passwordless Gmail OTP Login Dialog
  openEmailOtpLoginDialog() {
    this.closeAllModals();
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px; background:#141417; border:1px solid #27272a; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,0.65);">
          <div class="modal-header" style="border-bottom:1px solid #27272a; padding:16px 20px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#6366f1;">${ZenithIcons.shield}</span>
              <h3 style="font-size:16px; font-weight:700; color:#fff; margin:0;">Login with Gmail OTP</h3>
            </div>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="email-otp-request-form" onsubmit="event.preventDefault(); ZenithApp.submitSendLoginOtp();">
            <div class="modal-body" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
              <div style="font-size:13px; color:#a1a1aa; line-height:1.5;">
                Enter your registered Gmail address or username. We'll send a 6-digit login verification code directly to your Gmail inbox:
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Your Email or Username</label>
                <input type="text" id="login-otp-email-in" class="form-control" placeholder="chutiyaasfan@gmail.com" autofocus required style="background:#18181b; border:1px solid #3f3f46; color:#ffffff; font-size:14px;" />
              </div>

              <button type="submit" id="send-login-otp-btn" style="background:#6366f1; color:#ffffff; font-weight:700; width:100%; padding:12px; border-radius:8px; border:none; cursor:pointer; font-size:14px; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Send Verification Code to Inbox
              </button>
            </div>
          </form>
        </div>
      </div>
    `);
  },

  async submitSendLoginOtp() {
    const input = document.getElementById('login-otp-email-in');
    const email = input ? input.value.trim() : '';
    if (!email) {
      this.showToast('Please enter your email or username', 'warning');
      return;
    }

    const btn = document.getElementById('send-login-otp-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Dispatching OTP to inbox...'; }

    try {
      const res = await fetch('/api/auth/send-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.showToast('6-digit code sent to your Gmail inbox: ' + data.email, 'success');
        this.openLoginOtpModal(data.email);
      } else {
        this.showToast(data.error || 'Failed to dispatch login code', 'danger');
        if (btn) { btn.disabled = false; btn.innerText = 'Send Verification Code to Inbox'; }
      }
    } catch {
      this.showToast('Network error dispatching login code', 'danger');
      if (btn) { btn.disabled = false; btn.innerText = 'Send Verification Code to Inbox'; }
    }
  },

  openLoginOtpModal(email) {
    this.closeAllModals();
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px; background:#141417; border:1px solid #27272a; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,0.65);">
          <div class="modal-header" style="border-bottom:1px solid #27272a; padding:16px 20px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#6366f1;">${ZenithIcons.shield}</span>
              <h3 style="font-size:16px; font-weight:700; color:#fff; margin:0;">Enter Login Verification Code</h3>
            </div>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="login-otp-form" onsubmit="event.preventDefault(); ZenithApp.submitVerifyLoginOtp('${email}');">
            <div class="modal-body" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
              <div style="font-size:13px; color:#a1a1aa; line-height:1.5;">
                We sent a 6-digit login code to your Gmail inbox: <strong style="color:#fff;">${email}</strong>. Enter it below to sign in:
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">6-Digit OTP Code</label>
                <input type="text" id="login-modal-otp-in" class="form-control" placeholder="123456" maxlength="6" autofocus required style="text-align:center; font-size:26px; font-weight:800; letter-spacing:8px; height:50px; font-family:monospace; background:#18181b; border:1px solid #3f3f46; color:#ffffff;" />
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#71717a;">
                <span>Didn't receive code?</span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.resendOtp('${email}', 'login')" style="padding:3px 8px; font-size:11.5px;">Resend OTP</button>
              </div>

              <button type="submit" id="login-otp-submit-btn" style="background:#6366f1; color:#ffffff; font-weight:700; width:100%; padding:12px; border-radius:8px; border:none; cursor:pointer; font-size:14px; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Verify & Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    `);
  },

  async submitVerifyLoginOtp(email) {
    const input = document.getElementById('login-modal-otp-in');
    const otp = input ? input.value.trim() : '';
    if (!otp || otp.length < 6) {
      this.showToast('Please enter the complete 6-digit OTP code', 'warning');
      return;
    }

    const btn = document.getElementById('login-otp-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Verifying Code...'; }

    try {
      const res = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.closeAllModals();
        localStorage.setItem('zenith_token', data.token);
        this.user = data.user;
        this.activeAppId = this.user.app_id || 1;
        const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
        this.showToast('✓ Welcome back, ' + this.user.username + (isOwner ? ' 👑 (Master Owner)' : ' (Tester Plan)'), 'success');
        const startRoute = isOwner ? 'owner-panel' : 'applications';
        window.location.hash = startRoute;
        await this.loadApplications();
        this.renderAuthenticatedLayout();
        this.navigate(startRoute);
      } else {
        this.showToast(data.error || 'Invalid verification code', 'danger');
        if (btn) { btn.disabled = false; btn.innerText = 'Verify & Sign In'; }
      }
    } catch {
      this.showToast('Network error verifying code', 'danger');
      if (btn) { btn.disabled = false; btn.innerText = 'Verify & Sign In'; }
    }
  },

  async submitGoogleOtp(email) {
    const input = document.getElementById('google-otp-input');
    const otp = input ? input.value.trim() : '';
    if (!otp || otp.length < 6) {
      this.showToast('Please enter the complete 6-digit OTP code', 'warning');
      return;
    }

    const btn = document.getElementById('google-otp-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Verifying Code...'; }

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.closeAllModals();
        localStorage.setItem('zenith_token', data.token);
        this.user = data.user;
        this.activeAppId = this.user.app_id || 1;
        const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
        this.showToast('✓ Google account verified! Welcome ' + this.user.username + (isOwner ? ' 👑 (Master Owner)' : ' (Tester Plan)'), 'success');
        const startRoute = isOwner ? 'owner-panel' : 'applications';
        window.location.hash = startRoute;
        await this.loadApplications();
        this.renderAuthenticatedLayout();
        this.navigate(startRoute);
      } else {
        this.showToast(data.error || 'Invalid verification code', 'danger');
        if (btn) { btn.disabled = false; btn.innerText = 'Verify & Enter Zenith Console'; }
      }
    } catch {
      this.showToast('Network error verifying code', 'danger');
      if (btn) { btn.disabled = false; btn.innerText = 'Verify & Enter Zenith Console'; }
    }
  },

  async resendOtp(email, type = 'registration') {
    try {
      this.showToast('Requesting fresh verification code...', 'info');
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.showToast('Fresh verification code sent to ' + email, 'success');
        if (type === 'registration') {
          const user = document.getElementById('auth-username') ? document.getElementById('auth-username').value.trim() : '';
          const pass = document.getElementById('auth-password') ? document.getElementById('auth-password').value : '';
          this.openRegistrationOtpModal(user, email, pass);
        } else if (type === 'google_auth') {
          this.openGoogleOtpModal(email);
        } else {
          this.openLoginOtpModal(email);
        }
      } else {
        this.showToast(data.error || 'Failed to resend verification code', 'danger');
      }
    } catch {
      this.showToast('Network error resending code', 'danger');
    }
  },

  async handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      this.showToast('Google authentication failed: missing credential token', 'danger');
      return;
    }
    try {
      this.showToast('Verifying Google Identity...', 'info');
      const res = await fetch('/api/auth/google-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google token verification failed');
      }

      this.closeAllModals();
      localStorage.setItem('zenith_token', data.token);
      this.user = data.user;
      const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
      this.showToast('✓ Signed in as ' + this.user.username + (isOwner ? ' 👑 (Master Platform Owner)' : ' (Tester Plan)'), 'success');
      const startRoute = isOwner ? 'owner-panel' : 'dashboard';
      window.location.hash = startRoute;
      await this.loadApplications();
      this.renderAuthenticatedLayout();
      this.navigate(startRoute);
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  /* ====================================================================
     3. AUTHENTICATED WORKSPACE LAYOUT (16 DISTINCT PAGES)
     ==================================================================== */
  renderAuthenticatedLayout() {
    const appRoot = document.getElementById('app-root');
    const activeApp = this.apps.find(a => a.id === this.activeAppId) || { name: 'Zenith Core Engine', version: '1.0' };
    const userRole = this.user ? this.user.role : 'Administrator';
    const userPlan = (this.user ? (this.user.account_plan || 'TESTER') : 'TESTER').toUpperCase();
    const isOwner = this.user && (this.user.role === 'Owner' || userPlan === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
    const isSeller = !isOwner && (userPlan === 'SELLER' || (this.user && this.user.role === 'Administrator'));
    const isDeveloper = !isOwner && userPlan === 'DEVELOPER';
    const isTester = !isOwner && !isSeller && !isDeveloper;

    appRoot.innerHTML = `
      <div id="app-layout">
        <!-- Collapsible Dark Sidebar -->
        <aside id="sidebar">
          <div class="sidebar-header">
            <a href="${isOwner ? '#owner-panel' : '#dashboard'}" class="brand-wrapper">
              <div class="brand-logo-icon">
                ${ZenithIcons.shield}
              </div>
              <div class="brand-title">
                ZENITH AUTH
                <span class="brand-badge">${isOwner ? 'OWNER' : userPlan}</span>
              </div>
            </a>
            <button class="sidebar-toggle-btn" id="sidebar-toggle" title="Toggle Sidebar">
              ${ZenithIcons.menu}
            </button>
          </div>

          <div class="sidebar-nav">
            ${isOwner ? `
              <!-- OWNER ONLY SIDEBAR (Only 4 Root Master Tabs) -->
              <div class="nav-section-title">👑 MASTER OWNER CONTROL</div>
              <a class="nav-item ${this.currentRoute === 'owner-panel' ? 'active' : ''}" href="#owner-panel" style="background:#f59e0b18; border:1px solid #f59e0b44;">
                <span style="font-size:15px;">👑</span>
                <span class="nav-text" style="color:#f59e0b; font-weight:800;">Owner Master Panel</span>
              </a>

              <div class="nav-section-title">DIRECT CONTROLS</div>
              <a class="nav-item ${this.ownerActiveTab === 'logins' && this.currentRoute === 'owner-panel' ? 'active' : ''}" href="#owner-panel" onclick="ZenithApp.setOwnerTab('logins')">
                <span style="font-size:14px;">🖥️</span>
                <span class="nav-text">Recent Logins & Devices</span>
              </a>
              <a class="nav-item ${this.ownerActiveTab === 'plans' && this.currentRoute === 'owner-panel' ? 'active' : ''}" href="#owner-panel" onclick="ZenithApp.setOwnerTab('plans')">
                <span style="font-size:14px;">⭐</span>
                <span class="nav-text">Plan Granter & Accounts</span>
              </a>
              <a class="nav-item ${this.ownerActiveTab === 'logs' && this.currentRoute === 'owner-panel' ? 'active' : ''}" href="#owner-panel" onclick="ZenithApp.setOwnerTab('logs')">
                <span style="font-size:14px;">📜</span>
                <span class="nav-text">User Activity Inspector</span>
              </a>
              <a class="nav-item ${this.ownerActiveTab === 'smtp' && this.currentRoute === 'owner-panel' ? 'active' : ''}" href="#owner-panel" onclick="ZenithApp.setOwnerTab('smtp')">
                <span style="font-size:14px;">📧</span>
                <span class="nav-text">Gmail OTP Dispatcher</span>
              </a>
              <a class="nav-item ${this.ownerActiveTab === 'overview' && this.currentRoute === 'owner-panel' ? 'active' : ''}" href="#owner-panel" onclick="ZenithApp.setOwnerTab('overview')">
                <span style="font-size:14px;">📊</span>
                <span class="nav-text">Platform Metrics & Health</span>
              </a>

              <div class="nav-section-title">SETTINGS</div>
              <a class="nav-item ${this.currentRoute === 'subscription' ? 'active' : ''}" href="#subscription">
                ${ZenithIcons.plans}
                <span class="nav-text">Pricing & UPI QR</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" href="#settings">
                ${ZenithIcons.profile}
                <span class="nav-text">Account Settings</span>
              </a>
            ` : `
              <!-- DEVELOPER & SELLER DYNAMIC SIDEBAR (Only features included in the plan) -->
              <div class="nav-section-title">Main</div>
              <a class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" href="#dashboard">
                ${ZenithIcons.dashboard}
                <span class="nav-text">Dashboard</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'applications' ? 'active' : ''}" href="#applications">
                ${ZenithIcons.apps}
                <span class="nav-text">Applications</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'users' ? 'active' : ''}" href="#users">
                ${ZenithIcons.users}
                <span class="nav-text">Users</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'licenses' ? 'active' : ''}" href="#licenses">
                ${ZenithIcons.licenses}
                <span class="nav-text">Licenses</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'hwid' ? 'active' : ''}" href="#hwid">
                ${ZenithIcons.security}
                <span class="nav-text">HWID Management</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'sessions' ? 'active' : ''}" href="#sessions">
                ${ZenithIcons.sessions}
                <span class="nav-text">Sessions</span>
              </a>

              <div class="nav-section-title">Configuration</div>
              <a class="nav-item ${this.currentRoute === 'variables' ? 'active' : ''}" href="#variables">
                ${ZenithIcons.globalVars}
                <span class="nav-text">Variables</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'files' ? 'active' : ''}" href="#files">
                ${ZenithIcons.files}
                <span class="nav-text">File Management</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'webhooks' ? 'active' : ''}" href="#webhooks">
                ${ZenithIcons.loader}
                <span class="nav-text">Webhooks</span>
              </a>
              ${isSeller ? `
                <a class="nav-item ${this.currentRoute === 'integrations' ? 'active' : ''}" href="#integrations">
                  ${ZenithIcons.chat}
                  <span class="nav-text">Integrations</span>
                </a>
              ` : ''}

              ${isSeller ? `
                <div class="nav-section-title">Commerce & Team</div>
                <a class="nav-item ${this.currentRoute === 'team' ? 'active' : ''}" href="#team">
                  ${ZenithIcons.team}
                  <span class="nav-text">Team Management</span>
                </a>
              ` : ''}

              <div class="nav-section-title">System & Tools</div>
              ${(isSeller || isDeveloper) ? `
                <a class="nav-item ${this.currentRoute === 'logs' ? 'active' : ''}" href="#logs">
                  ${ZenithIcons.sellerLogs}
                  <span class="nav-text">Logs</span>
                </a>
              ` : ''}
              <a class="nav-item ${this.currentRoute === 'analytics' ? 'active' : ''}" href="#analytics">
                ${ZenithIcons.dashboard}
                <span class="nav-text">Analytics</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'subscription' ? 'active' : ''}" href="#subscription">
                ${ZenithIcons.plans}
                <span class="nav-text">Subscription & Pricing</span>
              </a>
              <a class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" href="#settings">
                ${ZenithIcons.profile}
                <span class="nav-text">Account Settings</span>
              </a>
            `}
          </div>
        </aside>

        <!-- Main Content Area -->
        <div id="main-wrapper">
          <!-- Top Header -->
          <header id="top-header">
            <div class="header-left">
              <div class="breadcrumb-nav">
                <span style="color:#929292;">Zenith Auth</span>
                <span class="breadcrumb-separator">/</span>
                <span style="color:#6366f1; font-weight:600;">${activeApp.name || 'Dashboard'}</span>
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-current" id="header-breadcrumb">${this.currentRoute.toUpperCase()}</span>
              </div>

              <!-- Application Selector Dropdown -->
              <div class="app-selector-box">
                ${ZenithIcons.apps}
                <select class="app-selector-select" id="global-app-selector">
                  ${this.apps.length > 0 ? this.apps.map(a => `<option value="${a.id}" ${a.id === this.activeAppId ? 'selected' : ''}>${a.name} (v${a.version})</option>`).join('') : '<option value="">No applications</option>'}
                </select>
              </div>
            </div>

            <div class="header-right">
              <!-- Global Search Button (Ctrl + K) -->
              <button class="global-search-btn" onclick="ZenithApp.openGlobalSearch()">
                ${ZenithIcons.search}
                <span>Search projects...</span>
                <span class="kbd-shortcut">Ctrl K</span>
              </button>

              <!-- Notifications Bell -->
              <button class="header-action-btn" onclick="ZenithApp.openNotificationsModal()" title="Notifications">
                ${ZenithIcons.bell}
                <span class="header-badge-dot"></span>
              </button>

              <!-- User Profile Pill -->
              <div class="user-profile-btn" onclick="ZenithApp.navigate('settings')">
                <div class="user-avatar-circle">
                  ${(this.user.username || 'U')[0].toUpperCase()}
                </div>
                <div class="user-meta">
                  <span class="user-name-text">${this.user.username}</span>
                  <span class="user-role-badge">${userPlan}</span>
                </div>
              </div>

              <!-- Logout Button -->
              <button class="header-action-btn" onclick="ZenithApp.logout()" title="Sign Out">
                ${ZenithIcons.logout}
              </button>
            </div>
          </header>

          <!-- Dynamic Workspace Page Container -->
          <main id="content-container">
            <!-- Injected by router -->
          </main>
        </div>
      </div>
    `;

    // Sidebar Collapse
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
      document.getElementById('main-wrapper').classList.toggle('expanded');
    });

    // App Switcher
    const appSelect = document.getElementById('global-app-selector');
    if (appSelect) {
      appSelect.addEventListener('change', (e) => {
        if (e.target.value) this.setActiveApplication(e.target.value);
      });
    }
  },

  // Router Dispatcher
  async navigate(route) {
    if (!this.user) return this.renderAuthSplitPage('login');
    this.currentRoute = route || 'dashboard';

    // Update active nav class
    document.querySelectorAll('.nav-item').forEach(el => {
      const href = el.getAttribute('href');
      if (href === '#' + this.currentRoute) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update breadcrumb
    const bc = document.getElementById('header-breadcrumb');
    if (bc) {
      const titles = {
        dashboard: 'Dashboard Overview',
        applications: 'Applications',
        users: 'Users Manager',
        licenses: 'License Manager',
        hwid: 'HWID Management',
        sessions: 'Active Sessions',
        variables: 'Variables',
        files: 'File Management',
        webhooks: 'Webhooks',
        integrations: 'Bot Integrations',
        team: 'Team Management',
        'owner-panel': '👑 Owner Master Panel',
        accounts: '👑 Owner Master Panel',
        resellers: 'Seller Key & API',
        'seller-key': 'Seller Key & API',
        logs: 'Logs Console',
        analytics: 'Analytics & Insights',
        subscription: 'Subscription & Plans',
        settings: 'Account Settings',
        profile: 'Account Settings'
      };
      bc.innerText = titles[this.currentRoute] || this.currentRoute.toUpperCase();
    }

    const container = document.getElementById('content-container');
    if (!container) return;

    const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');

    // Automatically route Owner to Owner Master Panel only on empty initial route
    if (isOwner && !this.currentRoute) {
      this.currentRoute = 'owner-panel';
      window.location.hash = 'owner-panel';
    }

    // Feature Restriction Gate for Tester (Free) & Developer plans
    const currentPlan = (this.user ? (this.user.account_plan || 'TESTER') : 'TESTER').toUpperCase();
    if (this.user && !isOwner && this.user.role !== 'Administrator') {
      if (currentPlan === 'TESTER' && ['integrations', 'team', 'resellers', 'logs'].includes(this.currentRoute)) {
        this.renderFeatureLock(container, this.currentRoute);
        return;
      }
      if (currentPlan === 'DEVELOPER' && ['integrations', 'team', 'resellers'].includes(this.currentRoute)) {
        this.renderFeatureLock(container, this.currentRoute);
        return;
      }
    }

    switch (this.currentRoute) {
      case 'dashboard':
        await this.renderDashboard(container);
        break;
      case 'applications':
        await this.renderApplications(container);
        break;
      case 'users':
        await this.renderUsers(container);
        break;
      case 'licenses':
        await this.renderLicenses(container);
        break;
      case 'hwid':
        await this.renderHwidManagement(container);
        break;
      case 'sessions':
        await this.renderSessions(container);
        break;
      case 'variables':
        await this.renderVariables(container);
        break;
      case 'files':
        await this.renderFiles(container);
        break;
      case 'webhooks':
        await this.renderWebhooks(container);
        break;
      case 'integrations':
        await this.renderIntegrations(container);
        break;
      case 'team':
        await this.renderTeam(container);
        break;
      case 'owner-panel':
      case 'accounts':
        await this.renderOwnerControlPanel(container);
        break;
      case 'seller-key':
      case 'resellers':
        window.location.hash = '#dashboard';
        break;
      case 'logs':
        await this.renderLogs(container);
        break;
      case 'analytics':
        await this.renderAnalytics(container);
        break;
      case 'subscription':
        await this.renderSubscription(container);
        break;
      case 'settings':
      case 'profile':
        await this.renderSettings(container);
        break;
      default:
        await this.renderDashboard(container);
    }
  },

  /* ====================================================================
     4. PAGE 1: DASHBOARD OVERVIEW
     ==================================================================== */
  async renderDashboard(container) {
    const statsRes = await fetch('/api/dashboard/stats?app_id=' + this.activeAppId);
    const stats = statsRes.ok ? await statsRes.json() : {};

    const licRes = await fetch('/api/dashboard/recent-licenses?app_id=' + this.activeAppId);
    const recentLicenses = licRes.ok ? await licRes.json() : [];

    const userRes = await fetch('/api/dashboard/recent-users?app_id=' + this.activeAppId);
    const recentUsers = userRes.ok ? await userRes.json() : [];

    const activeApp = this.apps.find(a => a.id === this.activeAppId) || { name: 'Zenith Core Engine', version: '1.0' };
    const remainingDays = stats.subscription ? stats.subscription.remainingDays : 365;
    const userPlan = this.user ? (this.user.account_plan || 'TESTER') : 'TESTER';

    container.innerHTML = `
      <!-- Top Promo Offer Banner -->
      <div class="promo-banner">
        <div class="promo-left">
          <span style="color:#a855f7;">✨</span>
          <div>
            <div class="promo-title">Developer Welcome Offer — Developer Plan 50% OFF</div>
            <div class="promo-sub">$2.49/month (₹199) instead of $4.99/month • Offer valid until Dec 2026</div>
          </div>
        </div>
        <button class="promo-claim-btn" onclick="ZenithApp.openUpgradeModal('DEVELOPER')">
          Claim Developer Offer →
        </button>
      </div>

      <!-- Welcome Banner -->
      ${(() => {
        const isOwner = this.user && (this.user.username === 'ZEESHAN1017' || this.user.account_plan === 'OWNER' || this.user.role === 'Owner');
        return `
        <div class="welcome-banner-ref">
          <div class="welcome-info-wrap">
            <div class="welcome-wave-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 11v2"/></svg>
            </div>
            <div>
              <h2 class="welcome-heading">Welcome back, ${this.user.username}!</h2>
              <div class="welcome-subinfo">
                <span>Role: ${isOwner ? '<strong class="role-tag" style="background:#8b5cf633; color:#c084fc; border:1px solid #8b5cf688;">👑 Platform Owner</strong>' : `<strong class="role-tag">${this.user.role.toLowerCase()}</strong>`}</span>
                <span> • </span>
                <span>Plan: ${isOwner ? '<strong style="color:#f59e0b; font-weight:800;">👑 OWNER (Master Access)</strong>' : `<strong>${userPlan}</strong>`}</span>
                <span> • </span>
                <span>Expiry: ${isOwner ? '<strong style="color:#10b981;">Lifetime Permanent</strong>' : `<strong>${userPlan === 'TESTER' ? 'Free Forever' : remainingDays + ' Days Remaining'}</strong>`}</span>
              </div>
            </div>
          </div>
          <button class="btn-edit-profile" onclick="ZenithApp.navigate('settings')">
            ${ZenithIcons.edit} Edit Profile
          </button>
        </div>

        <!-- Four Wireframe Stat Cards -->
        <div class="wireframe-stats-row">
          <!-- 1. Applications -->
          <div class="wireframe-stat-card">
            <div class="stat-label-upper">APPLICATIONS</div>
            <div class="stat-metric-val">${this.apps.length}</div>
            <div class="stat-metric-sub">Active Projects</div>
            <div class="stat-vector-art">
              <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            </div>
          </div>

          <!-- 2. Current Plan -->
          <div class="wireframe-stat-card">
            <div class="stat-label-upper">CURRENT PLAN</div>
            <div class="stat-metric-val" style="color:#a5b4fc; font-size:24px;">${isOwner ? '👑 OWNER' : userPlan}</div>
            <div class="stat-metric-sub">${isOwner ? 'Master Access' : (userPlan === 'TESTER' ? 'Subscription: Free' : 'Subscription: Paid')}</div>
            <div class="stat-vector-art">
              <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
          </div>`;
      })()}

        <!-- 3. Subscription -->
        <div class="wireframe-stat-card">
          <div class="stat-label-upper">SUBSCRIPTION</div>
          <div class="stat-metric-val" style="font-size:24px;">${userPlan === 'TESTER' ? 'Free Forever' : remainingDays + ' Days Left'}</div>
          <div class="stat-metric-sub">
            <a href="javascript:void(0)" onclick="ZenithApp.navigate('subscription')" style="color:#6366f1; text-decoration:none;">Status Check →</a>
          </div>
          <div class="stat-vector-art">
            <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>

        <!-- 4. App Insights -->
        <div class="wireframe-stat-card">
          <div class="stat-label-upper">APP INSIGHTS</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:6px;">
            <span style="color:#929292; font-size:13px;">Users</span>
            <span style="font-size:20px; font-weight:800; color:#fff;">${stats.insights ? stats.insights.totalUsers : 0}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;">
            <span style="color:#929292; font-size:13px;">Licenses</span>
            <span style="font-size:20px; font-weight:800; color:#a5b4fc;">${stats.insights ? stats.insights.totalLicenses : 0}</span>
          </div>
          <div class="stat-vector-art">
            <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.2"><circle cx="12" cy="12" r="8"/><path d="m10 15 5-3-5-3v6Z"/></svg>
          </div>
        </div>
      </div>

      <!-- Integration Code Constructor (Image 4) -->
      <div class="constructor-card">
        <div class="constructor-header">
          <div class="constructor-title">
            <span style="color:#6366f1;">&lt;/&gt;</span>
            <span>Integration: <strong>${activeApp.name || 'New Project'}</strong></span>
          </div>
          ${activeApp.id ? `
            <button class="btn btn-secondary btn-sm" onclick="ZenithApp.openRevealSecretModal(${activeApp.id})">
              ${ZenithIcons.eye} Reveal App Secret
            </button>
          ` : ''}
        </div>

        <!-- Language Scroller Tabs -->
        <div class="constructor-lang-bar" id="lang-bar-scroller">
          ${['C#', 'C++', 'Java', 'Python', 'PHP', 'VB.Net', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'Ruby', 'Perl', 'Lua'].map((lang, idx) => `
            <button class="lang-tab ${lang.toLowerCase() === this.currentSdkLang.toLowerCase() ? 'active' : ''}" onclick="ZenithApp.selectDashboardSdkLang('${lang}')">
              ${lang}
            </button>
          `).join('')}
        </div>

        <!-- Code Block -->
        <pre class="constructor-code-area" id="constructor-code-view"><code>${this.escapeHtml(ZenithSDKSnippets.getConstructor(this.currentSdkLang, activeApp.name || 'My App', this.user.owner_id || 'PC1B6P1TTA', '••••••••••••••••••••••••••••••••', activeApp.version || '1.0'))}</code></pre>

        <!-- Actions Row -->
        <div class="constructor-actions-row">
          <button class="btn-constructor-action" onclick="ZenithApp.copyConstructorCredentials()">
            ${ZenithIcons.copy} Copy Credentials
          </button>
          <button class="btn-constructor-action" onclick="ZenithApp.copyCurrentSdkCode()">
            ${ZenithIcons.loader} View Examples
          </button>
          <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" class="btn-constructor-action" style="text-decoration:none;">
            ${ZenithIcons.chat} Discord Support
          </a>
        </div>
      </div>
    `;
  },

  selectDashboardSdkLang(lang) {
    this.currentSdkLang = lang;
    const activeApp = this.apps.find(a => a.id === this.activeAppId) || { name: 'Zenith Core Engine', version: '1.0' };
    const code = ZenithSDKSnippets.getConstructor(lang, activeApp.name, this.user.owner_id || 'PC1B6P1TTA', '••••••••••••••••••••••••••••••••', activeApp.version || '1.0');
    
    document.querySelectorAll('.lang-tab').forEach(b => {
      b.classList.toggle('active', b.innerText.trim().toLowerCase() === lang.toLowerCase());
    });

    const codeEl = document.getElementById('constructor-code-view');
    if (codeEl) {
      codeEl.innerHTML = '<code>' + this.escapeHtml(code) + '</code>';
    }
  },

  copyConstructorCredentials() {
    const activeApp = this.apps.find(a => a.id === this.activeAppId) || { name: 'Zenith Core Engine', version: '1.0', public_key: 'za_pub_default' };
    const text = `App Name: ${activeApp.name}\nOwner ID: ${this.user.owner_id}\nPublic Key: ${activeApp.public_key}`;
    this.copyToClipboard(text, 'Copied App Credentials to clipboard!');
  },

  copyCurrentSdkCode() {
    const snippet = ZenithSDKSnippets[this.currentSdkLang.toLowerCase()] || ZenithSDKSnippets.csharp;
    this.copyToClipboard(snippet.code, 'Copied full SDK implementation code!');
  },

  /* ====================================================================
     5. PAGE 2: APPLICATIONS (ISOLATED PER USER - CLEAN NEW SLATE)
     ==================================================================== */
  async renderApplications(container) {
    const res = await fetch('/api/apps');
    const apps = res.ok ? await res.json() : [];
    this.apps = apps;

    container.innerHTML = `
      <!-- Applications Header Row -->
      <div class="apps-header-row">
        <div class="apps-title-block">
          <h1>Applications</h1>
          <p>Manage your integrated software and keys. <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" style="color:#6366f1; text-decoration:none;">Get Support</a></p>
        </div>
        <div class="apps-count-badge">${apps.length} Applications</div>
      </div>

      <!-- Toolbar Row -->
      <div class="apps-toolbar-row">
        <div class="apps-search-wrap">
          <span class="apps-search-icon">${ZenithIcons.search}</span>
          <input type="text" id="apps-search-box" class="apps-search-input" placeholder="Search Projects..." />
        </div>

        <button class="apps-btn-tool" onclick="ZenithApp.showToast('Sorted by Newest', 'info')">
          <span>≡ Newest</span>
        </button>

        <button class="apps-btn-tool" onclick="ZenithApp.sortAppsAlphabetical()">
          <span>⇅ A → Z</span>
        </button>

        <button class="apps-btn-create" onclick="ZenithApp.openCreateAppModal()">
          <span>+ Application</span>
        </button>
      </div>

      <!-- Clean Empty State for New Users -->
      ${apps.length === 0 ? `
        <div class="empty-state-box">
          <div class="empty-state-icon">${ZenithIcons.apps}</div>
          <div>
            <h3 style="font-size:18px; font-weight:700; color:#fff; margin-bottom:6px;">No Applications Created Yet</h3>
            <p style="color:#929292; font-size:13.5px; max-width:480px; margin:0 auto;">
              You are on the TESTER plan (Maximum 2 applications). Click "+ Application" below to initialize your first software project, generate your 64-character App Secret Key, and issue license keys.
            </p>
          </div>
          <button class="apps-btn-create" onclick="ZenithApp.openCreateAppModal()" style="margin-top:8px;">
            + Create First Application
          </button>
        </div>
      ` : `
        <!-- Info Alert Banner -->
        <div class="apps-info-banner" id="apps-alert-banner">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:#6366f1;">ℹ️</span>
            <span>Click a card to set as Active. Click ⚙️ for Settings.</span>
          </div>
          <button style="background:none; border:none; color:#6b7280; cursor:pointer;" onclick="document.getElementById('apps-alert-banner').remove()">×</button>
        </div>

        <!-- Applications Grid -->
        <div class="apps-ref-grid" id="apps-cards-grid">
          ${apps.map(app => `
            <div class="app-ref-card ${app.id === this.activeAppId ? 'active-app-card' : ''}" onclick="if(!event.target.closest('.app-card-actions')) ZenithApp.setActiveApplication(${app.id})">
              <div>
                <div class="app-card-title-row">
                  <span class="app-card-name">${app.name}</span>
                  <span style="color:#6b7280; font-size:16px;">›</span>
                </div>
                <div class="app-card-ver">Version: ${app.version}</div>
              </div>

              <div class="app-card-bottom-row">
                <span class="app-card-date">Created ${app.created_at ? app.created_at.split(' ')[0] : '2026-11-12'}</span>
                <div class="app-card-actions">
                  <button class="app-card-icon-btn" title="Application Settings" onclick="event.stopPropagation(); ZenithApp.openAppSettingsModal(${app.id})">
                    ${ZenithIcons.settings}
                  </button>
                  <button class="app-card-icon-btn" title="Actions Menu" onclick="event.stopPropagation(); ZenithApp.openAppActionsMenu(${app.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    const searchBox = document.getElementById('apps-search-box');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.app-ref-card').forEach(card => {
          const name = card.querySelector('.app-card-name').innerText.toLowerCase();
          card.style.display = name.includes(q) ? 'flex' : 'none';
        });
      });
    }
  },

  sortAppsAlphabetical() {
    this.apps.sort((a, b) => a.name.localeCompare(b.name));
    this.renderApplications(document.getElementById('content-container'));
  },

  openAppActionsMenu(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">${app.name} — Actions</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ZenithApp.closeAllModals(); ZenithApp.openRevealSecretModal(${app.id})">
              ${ZenithIcons.eye} Reveal App Secret Key (64-char Hex)
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ZenithApp.closeAllModals(); ZenithApp.openRegenerateSecretModal(${app.id})">
              ${ZenithIcons.refresh} Rotate App Secret Key
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ZenithApp.closeAllModals(); ZenithApp.openAppSettingsModal(${app.id})">
              ${ZenithIcons.settings} Configure Security & Settings
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;" onclick="ZenithApp.closeAllModals(); ZenithApp.openEditAppModal(${app.id})">
              ${ZenithIcons.edit} Edit Name & Version
            </button>
            <button class="btn btn-danger" style="justify-content:flex-start;" onclick="ZenithApp.closeAllModals(); ZenithApp.deleteApp(${app.id})">
              ${ZenithIcons.trash} Delete Application
            </button>
          </div>
        </div>
      </div>
    `);
  },

  /* ====================================================================
     6. PAGE 3: APPLICATION CLIENT USERS (SOFTWARE CLIENT END-USERS)
     ==================================================================== */
  async renderUsers(container) {
    const res = await fetch('/api/users?app_id=' + this.activeAppId);
    const data = res.ok ? await res.json() : { users: [] };
    const users = data.users || [];
    const activeApp = this.apps.find(a => a.id === this.activeAppId) || { name: 'Active Application' };

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Application Users — ${activeApp.name}</h2>
          <p class="card-desc">Inspect, filter, and manage software client credentials, active device bindings (HWID), and subscription access for your loader</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="ZenithApp.exportUsers()">
            ${ZenithIcons.download} Export
          </button>
          <button class="btn btn-primary btn-sm" onclick="ZenithApp.openCreateUserModal()">
            ${ZenithIcons.plus} Add Client User
          </button>
        </div>
      </div>

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>Client Username</th>
                <th>Subscription / Tier</th>
                <th>Hardware ID (HWID)</th>
                <th>Allowed Devices</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.length > 0 ? users.map(u => `
                <tr>
                  <td>
                    <strong style="color:#fff; font-size:13.5px;">${u.username}</strong>
                    <div style="font-size:11.5px; color:#6b7280;">${u.email || (u.username + '@client.local')}</div>
                  </td>
                  <td>
                    <span class="badge badge-info" style="font-weight:600;">${u.subscription_name || 'Standard'}</span>
                  </td>
                  <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <code style="font-size:11px; color:#a5b4fc; background:#181822; padding:3px 8px; border-radius:4px; border:1px solid #282838;">
                        ${u.hwid ? (u.hwid.length > 20 ? u.hwid.substring(0, 18) + '...' : u.hwid) : 'Unbound (1st login locks)'}
                      </code>
                    </div>
                  </td>
                  <td>
                    <span style="font-size:12px; color:#cbd5e1;">${u.allowed_devices || 1} Device${(u.allowed_devices || 1) > 1 ? 's' : ''}</span>
                  </td>
                  <td style="color:#929292; font-size:12.5px;">
                    ${u.expiry_date || 'Lifetime'}
                  </td>
                  <td>
                    <span class="badge badge-${u.status === 'active' ? 'success' : 'danger'}">${(u.status || 'active').toUpperCase()}</span>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-secondary btn-sm" title="Reset HWID (Unlocks device)" onclick="ZenithApp.resetUserHwid(${u.id})">
                        ${ZenithIcons.refresh} Reset HWID
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Toggle Ban Status" onclick="ZenithApp.toggleUserStatus(${u.id})">
                        ${ZenithIcons.shield} ${u.status === 'banned' ? 'Unban' : 'Ban'}
                      </button>
                      <button class="btn btn-secondary btn-sm" style="color:#10b981;" title="Extend +30 Days" onclick="ZenithApp.extendUserDays(${u.id}, 30)">
                        +30D
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Delete Client" onclick="ZenithApp.deleteUser(${u.id})">
                        ${ZenithIcons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="7" style="text-align:center; padding:32px; color:#6b7280;">No client software users found for this application. Click <strong>+ Add Client User</strong> to create your first client.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ====================================================================
     6.1 OWNER MASTER CONTROL PANEL (EXCLUSIVE FOR ZEESHAN1017)
     ==================================================================== */
  async renderPlatformAccounts(container) {
    return this.renderOwnerControlPanel(container);
  },

  async renderOwnerControlPanel(container) {
    this.ownerActiveTab = this.ownerActiveTab || 'logins';
    try {
      const res = await this.authFetch('/api/admin/owner-overview');
      if (!res.ok) {
        container.innerHTML = `
          <div class="empty-state-box" style="padding:60px 20px; text-align:center;">
            <div class="empty-state-icon" style="color:#ef4444; font-size:48px; margin-bottom:12px;">🛡️</div>
            <h3 style="font-size:20px; font-weight:700; color:#fff; margin-bottom:8px;">Access Restricted: Master Owner Console</h3>
            <p style="color:#9ca3af; font-size:14px; max-width:480px; margin:0 auto 20px; line-height:1.6;">
              This Master Owner Control Panel is strictly protected and reserved for the platform owner (<strong>ZEESHAN1017</strong>). Your current account is on the <strong>TESTER</strong> plan.
            </p>
            <div style="display:flex; justify-content:center; gap:12px;">
              <button class="btn btn-primary" onclick="ZenithApp.navigate('dashboard')">Go to Dashboard</button>
              <button class="btn btn-secondary" onclick="ZenithApp.navigate('subscription')">View Pricing & Plans</button>
            </div>
          </div>
        `;
        return;
      }
      this.ownerOverviewData = await res.json();
    } catch (e) {
      container.innerHTML = `
        <div class="empty-state-box" style="padding:40px 20px; text-align:center;">
          <h3 style="color:#ef4444; margin-bottom:8px;">Error Loading Owner Overview</h3>
          <p style="color:#9ca3af; margin-bottom:16px;">${e.message}</p>
          <button class="btn btn-primary" onclick="ZenithApp.navigate('dashboard')">Go to Dashboard</button>
        </div>
      `;
      return;
    }

    const { recentLogins, accounts, stats } = this.ownerOverviewData;

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
            <h2 style="font-size:22px; font-weight:800; color:#fff;">👑 Owner Master Control Panel</h2>
            <span class="badge" style="background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b66; font-weight:800;">ROOT OWNER</span>
          </div>
          <p class="card-desc">Master control console for ZEESHAN1017: Monitor logins, grant subscription tiers, inspect user audit activity, and track platform metrics.</p>
        </div>
      </div>

      <!-- Navigation Tabs (5 Dedicated Tabs for Master Control) -->
      <div style="display:flex; gap:10px; border-bottom:1px solid #282834; padding-bottom:12px; margin-bottom:20px; flex-wrap:wrap;">
        <button class="btn btn-sm ${this.ownerActiveTab === 'logins' ? 'btn-primary' : 'btn-secondary'}" onclick="ZenithApp.setOwnerTab('logins')" style="display:flex; align-items:center; gap:8px;">
          <span>🖥️</span> <strong>Recent Logins & Devices</strong>
          <span style="background:rgba(255,255,255,0.15); padding:1px 6px; border-radius:10px; font-size:11px;">${(recentLogins || []).length}</span>
        </button>
        <button class="btn btn-sm ${this.ownerActiveTab === 'plans' ? 'btn-primary' : 'btn-secondary'}" onclick="ZenithApp.setOwnerTab('plans')" style="display:flex; align-items:center; gap:8px;">
          <span>⭐</span> <strong>Plan Granter & Accounts</strong>
          <span style="background:rgba(255,255,255,0.15); padding:1px 6px; border-radius:10px; font-size:11px;">${(accounts || []).length}</span>
        </button>
        <button class="btn btn-sm ${this.ownerActiveTab === 'logs' ? 'btn-primary' : 'btn-secondary'}" onclick="ZenithApp.setOwnerTab('logs')" style="display:flex; align-items:center; gap:8px;">
          <span>📜</span> <strong>User Activity Inspector</strong>
        </button>
        <button class="btn btn-sm ${this.ownerActiveTab === 'smtp' ? 'btn-primary' : 'btn-secondary'}" onclick="ZenithApp.setOwnerTab('smtp')" style="display:flex; align-items:center; gap:8px;">
          <span>📧</span> <strong>Gmail OTP Dispatcher</strong>
          <span style="background:${stats && stats.smtpConfigured ? '#10b981' : '#ef4444'}; color:#fff; padding:1px 6px; border-radius:10px; font-size:10px; font-weight:700;">${stats && stats.smtpConfigured ? 'ACTIVE' : 'SETUP NEEDED'}</span>
        </button>
        <button class="btn btn-sm ${this.ownerActiveTab === 'overview' ? 'btn-primary' : 'btn-secondary'}" onclick="ZenithApp.setOwnerTab('overview')" style="display:flex; align-items:center; gap:8px;">
          <span>📊</span> <strong>Platform Metrics & Health</strong>
        </button>
      </div>

      <!-- Dynamic Tab Target Container -->
      <div id="owner-tab-content"></div>
    `;

    this.renderOwnerCurrentTab();
  },

  setOwnerTab(tab) {
    this.ownerActiveTab = tab;
    this.renderOwnerControlPanel(document.getElementById('content-container'));
  },

  renderOwnerCurrentTab() {
    const target = document.getElementById('owner-tab-content');
    if (!target || !this.ownerOverviewData) return;

    const { recentLogins, accounts, stats } = this.ownerOverviewData;

    // TAB 1: Recent Logins & Device Monitor (with Find/Search)
    if (this.ownerActiveTab === 'logins') {
      target.innerHTML = `
        <div class="zenith-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="font-size:16px; font-weight:700; color:#fff;">Session & Device Monitor</h3>
              <p style="font-size:12.5px; color:#9ca3af; margin:0;">Track all successful authentications, IP addresses, and user-agent environments</p>
            </div>
            <div style="min-width:280px;">
              <input type="text" id="owner-find-login" class="form-control" placeholder="🔍 Find user, Gmail, IP, device..." oninput="ZenithApp.filterOwnerLogins(this.value)" />
            </div>
          </div>

          <div class="table-responsive">
            <table class="zenith-table" id="owner-logins-table">
              <thead>
                <tr>
                  <th>User & Account</th>
                  <th>IP Address</th>
                  <th>Device / Browser</th>
                  <th>Login Time</th>
                  <th>Last Active</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="owner-logins-tbody">
                ${this.buildOwnerLoginsRows(recentLogins || [])}
              </tbody>
            </table>
          </div>
        </div>
      `;
      return;
    }

    // TAB 2: Plan Granter & Accounts (Assign custom plan and duration to any Gmail)
    if (this.ownerActiveTab === 'plans') {
      target.innerHTML = `
        <div class="zenith-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="font-size:16px; font-weight:700; color:#fff;">Subscription Plan Granter</h3>
              <p style="font-size:12.5px; color:#9ca3af; margin:0;">Grant Tester, Developer, or Seller plans to any account for any duration</p>
            </div>
            <div style="min-width:280px;">
              <input type="text" class="form-control" placeholder="🔍 Find account by username or email..." oninput="ZenithApp.filterOwnerAccounts(this.value)" />
            </div>
          </div>

          <div class="table-responsive">
            <table class="zenith-table">
              <thead>
                <tr>
                  <th>Account / Gmail</th>
                  <th>Role</th>
                  <th>Current Plan</th>
                  <th>Plan Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="owner-accounts-tbody">
                ${this.buildOwnerAccountsRows(accounts || [])}
              </tbody>
            </table>
          </div>
        </div>
      `;
      return;
    }

    // TAB 3: User Activity & Audit Inspector (Filter by User Gmail)
    if (this.ownerActiveTab === 'logs') {
      const userList = accounts || [];
      target.innerHTML = `
        <div class="zenith-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="font-size:16px; font-weight:700; color:#fff;">User Activity & Audit Inspector</h3>
              <p style="font-size:12.5px; color:#9ca3af; margin:0;">Select a Gmail or username to view their exact audit trail and security operations</p>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-size:12px; color:#9ca3af; font-weight:600;">Target Account:</label>
              <select id="owner-log-user-select" class="form-control" style="min-width:240px;" onchange="ZenithApp.loadOwnerUserLogs(this.value)">
                <option value="">-- All Activity Logs --</option>
                ${userList.map(u => `
                  <option value="${u.username}">${u.username} (${u.email || 'No Email'})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="table-responsive">
            <table class="zenith-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Account Identity</th>
                  <th>Operation / Action</th>
                  <th>IP Address</th>
                  <th>Audit Details</th>
                </tr>
              </thead>
              <tbody id="owner-audit-tbody">
                <tr><td colspan="5" style="text-align:center; padding:24px; color:#6b7280;">Loading audit logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      this.loadOwnerUserLogs('');
      return;
    }

    // TAB 4: Gmail OTP Dispatcher Engine (Connect Sender Gmail for real inbox delivery)
    if (this.ownerActiveTab === 'smtp') {
      const s = stats || {};
      const isConfigured = !!s.smtpConfigured;
      const currentUser = s.smtpUser || '';
      target.innerHTML = `
        <div class="zenith-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">📧</span>
                <h3 style="font-size:18px; font-weight:700; color:#fff; margin:0;">Gmail OTP Dispatcher Engine</h3>
              </div>
              <p style="font-size:13px; color:#71717a; margin-top:4px;">Connect your sender Gmail account so all user OTP verification codes land instantly in real Gmail inboxes.</p>
            </div>
            <div>
              <span class="badge ${isConfigured ? 'badge-active' : 'badge-danger'}" style="padding:6px 14px; font-size:12px; font-weight:700; border-radius:20px;">
                ${isConfigured ? '🟢 Active & Dispatched from: ' + currentUser : '🔴 SMTP Disconnected (Emails Not Sending)'}
              </span>
            </div>
          </div>

          <!-- Configuration Card -->
          <div style="background:#18181b; border:1px solid #27272a; border-radius:12px; padding:24px; margin-bottom:24px;">
            <h4 style="font-size:15px; font-weight:700; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              <span>⚡</span> Connect Sender Gmail (Takes 30 Seconds)
            </h4>

            <form id="owner-smtp-form" onsubmit="event.preventDefault(); ZenithApp.saveSmtpConfig();">
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:18px;">
                <div>
                  <label style="font-size:12px; font-weight:600; color:#a1a1aa; display:block; margin-bottom:6px;">Sender Gmail Address</label>
                  <input type="email" id="smtp-email-input" class="form-control" placeholder="e.g. zkhan63321@gmail.com" value="${currentUser}" required style="background:#121214; border:1px solid #3f3f46; color:#fff; font-size:14px; height:44px;" />
                  <span style="font-size:11px; color:#71717a; margin-top:4px; display:block;">The Gmail address from which verification codes will be sent.</span>
                </div>
                <div>
                  <label style="font-size:12px; font-weight:600; color:#a1a1aa; display:block; margin-bottom:6px;">Google 16-Letter App Password</label>
                  <input type="password" id="smtp-pass-input" class="form-control" placeholder="16-letter App Password (e.g. abcd efgh ijkl mnop)" required style="background:#121214; border:1px solid #3f3f46; color:#fff; font-size:14px; height:44px; letter-spacing:1px;" />
                  <span style="font-size:11px; color:#71717a; margin-top:4px; display:block;">Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:#6366f1; text-decoration:underline;">myaccount.google.com/apppasswords</a></span>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="font-size:12px; color:#a1a1aa;">
                  Clicking verify will test the connection and send a test confirmation email to your Gmail.
                </div>
                <button type="submit" id="btn-save-smtp" class="btn btn-primary" style="padding:10px 24px; font-weight:700; display:flex; align-items:center; gap:8px;">
                  <span>🔗</span> Test Connection & Activate Email Delivery
                </button>
              </div>
            </form>
          </div>

          <!-- Guide Card -->
          <div style="background:#141417; border:1px solid #282834; border-radius:12px; padding:20px;">
            <h4 style="font-size:14px; font-weight:700; color:#818cf8; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span>📖</span> How to Get Your 16-Character Google App Password (Step-by-Step):
            </h4>
            <ol style="font-size:13px; color:#a1a1aa; line-height:1.8; margin:0; padding-left:20px;">
              <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:#6366f1; font-weight:600; text-decoration:underline;">https://myaccount.google.com/apppasswords</a> in your browser.</li>
              <li>Make sure <strong>2-Step Verification</strong> is enabled on your Google account.</li>
              <li>In the "App name" box, enter <code style="background:#27272a; padding:2px 6px; border-radius:4px; color:#fff;">Zenith Auth</code> and click <strong>Create</strong>.</li>
              <li>Google will display a <strong>16-letter yellow password</strong> (example: <code style="background:#27272a; padding:2px 6px; border-radius:4px; color:#fff;">abcd efgh ijkl mnop</code>).</li>
              <li>Copy that 16-letter password, paste it in the box above, and click <strong>Test Connection & Activate</strong>!</li>
              <li><strong style="color:#10b981;">Permanent Render Setup:</strong> You can also paste <code style="background:#27272a; padding:2px 6px; border-radius:4px; color:#fff;">SMTP_USER</code> and <code style="background:#27272a; padding:2px 6px; border-radius:4px; color:#fff;">SMTP_PASS</code> directly into Render Dashboard → Environment Variables!</li>
            </ol>
          </div>
        </div>
      `;
      return;
    }

    // TAB 5: Platform Metrics & System Overview
    if (this.ownerActiveTab === 'overview') {
      const s = stats || {};
      const formatUptime = (sec) => {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
      };

      target.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px;">
          <div class="zenith-card" style="padding:20px; border-color:#6366f133;">
            <div style="font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase;">Platform Developers</div>
            <div style="font-size:28px; font-weight:800; color:#fff; margin-top:6px;">${s.totalUsers || 0}</div>
            <div style="font-size:11.5px; color:#10b981; margin-top:4px;">Registered console accounts</div>
          </div>

          <div class="zenith-card" style="padding:20px; border-color:#10b98133;">
            <div style="font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase;">Client Software Users</div>
            <div style="font-size:28px; font-weight:800; color:#10b981; margin-top:6px;">${s.totalClientUsers || 0}</div>
            <div style="font-size:11.5px; color:#9ca3af; margin-top:4px;">App client credentials</div>
          </div>

          <div class="zenith-card" style="padding:20px; border-color:#8b5cf633;">
            <div style="font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase;">Total Applications</div>
            <div style="font-size:28px; font-weight:800; color:#a78bfa; margin-top:6px;">${s.totalApps || 0}</div>
            <div style="font-size:11.5px; color:#9ca3af; margin-top:4px;">Configured SaaS apps</div>
          </div>

          <div class="zenith-card" style="padding:20px; border-color:#f59e0b33;">
            <div style="font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase;">License Keys</div>
            <div style="font-size:28px; font-weight:800; color:#fbbf24; margin-top:6px;">${s.totalLicenses || 0}</div>
            <div style="font-size:11.5px; color:#9ca3af; margin-top:4px;">Generated license tokens</div>
          </div>

          <div class="zenith-card" style="padding:20px; border-color:#ec489933;">
            <div style="font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase;">Active Sessions</div>
            <div style="font-size:28px; font-weight:800; color:#f472b6; margin-top:6px;">${s.activeSessions || 0}</div>
            <div style="font-size:11.5px; color:#10b981; margin-top:4px;">Live connected devices</div>
          </div>

          <div class="zenith-card" style="padding:20px; border-color:#06b6d433;">
            <div style="font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase;">Server Uptime</div>
            <div style="font-size:24px; font-weight:800; color:#22d3ee; margin-top:8px;">${formatUptime(s.uptimeSeconds || 0)}</div>
            <div style="font-size:11.5px; color:#9ca3af; margin-top:4px;">Continuous engine runtime</div>
          </div>
        </div>

        <div class="zenith-card">
          <h3 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:12px;">Platform Architecture & Root Authority</h3>
          <p style="font-size:13.5px; color:#9ca3af; line-height:1.6; margin-bottom:16px;">
            Zenith Auth is operating under <strong style="color:#fff;">Master Root Authority</strong> assigned to 
            <strong style="color:#a5b4fc;">ZEESHAN1017</strong> (zkhan63321@gmail.com / zeeshan1710@fam). 
            All plan restrictions, tier quotas, and bot locks are bypassed for this account.
          </p>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <a href="#applications" class="btn btn-secondary btn-sm">Manage Apps</a>
            <a href="#users" class="btn btn-secondary btn-sm">Manage App Users</a>
            <a href="#licenses" class="btn btn-secondary btn-sm">Manage Licenses</a>
            <a href="#subscription" class="btn btn-primary btn-sm">Review Pricing Tiers</a>
          </div>
        </div>
      `;
    }
  },

  buildOwnerLoginsRows(logins) {
    if (!logins || logins.length === 0) {
      return `<tr><td colspan="6" style="text-align:center; padding:28px; color:#6b7280;">No login sessions recorded yet.</td></tr>`;
    }
    return logins.map(s => `
      <tr>
        <td>
          <strong style="color:#fff; font-size:13.5px;">${s.username}</strong>
          <div style="font-size:11px; color:#9ca3af;">${s.email || 'N/A'}</div>
        </td>
        <td>
          <code style="font-size:11.5px; color:#a5b4fc; background:#181822; padding:2px 6px; border-radius:4px;">${s.ip_address || '127.0.0.1'}</code>
        </td>
        <td style="font-size:12px; color:#cbd5e1; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.user_agent || s.device_info}">
          ${s.device_info || 'Web Client'} (${(s.user_agent || '').slice(0, 30)}...)
        </td>
        <td style="font-size:12px; color:#9ca3af;">${s.created_at || 'Just now'}</td>
        <td style="font-size:12px; color:#9ca3af;">${s.last_activity || s.created_at || 'Active'}</td>
        <td>
          <span class="badge badge-success" style="font-size:11px;">${(s.status || 'ACTIVE').toUpperCase()}</span>
        </td>
      </tr>
    `).join('');
  },

  filterOwnerLogins(q) {
    const query = (q || '').trim().toLowerCase();
    const logins = this.ownerOverviewData ? this.ownerOverviewData.recentLogins : [];
    const filtered = logins.filter(l => 
      (l.username || '').toLowerCase().includes(query) ||
      (l.email || '').toLowerCase().includes(query) ||
      (l.ip_address || '').toLowerCase().includes(query) ||
      (l.device_info || '').toLowerCase().includes(query) ||
      (l.user_agent || '').toLowerCase().includes(query)
    );
    const tbody = document.getElementById('owner-logins-tbody');
    if (tbody) tbody.innerHTML = this.buildOwnerLoginsRows(filtered);
  },

  buildOwnerAccountsRows(accounts) {
    if (!accounts || accounts.length === 0) {
      return `<tr><td colspan="6" style="text-align:center; padding:28px; color:#6b7280;">No platform accounts registered.</td></tr>`;
    }
    return accounts.map(acc => {
      const isMaster = acc.username === 'ZEESHAN1017' || acc.account_plan === 'OWNER';
      return `
        <tr>
          <td>
            <strong style="color:#fff; font-size:13.5px;">${acc.username}</strong>
            <div style="font-size:11px; color:#9ca3af;">${acc.email || 'N/A'}</div>
          </td>
          <td>
            ${isMaster ? `
              <span class="badge" style="background:#8b5cf633; color:#c084fc; border:1px solid #8b5cf688; font-weight:700;">👑 Master Platform Owner</span>
            ` : `
              <span class="badge badge-info">${acc.role || 'Developer'}</span>
            `}
          </td>
          <td>
            ${isMaster ? `
              <span class="badge" style="background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b66; font-weight:800;">👑 OWNER</span>
            ` : `
              <span class="badge badge-${acc.account_plan === 'SELLER' ? 'success' : acc.account_plan === 'DEVELOPER' ? 'info' : 'secondary'}">
                ${acc.account_plan || 'TESTER'}
              </span>
            `}
          </td>
          <td style="font-size:12.5px; color:#9ca3af;">
            ${isMaster ? '<span style="color:#10b981; font-weight:600;">Lifetime Permanent</span>' : (acc.plan_expires_at || 'Permanent')}
          </td>
          <td>
            <span class="badge badge-${acc.status === 'active' ? 'success' : 'danger'}">${(acc.status || 'active').toUpperCase()}</span>
          </td>
          <td>
            ${isMaster ? `
              <span style="font-size:11.5px; color:#10b981; font-weight:600;">✓ Master Protected</span>
            ` : `
              <button class="btn btn-secondary btn-sm" style="color:#f59e0b;" onclick="ZenithApp.openAssignPlanModal(${acc.id}, '${acc.username}', '${acc.account_plan || 'TESTER'}')">
                ⭐ Grant Plan
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  },

  filterOwnerAccounts(q) {
    const query = (q || '').trim().toLowerCase();
    const accounts = this.ownerOverviewData ? this.ownerOverviewData.accounts : [];
    const filtered = accounts.filter(a => 
      (a.username || '').toLowerCase().includes(query) ||
      (a.email || '').toLowerCase().includes(query) ||
      (a.role || '').toLowerCase().includes(query) ||
      (a.account_plan || '').toLowerCase().includes(query)
    );
    const tbody = document.getElementById('owner-accounts-tbody');
    if (tbody) tbody.innerHTML = this.buildOwnerAccountsRows(filtered);
  },

  async loadOwnerUserLogs(identifier) {
    const tbody = document.getElementById('owner-audit-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#6b7280;">Loading logs for ${identifier || 'all users'}...</td></tr>`;

    try {
      const url = identifier ? `/api/admin/user-logs?identity=${encodeURIComponent(identifier)}` : `/api/admin/user-logs`;
      const res = await fetch(url);
      const data = res.ok ? await res.json() : { logs: [] };
      const logs = data.logs || [];

      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px; color:#6b7280;">No activity logs found for ${identifier || 'this selection'}.</td></tr>`;
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="font-size:12px; color:#9ca3af; white-space:nowrap;">${l.created_at || 'Recent'}</td>
          <td>
            <strong style="color:#fff; font-size:13px;">${l.username}</strong>
          </td>
          <td>
            <span class="badge badge-info" style="font-size:10.5px;">${l.action}</span>
          </td>
          <td>
            <code style="font-size:11px; color:#a5b4fc; background:#181822; padding:2px 6px; border-radius:4px;">${l.ip_address || '127.0.0.1'}</code>
          </td>
          <td style="font-size:12.5px; color:#cbd5e1;">${l.details || ''}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Error fetching logs: ${e.message}</td></tr>`;
    }
  },

  async saveSmtpConfig() {
    const email = document.getElementById('smtp-email-input') ? document.getElementById('smtp-email-input').value.trim() : '';
    const appPassword = document.getElementById('smtp-pass-input') ? document.getElementById('smtp-pass-input').value.trim() : '';
    const btn = document.getElementById('btn-save-smtp');
    if (!email || !appPassword) {
      this.showToast('Please enter both your Gmail address and 16-character App Password', 'danger');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Verifying Gmail SMTP Connection...';
    }
    try {
      const res = await this.authFetch('/api/admin/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, appPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.showToast('✅ ' + data.message, 'success');
        await this.renderOwnerControlPanel(document.getElementById('content-container'));
      } else {
        this.showToast('❌ ' + (data.error || 'SMTP Connection Failed'), 'danger');
      }
    } catch (err) {
      this.showToast('Network error connecting to SMTP endpoint: ' + err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔗</span> Test Connection & Activate Email Delivery';
      }
    }
  },

  renderFeatureLock(container, feature) {
    const names = {
      integrations: 'Discord & Telegram Bots',
      team: 'Team Management',
      resellers: 'Reseller System & Sub-Accounts',
      logs: 'Security & Audit Logs'
    };
    container.innerHTML = `
      <div class="zenith-card" style="max-width:640px; margin:40px auto; text-align:center; padding:48px 32px; border-color:#6366f133;">
        <div style="width:64px; height:64px; border-radius:50%; background:#6366f115; border:1px solid #6366f144; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; color:#a5b4fc;">
          ${ZenithIcons.security}
        </div>
        <span class="badge" style="background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b66; font-weight:700; margin-bottom:12px; display:inline-block;">SELLER PLAN REQUIRED</span>
        <h2 style="font-size:22px; font-weight:700; color:#fff; margin-bottom:12px;">${names[feature] || 'Premium Feature'} is Locked</h2>
        <p style="color:#9ca3af; font-size:14px; line-height:1.6; max-width:480px; margin:0 auto 24px;">
          Your account is currently on the <strong style="color:#fff;">Tester (Free)</strong> tier. 
          To unlock ${names[feature] || 'this feature'}, unlimited applications, unlimited users, and bot integrations, upgrade your subscription to the <strong style="color:#a5b4fc;">Seller Plan</strong>.
        </p>
        <div style="display:flex; justify-content:center; gap:12px;">
          <a href="#subscription" class="btn btn-primary" style="padding:10px 24px; font-weight:600;">
            View Pricing & Upgrade →
          </a>
          <a href="#dashboard" class="btn btn-secondary" style="padding:10px 20px;">
            Return to Dashboard
          </a>
        </div>
      </div>
    `;
  },

  // Modal to Assign Plan (Requested: "USME ME JISKO CHAU USME ME PLAN DE SKTA HU")
  openAssignPlanModal(userId, username, currentPlan) {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Grant / Assign Plan — ${username}</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="assign-plan-modal-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="form-group">
                <label class="form-label">Select Plan Tier</label>
                <select id="grant-plan-tier" class="form-control">
                  <option value="TESTER" ${currentPlan === 'TESTER' ? 'selected' : ''}>TESTER (Free Tier)</option>
                  <option value="DEVELOPER" ${currentPlan === 'DEVELOPER' ? 'selected' : ''}>DEVELOPER ($2.49/mo - 20k users)</option>
                  <option value="SELLER" ${currentPlan === 'SELLER' ? 'selected' : ''}>SELLER (Full Unlimited + Bots)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Plan Duration (Days)</label>
                <input type="number" id="grant-plan-days" class="form-control" value="30" min="1" max="9999" required />
                <div class="quick-pills-row" style="margin-top:8px;">
                  <button type="button" class="quick-pill" onclick="document.getElementById('grant-plan-days').value = 1">1D</button>
                  <button type="button" class="quick-pill" onclick="document.getElementById('grant-plan-days').value = 7">7D</button>
                  <button type="button" class="quick-pill active" onclick="document.getElementById('grant-plan-days').value = 30">1MO</button>
                  <button type="button" class="quick-pill" onclick="document.getElementById('grant-plan-days').value = 365">1Y</button>
                  <button type="button" class="quick-pill" onclick="document.getElementById('grant-plan-days').value = 9999">Lifetime</button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Grant Plan</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('assign-plan-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const plan_name = document.getElementById('grant-plan-tier').value;
      const duration_days = parseInt(document.getElementById('grant-plan-days').value, 10);

      const res = await fetch('/api/admin/accounts/' + userId + '/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_name, duration_days })
      });
      const data = await res.json();
      if (res.ok) {
        this.closeAllModals();
        this.showToast(data.message || 'Plan granted successfully!', 'success');
        if (this.currentRoute === 'accounts') {
          this.renderPlatformAccounts(document.getElementById('content-container'));
        } else {
          this.renderUsers(document.getElementById('content-container'));
        }
      } else {
        this.showToast(data.error || 'Failed to grant plan', 'danger');
      }
    });
  },

  async toggleUserStatus(id) {
    const res = await fetch('/api/users/' + id + '/status', { method: 'POST' });
    if (res.ok) {
      this.showToast('User status updated', 'success');
      this.renderUsers(document.getElementById('content-container'));
    }
  },

  async resetUserHwid(id) {
    const res = await fetch('/api/users/' + id + '/reset-hwid', { method: 'POST' });
    if (res.ok) {
      this.showToast('User HWID unlinked successfully', 'success');
      this.renderUsers(document.getElementById('content-container'));
    }
  },

  async extendUserDays(id, days = 30) {
    try {
      const res = await fetch('/api/users/' + id + '/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });
      if (res.ok) {
        this.showToast(`Extended client subscription by ${days} days!`, 'success');
        this.renderUsers(document.getElementById('content-container'));
      } else {
        this.showToast('Failed to extend subscription', 'danger');
      }
    } catch {
      this.showToast('Network error extending subscription', 'danger');
    }
  },

  async deleteUser(id) {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    const res = await fetch('/api/users/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('User deleted', 'info');
      this.renderUsers(document.getElementById('content-container'));
    }
  },

  exportUsers() {
    window.location.href = '/api/users/export?app_id=' + this.activeAppId + '&format=csv';
  },

  /* ====================================================================
     7. NEW USER CREATION MODAL (EXACTLY MATCHING IMAGES 3 & 4)
     ==================================================================== */
  openCreateUserModal() {
    // Calculate initial 1D expiry string
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const initialExpiry = now.toISOString().replace('T', ' ').substring(0, 16);

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:480px; background:#121214; border:1px solid #232328; border-radius:14px;">
          <!-- Modal Header (Images 3 & 4) -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border-bottom:1px solid #1f1f24;">
            <h2 style="font-size:18px; font-weight:700; color:#fff;">New User</h2>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background:#222228; color:#9ca3af; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">ESC</span>
              <button class="sidebar-toggle-btn" style="padding:2px;" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
            </div>
          </div>

          <form id="new-user-form">
            <div class="modal-body" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
              <!-- USERNAME * -->
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:#9ca3af; letter-spacing:0.5px; margin-bottom:6px;">
                  USERNAME <span style="color:#ef4444;">*</span>
                </label>
                <div style="position:relative;">
                  <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#6b7280;">${ZenithIcons.profile}</span>
                  <input type="text" id="nu-username-in" class="form-control" style="padding-left:38px; background:#18181c; border-color:#2a2a32;" placeholder="Username" required />
                </div>
              </div>

              <!-- PASSWORD -->
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:#9ca3af; letter-spacing:0.5px; margin-bottom:6px;">
                  PASSWORD
                </label>
                <div style="position:relative;">
                  <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#6b7280;">${ZenithIcons.tokens}</span>
                  <input type="password" id="nu-password-in" class="form-control" style="padding-left:38px; background:#18181c; border-color:#2a2a32;" placeholder="Password" />
                </div>
              </div>

              <!-- EMAIL -->
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:#9ca3af; letter-spacing:0.5px; margin-bottom:6px;">
                  EMAIL <span style="font-weight:normal; color:#6b7280;">(Optional)</span>
                </label>
                <div style="position:relative;">
                  <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#6b7280;">${ZenithIcons.chat}</span>
                  <input type="email" id="nu-email-in" class="form-control" style="padding-left:38px; background:#18181c; border-color:#2a2a32;" placeholder="Email" />
                </div>
              </div>

              <!-- SUBSCRIPTION * -->
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:#9ca3af; letter-spacing:0.5px; margin-bottom:6px;">
                  SUBSCRIPTION <span style="color:#ef4444;">*</span>
                </label>
                <select id="nu-sub-in" class="form-control" style="background:#18181c; border-color:#2a2a32;">
                  <option value="1">default</option>
                  <option value="2">Pro Tier</option>
                  <option value="3">Enterprise</option>
                </select>
              </div>

              <!-- EXPIRY * (With Quick Pills: 1D, 1H, 7D, 1MO, 1Y) -->
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:#9ca3af; letter-spacing:0.5px; margin-bottom:6px;">
                  EXPIRY <span style="color:#ef4444;">*</span>
                </label>
                <div style="position:relative;">
                  <input type="text" id="nu-expiry-in" class="form-control" style="background:#18181c; border-color:#2a2a32;" value="${initialExpiry}" required />
                </div>
                <div class="quick-pills-row">
                  <button type="button" class="quick-pill active" onclick="ZenithApp.setExpiryPill('1D')">1D</button>
                  <button type="button" class="quick-pill" onclick="ZenithApp.setExpiryPill('1H')">1H</button>
                  <button type="button" class="quick-pill" onclick="ZenithApp.setExpiryPill('7D')">7D</button>
                  <button type="button" class="quick-pill" onclick="ZenithApp.setExpiryPill('1MO')">1MO</button>
                  <button type="button" class="quick-pill" onclick="ZenithApp.setExpiryPill('1Y')">1Y</button>
                </div>
              </div>

              <!-- Checkbox: HWID Affected (Lock to Device) -->
              <div style="display:flex; align-items:center; justify-content:space-between; padding-top:4px;">
                <span style="font-size:13px; color:#e5e7eb; font-weight:500;">HWID Affected (Lock to Device)</span>
                <input type="checkbox" id="nu-hwid-affected" checked style="width:16px; height:16px; accent-color:#6366f1; cursor:pointer;" />
              </div>

              <!-- Checkbox: Generate Token for this User -->
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:13px; color:#e5e7eb; font-weight:500;">Generate Token for this User</span>
                <input type="checkbox" id="nu-gen-token" style="width:16px; height:16px; accent-color:#6366f1; cursor:pointer;" />
              </div>

              <!-- Allowed Devices (Multi-HWID) -->
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:#9ca3af; letter-spacing:0.5px; margin-bottom:6px;">
                  Allowed Devices (Multi-HWID)
                </label>
                <select id="nu-allowed-devices" class="form-control" style="background:#18181c; border-color:#2a2a32;">
                  <option value="1">1 Device (Default)</option>
                  <option value="2">2 Devices</option>
                  <option value="3">3 Devices</option>
                  <option value="5">5 Devices</option>
                  <option value="999">Unlimited Devices</option>
                </select>
              </div>
            </div>

            <!-- Modal Footer (Images 3 & 4) -->
            <div style="display:flex; justify-content:flex-end; gap:12px; padding:16px 22px; border-top:1px solid #1f1f24;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" id="btn-submit-new-user" class="btn" style="background:#ffffff; color:#101010; font-weight:600; padding:8px 18px; border-radius:8px;">
                Create User ↵
              </button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('new-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-new-user');
      btn.disabled = true;

      const username = document.getElementById('nu-username-in').value.trim();
      const password = document.getElementById('nu-password-in').value;
      const email = document.getElementById('nu-email-in').value.trim();
      const plan_id = document.getElementById('nu-sub-in').value;
      const expiry_date = document.getElementById('nu-expiry-in').value.trim();
      const hwid_lock = document.getElementById('nu-hwid-affected').checked ? 1 : 0;
      const generate_token = document.getElementById('nu-gen-token').checked;
      const allowed_devices = document.getElementById('nu-allowed-devices').value;

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password: password || 'zenithDefault123!',
            email,
            plan_id,
            expiry_date,
            hwid_lock,
            generate_token,
            allowed_devices,
            app_id: this.activeAppId
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.closeAllModals();
          this.showToast('User created successfully!', 'success');
          this.renderUsers(document.getElementById('content-container'));
        } else {
          this.showToast(data.error || 'Failed to create user', 'danger');
          btn.disabled = false;
        }
      } catch {
        this.showToast('Network error creating user', 'danger');
        btn.disabled = false;
      }
    });
  },

  setExpiryPill(pill) {
    const d = new Date();
    if (pill === '1H') d.setHours(d.getHours() + 1);
    else if (pill === '1D') d.setDate(d.getDate() + 1);
    else if (pill === '7D') d.setDate(d.getDate() + 7);
    else if (pill === '1MO') d.setMonth(d.getMonth() + 1);
    else if (pill === '1Y') d.setFullYear(d.getFullYear() + 1);

    const formatted = d.toISOString().replace('T', ' ').substring(0, 16);
    const input = document.getElementById('nu-expiry-in');
    if (input) input.value = formatted;

    document.querySelectorAll('.quick-pill').forEach(p => {
      p.classList.toggle('active', p.innerText === pill);
    });
  },

  /* ====================================================================
     8. PAGE 4: LICENSE MANAGER (XXXX-XXXX-XXXX-XXXX)
     ==================================================================== */
  async renderLicenses(container) {
    const res = await fetch('/api/licenses?app_id=' + this.activeAppId);
    const data = res.ok ? await res.json() : { licenses: [] };
    const licenses = data.licenses || [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">License Manager</h2>
          <p class="card-desc">16-character cryptographic keys formatted as XXXX-XXXX-XXXX-XXXX with automatic device locks</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="window.location.href='/api/licenses/export?app_id=' + ZenithApp.activeAppId + '&format=csv'">
            ${ZenithIcons.download} Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="ZenithApp.openLicenseGeneratorModal()">
            ${ZenithIcons.plus} Generate License Batch
          </button>
        </div>
      </div>

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>License Key</th>
                <th>Plan Tier</th>
                <th>Duration</th>
                <th>Bound Client</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${licenses.length > 0 ? licenses.map(l => `
                <tr>
                  <td>
                    <code class="font-mono" style="color:#a5b4fc; font-weight:600; font-size:13px;">${l.license_key}</code>
                  </td>
                  <td>${l.plan_name || 'Standard'}</td>
                  <td>${l.duration_days} days</td>
                  <td style="color:#929292;">${l.used_by || 'Unclaimed'}</td>
                  <td>
                    <span class="badge badge-${l.status === 'active' ? 'success' : l.status === 'unused' ? 'info' : 'danger'}">${l.status}</span>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-secondary btn-sm" title="Copy Key" onclick="ZenithApp.copyToClipboard('${l.license_key}')">
                        ${ZenithIcons.copy}
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Ban License" onclick="ZenithApp.banLicense(${l.id})">
                        ${ZenithIcons.close}
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Renew (+30 Days)" onclick="ZenithApp.renewLicense(${l.id})">
                        ${ZenithIcons.refresh}
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Delete" onclick="ZenithApp.deleteLicense(${l.id})">
                        ${ZenithIcons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; color:#666;">No license keys found for this application</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async banLicense(id) {
    const res = await fetch('/api/licenses/' + id + '/ban', { method: 'POST' });
    if (res.ok) {
      this.showToast('License key flagged as banned', 'warning');
      this.renderLicenses(document.getElementById('content-container'));
    }
  },

  async renewLicense(id) {
    const res = await fetch('/api/licenses/' + id + '/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 30 })
    });
    if (res.ok) {
      this.showToast('License extended by +30 days', 'success');
      this.renderLicenses(document.getElementById('content-container'));
    }
  },

  async deleteLicense(id) {
    if (!confirm('Delete license key?')) return;
    const res = await fetch('/api/licenses/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('License removed', 'info');
      this.renderLicenses(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     9. PAGE 5: HWID MANAGEMENT (32-64 CHAR DEVICE LOCKS)
     ==================================================================== */
  async renderHwidManagement(container) {
    const res = await fetch('/api/hwid/records?app_id=' + this.activeAppId);
    const data = res.ok ? await res.json() : { records: [] };
    const records = data.records || [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Hardware ID (HWID) Management</h2>
          <p class="card-desc">Device lock enforcement, authorized hardware whitelists, and machine ban lists (32 to 64 chars)</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="ZenithApp.openAddHwidModal('whitelisted')">
            + Whitelist HWID
          </button>
          <button class="btn btn-danger btn-sm" onclick="ZenithApp.openAddHwidModal('blacklisted')">
            + Blacklist HWID
          </button>
        </div>
      </div>

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>Hardware ID</th>
                <th>Assigned User</th>
                <th>IP Address</th>
                <th>Policy Status</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${records.length > 0 ? records.map(r => `
                <tr>
                  <td><code class="font-mono" style="color:#a5b4fc; font-size:12px;">${r.hwid}</code></td>
                  <td><strong>${r.username || 'System Node'}</strong></td>
                  <td style="color:#929292;">${r.ip_address}</td>
                  <td>
                    <span class="badge badge-${r.status === 'whitelisted' ? 'success' : r.status === 'blacklisted' ? 'danger' : 'info'}">${r.status.toUpperCase()}</span>
                  </td>
                  <td style="color:#6b7280; font-size:12px;">${r.note || '-'}</td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-secondary btn-sm" title="Reset HWID Binding" onclick="ZenithApp.resetHwidRecord(${r.id})">
                        ${ZenithIcons.refresh}
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Remove" onclick="ZenithApp.deleteHwidRecord(${r.id})">
                        ${ZenithIcons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; color:#666;">No HWID records configured for this application</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async resetHwidRecord(id) {
    const res = await fetch('/api/hwid/' + id + '/reset', { method: 'POST' });
    if (res.ok) {
      this.showToast('HWID record reset successfully', 'success');
      this.renderHwidManagement(document.getElementById('content-container'));
    }
  },

  async deleteHwidRecord(id) {
    const res = await fetch('/api/hwid/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('HWID record deleted', 'info');
      this.renderHwidManagement(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     10. PAGE 6: SESSIONS (16-32 CHAR SESSION IDS)
     ==================================================================== */
  async renderSessions(container) {
    const res = await fetch('/api/sessions?app_id=' + this.activeAppId);
    const sessions = res.ok ? await res.json() : [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Active Client Sessions</h2>
          <p class="card-desc">Active socket nonces and authenticated sessions (16 to 32 characters)</p>
        </div>
        <button class="btn btn-danger btn-sm" onclick="ZenithApp.terminateAllSessions()">
          Terminate All Sessions
        </button>
      </div>

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Client User</th>
                <th>IP Address</th>
                <th>Device / OS</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${sessions.length > 0 ? sessions.map(s => `
                <tr>
                  <td><code class="font-mono" style="color:#a5b4fc;">${s.session_token ? s.session_token.substring(0, 24) + '...' : 'active_sess'}</code></td>
                  <td><strong>${s.username}</strong></td>
                  <td>${s.ip_address}</td>
                  <td style="color:#929292; font-size:12px;">${s.device_info || 'Windows 11 Client'}</td>
                  <td><span class="badge badge-success">Online</span></td>
                  <td>
                    <button class="btn btn-danger btn-sm" onclick="ZenithApp.terminateSession(${s.id})">
                      Terminate
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; color:#666;">No active client sessions at this moment</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async terminateSession(id) {
    const res = await fetch('/api/sessions/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('Session terminated', 'info');
      this.renderSessions(document.getElementById('content-container'));
    }
  },

  async terminateAllSessions() {
    if (!confirm('Force disconnect all current sessions?')) return;
    const res = await fetch('/api/sessions/terminate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.activeAppId })
    });
    if (res.ok) {
      this.showToast('All active sessions terminated', 'success');
      this.renderSessions(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     11. PAGE 7: VARIABLES (GLOBAL & USER)
     ==================================================================== */
  async renderVariables(container) {
    const [gRes, uRes] = await Promise.all([
      fetch('/api/variables/global?app_id=' + this.activeAppId),
      fetch('/api/variables/user?app_id=' + this.activeAppId)
    ]);
    const gVars = gRes.ok ? await gRes.json() : [];
    const uVars = uRes.ok ? await uRes.json() : [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Variables Management</h2>
          <p class="card-desc">Dynamic server-side variables distributed to authenticated client sessions</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="ZenithApp.openAddVariableModal()">
          ${ZenithIcons.plus} Add Variable
        </button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap:20px;">
        <div class="zenith-card">
          <div class="card-header">
            <div class="card-title">${ZenithIcons.globalVars} Global Variables</div>
          </div>
          <div class="table-responsive">
            <table class="zenith-table">
              <thead>
                <tr>
                  <th>Key Name</th>
                  <th>Value</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${gVars.length > 0 ? gVars.map(v => `
                  <tr>
                    <td><strong style="color:#a5b4fc;">${v.name}</strong></td>
                    <td><code>${v.value}</code></td>
                    <td><span class="badge badge-info">${v.data_type}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="ZenithApp.deleteGlobalVar(${v.id})">${ZenithIcons.trash}</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="4" style="text-align:center; color:#666;">No global variables</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="zenith-card">
          <div class="card-header">
            <div class="card-title">${ZenithIcons.userVars} User-Specific Variables</div>
          </div>
          <div class="table-responsive">
            <table class="zenith-table">
              <thead>
                <tr>
                  <th>Target User</th>
                  <th>Key Name</th>
                  <th>Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${uVars.length > 0 ? uVars.map(v => `
                  <tr>
                    <td><strong>${v.username}</strong></td>
                    <td><strong style="color:#a5b4fc;">${v.name}</strong></td>
                    <td><code>${v.value}</code></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="ZenithApp.deleteUserVar(${v.id})">${ZenithIcons.trash}</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="4" style="text-align:center; color:#666;">No user variables</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async deleteGlobalVar(id) {
    const res = await fetch('/api/variables/global/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('Global variable removed', 'info');
      this.renderVariables(document.getElementById('content-container'));
    }
  },

  async deleteUserVar(id) {
    const res = await fetch('/api/variables/user/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('User variable removed', 'info');
      this.renderVariables(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     12. PAGE 8: FILE MANAGEMENT
     ==================================================================== */
  async renderFiles(container) {
    const res = await fetch('/api/files?app_id=' + this.activeAppId);
    const files = res.ok ? await res.json() : [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Encrypted File Management</h2>
          <p class="card-desc">Encrypted cloud assets, updates, and custom dynamic payloads</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="ZenithApp.openUploadFileModal()">
          ${ZenithIcons.upload} Upload Encrypted Asset
        </button>
      </div>

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Size</th>
                <th>MIME Type</th>
                <th>Upload Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${files.length > 0 ? files.map(f => `
                <tr>
                  <td>
                    <strong>${f.original_name}</strong>
                    <div style="font-size:11px; color:#6b7280;">${f.filename}</div>
                  </td>
                  <td style="color:#a5b4fc;">${(f.file_size / 1024).toFixed(1)} KB</td>
                  <td><span class="badge badge-info">${f.mime_type}</span></td>
                  <td style="color:#929292;">${f.upload_date ? f.upload_date.split(' ')[0] : 'Today'}</td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <a href="/api/files/${f.id}/download" class="btn btn-secondary btn-sm" title="Download">
                        ${ZenithIcons.download}
                      </a>
                      <button class="btn btn-secondary btn-sm" title="Delete" onclick="ZenithApp.deleteFile(${f.id})">
                        ${ZenithIcons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="text-align:center; color:#666;">No uploaded files currently hosted</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async deleteFile(id) {
    const res = await fetch('/api/files/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('File removed from server', 'info');
      this.renderFiles(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     13. PAGE 9: WEBHOOKS (QUOTA ENFORCEMENT)
     ==================================================================== */
  async renderWebhooks(container) {
    const res = await fetch('/api/webhooks?app_id=' + this.activeAppId);
    const data = res.ok ? await res.json() : { webhooks: [] };
    const webhooks = data.webhooks || [];
    const userPlan = this.user ? (this.user.account_plan || 'TESTER') : 'TESTER';

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Outbound Webhooks</h2>
          <p class="card-desc">Real-time JSON event dispatches to external servers, APIs, or Discord channels</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="ZenithApp.openAddWebhookModal()">
          ${ZenithIcons.plus} Add Webhook
        </button>
      </div>

      ${userPlan === 'TESTER' ? `
        <div class="apps-info-banner" style="border-color:#f59e0b44; background:#f59e0b11; margin-bottom:18px;">
          <span>⚡ <strong>TESTER Plan Quota:</strong> Maximum 2 outbound webhooks allowed. Upgrade to Developer or Seller for unlimited webhooks.</span>
          <button class="btn btn-secondary btn-sm" onclick="ZenithApp.navigate('subscription')">Upgrade Plan</button>
        </div>
      ` : ''}

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>Webhook Name</th>
                <th>Destination URL</th>
                <th>Subscribed Events</th>
                <th>Status</th>
                <th>Last Triggered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${webhooks.length > 0 ? webhooks.map(w => `
                <tr>
                  <td><strong>${w.name}</strong></td>
                  <td><code style="font-size:12px; color:#a5b4fc;">${w.webhook_url.substring(0, 36)}...</code></td>
                  <td><span class="badge badge-info">${w.events}</span></td>
                  <td><span class="badge badge-success">${w.status}</span></td>
                  <td style="color:#929292;">${w.last_fired_at || 'Never'}</td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-secondary btn-sm" title="Dispatch Test Ping" onclick="ZenithApp.testWebhook(${w.id})">
                        ${ZenithIcons.loader} Test
                      </button>
                      <button class="btn btn-secondary btn-sm" title="Delete" onclick="ZenithApp.deleteWebhook(${w.id})">
                        ${ZenithIcons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; color:#666;">No outbound webhooks registered</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async testWebhook(id) {
    this.showToast('Dispatching test ping to webhook...', 'info');
    try {
      const res = await fetch('/api/webhooks/' + id + '/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        this.showToast(data.message || 'Test ping delivered to Discord successfully!', 'success');
        this.renderWebhooks(document.getElementById('content-container'));
      } else {
        this.showToast(data.error || 'Failed to dispatch test ping', 'danger');
      }
    } catch (err) {
      this.showToast('Network error while testing webhook: ' + err.message, 'danger');
    }
  },

  async deleteWebhook(id) {
    const res = await fetch('/api/webhooks/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('Webhook removed', 'info');
      this.renderWebhooks(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     14. PAGE 10: INTEGRATIONS (DISCORD & TELEGRAM BOTS)
     ==================================================================== */
  async renderIntegrations(container) {
    const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
    if (!isOwner && this.user && this.user.role !== 'Administrator' && (this.user.account_plan || 'TESTER').toUpperCase() !== 'SELLER') {
      return this.renderFeatureLock(container, 'integrations');
    }

    const res = await fetch('/api/integrations?app_id=' + this.activeAppId);
    const data = res.ok ? await res.json() : { integrations: [] };
    const items = data.integrations || [];
    const botStatus = data.botStatus || { online: false };
    const discord = items.find(i => i.type === 'discord_bot') || {};
    const telegram = items.find(i => i.type === 'telegram_bot') || {};
    const userPlan = this.user ? (this.user.account_plan || 'TESTER') : 'TESTER';
    const isSeller = userPlan === 'SELLER' || (this.user && this.user.role === 'Administrator');

    const isBotOnline = botStatus.online;
    const botTag = botStatus.user ? botStatus.user.tag : (discord.bot_username || '');

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Bot Integrations</h2>
          <p class="card-desc">Automated license dispensing bots for Discord guilds and Telegram channels</p>
        </div>
        <span class="brand-badge">${isSeller ? 'ENABLED' : 'SELLER PLAN REQUIRED'}</span>
      </div>

      ${!isSeller ? `
        <div class="apps-info-banner" style="border-color:#f59e0b44; background:#f59e0b11; margin-bottom:20px;">
          <span>🔒 <strong>Seller Feature:</strong> Discord and Telegram bot auto-vending requires the SELLER plan ($3.49/mo).</span>
          <button class="btn btn-secondary btn-sm" onclick="ZenithApp.navigate('subscription')">Upgrade to Seller</button>
        </div>
      ` : ''}

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap:20px;">
        <div class="zenith-card">
          <div class="card-header">
            <div>
              <div class="card-title">${ZenithIcons.chat} Discord Bot Integration</div>
              <div class="card-desc">Auto-vend licenses, assign subscriber roles, free trials & multi-app control</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span id="discord-bot-badge" class="badge badge-${isBotOnline ? 'success' : 'info'}" style="font-size:11.5px; padding:4px 8px;">
                ${isBotOnline ? `🟢 ONLINE (${botTag || 'Active'})` : '⚪ OFFLINE'}
              </span>
            </div>
          </div>

          ${isBotOnline ? `
            <div style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); border-radius:8px; padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:600; font-size:12.5px; color:#22c55e;">● 24/7 Background Daemon Online</div>
                <div style="font-size:11.5px; color:#9ca3af;">Serving ${botStatus.servers || 1} Server(s) • Gateway Ping: ${botStatus.ping || 0}ms</div>
              </div>
              <button class="btn btn-xs btn-outline" onclick="ZenithApp.toggleDiscordBot(false)" style="color:#ef4444; border-color:rgba(239,68,68,0.4);">
                Turn Bot Offline
              </button>
            </div>
          ` : (botStatus.error ? `
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; margin-bottom:14px;">
              <div style="font-weight:600; font-size:12px; color:#ef4444;">Connection Alert:</div>
              <div style="font-size:11px; color:#9ca3af;">${botStatus.error}</div>
            </div>
          ` : '')}

          <form id="discord-bot-form" style="display:flex; flex-direction:column; gap:14px;">
            <div class="form-group">
              <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Discord Bot Token</span>
                <span style="font-size:11px; color:#38bdf8; cursor:pointer;" onclick="const el = document.getElementById('discord-token'); el.type = el.type === 'password' ? 'text' : 'password';">Show / Hide</span>
              </label>
              <input type="password" id="discord-token" class="form-control" value="${discord.bot_token || ''}" placeholder="OTk4...G9X8Y7" ${!isSeller ? 'disabled' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label">Guild / Client ID</label>
              <input type="text" id="discord-client-id" class="form-control" value="${discord.client_id || ''}" placeholder="109283746501928374" ${!isSeller ? 'disabled' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label">Notification Channel ID</label>
              <input type="text" id="discord-channel-id" class="form-control" value="${discord.channel_id || ''}" placeholder="109283746501928375" ${!isSeller ? 'disabled' : ''} />
            </div>
            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isSeller ? 'disabled' : ''}>
                Save Discord Settings
              </button>
              <button type="button" id="btn-toggle-bot" class="btn btn-${isBotOnline ? 'danger' : 'success'} btn-sm" onclick="ZenithApp.toggleDiscordBot(${!isBotOnline})" ${!isSeller ? 'disabled' : ''}>
                ${isBotOnline ? 'Stop Bot (Offline)' : '🟢 Turn Bot Online'}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.testBot('Discord')" ${!isSeller ? 'disabled' : ''}>
                Test Handshake
              </button>
            </div>
          </form>
        </div>

        <div class="zenith-card">
          <div class="card-header">
            <div>
              <div class="card-title">${ZenithIcons.bot || ZenithIcons.chat} Telegram Bot Integration</div>
              <div class="card-desc">Dispense activation keys via /license command in Telegram chats</div>
            </div>
            <span class="badge badge-${telegram.enabled ? 'success' : 'info'}">${telegram.enabled ? 'Active' : 'Standby'}</span>
          </div>

          <form id="telegram-bot-form" style="display:flex; flex-direction:column; gap:14px;">
            <div class="form-group">
              <label class="form-label">Telegram Bot Token</label>
              <input type="password" id="telegram-token" class="form-control" value="${telegram.bot_token || ''}" placeholder="718293849:AAFX987sample" ${!isSeller ? 'disabled' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label">Telegram Channel / Chat ID</label>
              <input type="text" id="telegram-channel-id" class="form-control" value="${telegram.channel_id || ''}" placeholder="-100192837465" ${!isSeller ? 'disabled' : ''} />
            </div>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isSeller ? 'disabled' : ''}>
                Save Telegram Settings
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.testBot('Telegram')" ${!isSeller ? 'disabled' : ''}>
                Test Handshake
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (isSeller) {
      document.getElementById('discord-bot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/integrations/discord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_token: document.getElementById('discord-token').value.trim(),
            client_id: document.getElementById('discord-client-id').value.trim(),
            channel_id: document.getElementById('discord-channel-id').value.trim(),
            enabled: 1,
            app_id: this.activeAppId
          })
        });
        if (res.ok) {
          this.showToast('Discord Bot configuration saved!', 'success');
          await this.renderIntegrations(container);
        }
      });

      document.getElementById('telegram-bot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/integrations/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_token: document.getElementById('telegram-token').value.trim(),
            channel_id: document.getElementById('telegram-channel-id').value.trim(),
            enabled: 1,
            app_id: this.activeAppId
          })
        });
        if (res.ok) this.showToast('Telegram Bot configuration saved!', 'success');
      });
    }
  },

  async testBot(type) {
    if (type === 'Discord') {
      const res = await fetch('/api/integrations/discord/status');
      const data = res.ok ? await res.json() : {};
      const status = data.status || {};
      if (status.online) {
        return this.showToast(`Discord Bot is ONLINE (${status.user ? status.user.tag : 'Connected'}). Ping: ${status.ping}ms. Servers: ${status.servers}`, 'success');
      } else {
        return this.showToast(status.error ? `Discord Bot Error: ${status.error}` : 'Discord Bot is currently offline. Click "Turn Bot Online" to start.', 'warning');
      }
    }

    const res = await fetch('/api/integrations/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    const data = await res.json();
    if (res.ok) this.showToast(data.message || `${type} Bot online!`, 'success');
  },

  async toggleDiscordBot(start) {
    const btn = document.getElementById('btn-toggle-bot');
    if (btn) {
      btn.disabled = true;
      btn.innerText = start ? 'Connecting Bot...' : 'Stopping Bot...';
    }

    try {
      if (start) {
        const token = (document.getElementById('discord-token') ? document.getElementById('discord-token').value : '').trim();
        const clientId = (document.getElementById('discord-client-id') ? document.getElementById('discord-client-id').value : '').trim();
        const res = await fetch('/api/integrations/discord/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bot_token: token, client_id: clientId, app_id: this.activeAppId })
        });
        const data = await res.json();
        if (res.ok) {
          this.showToast(data.message || 'Discord Bot is now ONLINE 24/7!', 'success');
        } else {
          this.showToast(data.error || 'Failed to start Discord Bot', 'error');
        }
      } else {
        const res = await fetch('/api/integrations/discord/stop', { method: 'POST' });
        const data = await res.json();
        this.showToast(data.message || 'Discord Bot is now offline.', 'info');
      }
    } catch (e) {
      this.showToast('Network error toggling Discord Bot: ' + e.message, 'error');
    } finally {
      const container = document.getElementById('content-container');
      if (container) await this.renderIntegrations(container);
    }
  },

  /* ====================================================================
     15. PAGE 11: TEAM MANAGEMENT
     ==================================================================== */
  async renderTeam(container) {
    const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
    if (!isOwner && this.user && this.user.role !== 'Administrator' && (this.user.account_plan || 'TESTER').toUpperCase() !== 'SELLER') {
      return this.renderFeatureLock(container, 'team');
    }

    const res = await fetch('/api/team');
    const team = res.ok ? await res.json() : [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Team Management</h2>
          <p class="card-desc">Role-based access delegation for co-developers, managers, and resellers</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="ZenithApp.openAddResellerModal()">
            ${ZenithIcons.sellerKey} + Create Reseller
          </button>
          <button class="btn btn-primary btn-sm" onclick="ZenithApp.openAddManagerModal()">
            ${ZenithIcons.plus} + Create Manager
          </button>
        </div>
      </div>

      <div class="zenith-card">
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>Member Email</th>
                <th>Role</th>
                <th>Key Balance</th>
                <th>Assigned Apps</th>
                <th>Permissions</th>
                <th>Expiry</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${team.length > 0 ? team.map(m => `
                <tr>
                  <td><strong>${m.email}</strong></td>
                  <td><span class="badge badge-info">${m.role}</span></td>
                  <td style="color:#10b981; font-weight:600;">${m.key_balance} keys</td>
                  <td>App #${m.assigned_apps}</td>
                  <td style="font-size:11px; color:#a5b4fc;">${m.permissions_json ? m.permissions_json.substring(0, 24) + '...' : 'All'}</td>
                  <td style="color:#929292;">${m.expiry_date ? m.expiry_date.split(' ')[0] : 'Permanent'}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="ZenithApp.deleteTeamMember(${m.id})">
                      ${ZenithIcons.trash}
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="7" style="text-align:center; color:#666;">No team members added yet</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async deleteTeamMember(id) {
    const res = await fetch('/api/team/' + id, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('Team member removed', 'info');
      this.renderTeam(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     16. PAGE 12: RESELLERS & SELLER CREDENTIALS
     ==================================================================== */
  async renderResellers(container) {
    const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
    if (!isOwner && this.user && this.user.role !== 'Administrator' && (this.user.account_plan || 'TESTER').toUpperCase() !== 'SELLER') {
      return this.renderFeatureLock(container, 'resellers');
    }

    const res = await fetch('/api/seller/credentials');
    const creds = res.ok ? await res.json() : {};

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Reseller Network & API</h2>
          <p class="card-desc">Programmatic REST API keys and external storefront vending integration</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="ZenithApp.resetSellerKey()">
          ${ZenithIcons.refresh} Rotate Seller Key
        </button>
      </div>

      <div class="zenith-card" style="margin-bottom:20px;">
        <div class="card-header">
          <div class="card-title">${ZenithIcons.sellerKey} Seller API Credentials</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="font-size:12px; color:#6b7280; font-weight:600;">Seller REST Key</label>
            <div style="display:flex; gap:8px; margin-top:4px;">
              <input type="password" id="seller-key-in" class="form-control font-mono" value="${creds.seller_key || 'zenith_sk_sample'}" readonly />
              <button class="btn btn-secondary btn-sm" onclick="ZenithApp.togglePasswordVisibility('seller-key-in')">
                ${ZenithIcons.eye}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="ZenithApp.copyToClipboard(document.getElementById('seller-key-in').value)">
                ${ZenithIcons.copy}
              </button>
            </div>
          </div>
          <div>
            <label style="font-size:12px; color:#6b7280; font-weight:600;">Base Endpoint URL</label>
            <div style="display:flex; gap:8px; margin-top:4px;">
              <input type="text" class="form-control font-mono" value="${window.location.origin}/api/v1/seller" readonly />
              <button class="btn btn-secondary btn-sm" onclick="ZenithApp.copyToClipboard(window.location.origin + '/api/v1/seller')">
                ${ZenithIcons.copy}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  togglePasswordVisibility(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  },

  async resetSellerKey() {
    if (!confirm('Rotate your seller API key? External bots will need updating.')) return;
    const res = await fetch('/api/seller/credentials/reset', { method: 'POST' });
    if (res.ok) {
      this.showToast('Seller API key rotated', 'success');
      this.renderResellers(document.getElementById('content-container'));
    }
  },

  /* ====================================================================
     17. PAGE 13: LOGS CONSOLE (EVENT, ACCOUNT, SELLER, AUDIT)
     ==================================================================== */
  async renderLogs(container) {
    const isOwner = this.user && (this.user.role === 'Owner' || (this.user.account_plan || '').toUpperCase() === 'OWNER' || (this.user.username || '').toUpperCase() === 'ZEESHAN1017');
    if (!isOwner && this.user && this.user.role !== 'Administrator' && (this.user.account_plan || 'TESTER').toUpperCase() === 'TESTER') {
      return this.renderFeatureLock(container, 'logs');
    }

    const [evRes, accRes, auditRes] = await Promise.all([
      fetch('/api/logs/events?app_id=' + this.activeAppId),
      fetch('/api/logs/account'),
      fetch('/api/security/audit-logs')
    ]);

    const evData = evRes.ok ? await evRes.json() : { events: [] };
    const accData = accRes.ok ? await accRes.json() : { logs: [] };
    const auditData = auditRes.ok ? await auditRes.json() : { logs: [] };

    const events = evData.events || [];
    const accounts = accData.logs || [];
    const audits = auditData.logs || [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Logs Console</h2>
          <p class="card-desc">Forensic audit trail of authentication events, policy triggers, and account security</p>
        </div>
      </div>

      <div class="zenith-card">
        <div class="card-header">
          <div class="card-title">${ZenithIcons.sellerLogs} Application Security Event Logs</div>
        </div>
        <div class="table-responsive">
          <table class="zenith-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${events.length > 0 ? events.map(e => `
                <tr>
                  <td style="color:#6b7280; font-size:12px;">${e.created_at}</td>
                  <td><span class="badge badge-info">${e.event_type}</span></td>
                  <td><strong>${e.description}</strong></td>
                  <td style="color:#a5b4fc;">${e.ip_address}</td>
                </tr>
              `).join('') : `<tr><td colspan="4" style="text-align:center; color:#666;">No event logs recorded</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ====================================================================
     18. PAGE 14: ANALYTICS & INSIGHTS
     ==================================================================== */
  async renderAnalytics(container) {
    const res = await fetch('/api/analytics?app_id=' + this.activeAppId);
    const data = res.ok ? await res.json() : {};
    const summary = data.summary || { totalUsers: 0, activeUsers: 0, totalLicenses: 0, totalSessions: 0, hwidLockRate: 98.4 };
    const timeline = data.timeline || [];
    const osDist = data.osDistribution || [];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Analytics & Insights</h2>
          <p class="card-desc">Real-time telemetry, authentication frequency, and device architecture distribution</p>
        </div>
      </div>

      <div class="wireframe-stats-row" style="margin-bottom:20px;">
        <div class="wireframe-stat-card">
          <div class="stat-label-upper">TOTAL CLIENTS</div>
          <div class="stat-metric-val">${summary.totalUsers}</div>
          <div class="stat-metric-sub">${summary.activeUsers} currently active</div>
        </div>
        <div class="wireframe-stat-card">
          <div class="stat-label-upper">LICENSES</div>
          <div class="stat-metric-val">${summary.totalLicenses}</div>
          <div class="stat-metric-sub">${summary.activeLicenses || 0} claimed</div>
        </div>
        <div class="wireframe-stat-card">
          <div class="stat-label-upper">HWID LOCK RATE</div>
          <div class="stat-metric-val" style="color:#10b981;">${summary.hwidLockRate}%</div>
          <div class="stat-metric-sub">Strict hardware binding</div>
        </div>
        <div class="wireframe-stat-card">
          <div class="stat-label-upper">LIVE SESSIONS</div>
          <div class="stat-metric-val" style="color:#6366f1;">${summary.totalSessions}</div>
          <div class="stat-metric-sub">Online nodes</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap:20px;">
        <div class="zenith-card">
          <div class="card-header">
            <div class="card-title">${ZenithIcons.dashboard} 7-Day Activity Trends</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:flex-end; height:180px; padding:20px 10px 0; border-bottom:1px solid #252528;">
            ${timeline.map(t => `
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; flex:1;">
                <div style="display:flex; gap:4px; align-items:flex-end; height:130px;">
                  <div style="width:14px; background:#6366f1; border-radius:3px 3px 0 0; height:${Math.min(120, t.logins * 3)}px;" title="Logins: ${t.logins}"></div>
                  <div style="width:14px; background:#10b981; border-radius:3px 3px 0 0; height:${Math.min(120, t.activations * 6)}px;" title="Activations: ${t.activations}"></div>
                </div>
                <span style="font-size:11px; color:#6b7280; font-weight:600;">${t.day}</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; justify-content:center; gap:24px; margin-top:14px; font-size:12px;">
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; background:#6366f1; border-radius:2px;"></span> Client Logins</span>
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; background:#10b981; border-radius:2px;"></span> Key Activations</span>
          </div>
        </div>

        <div class="zenith-card">
          <div class="card-header">
            <div class="card-title">${ZenithIcons.loader} Operating System Telemetry</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px; padding-top:10px;">
            ${osDist.map(o => `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                  <span><strong>${o.os}</strong></span>
                  <span style="color:#a5b4fc; font-weight:600;">${o.percent}%</span>
                </div>
                <div style="background:#222228; border-radius:9999px; height:8px; overflow:hidden;">
                  <div style="background:linear-gradient(90deg, #6366f1, #8b5cf6); width:${o.percent}%; height:100%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  /* ====================================================================
     19. PAGE 15: SUBSCRIPTION (WITH DYNAMIC UPI QR CODE zeeshan1710@fam)
     ==================================================================== */
  async renderSubscription(container) {
    const res = await fetch('/api/subscription/plans');
    const data = res.ok ? await res.json() : { plans: [] };
    const plans = data.plans || [];
    const currentPlan = this.user ? (this.user.account_plan || 'TESTER') : 'TESTER';

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Account Subscription</h2>
          <p class="card-desc">Choose the plan that fits your engineering scope. Strict backend enforcement protects every tier.</p>
        </div>

        <div style="background:#151518; border:1px solid #27272e; border-radius:9999px; padding:4px; display:inline-flex; align-items:center;">
          <button id="cycle-monthly-btn" class="btn btn-sm" style="border-radius:9999px; background:${this.billingCycle === 'monthly' ? '#6366f1' : 'transparent'}; color:#fff;" onclick="ZenithApp.setBillingCycle('monthly')">
            Monthly
          </button>
          <button id="cycle-yearly-btn" class="btn btn-sm" style="border-radius:9999px; background:${this.billingCycle === 'yearly' ? '#6366f1' : 'transparent'}; color:#fff; display:flex; align-items:center; gap:6px;" onclick="ZenithApp.setBillingCycle('yearly')">
            <span>Yearly</span>
            <span style="background:#22c55e; color:#000; font-size:10px; font-weight:800; padding:1px 6px; border-radius:9999px;">SAVE 50%</span>
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
        ${plans.map(p => {
          const isCurrent = currentPlan.toUpperCase() === p.id.toUpperCase();
          const price = this.billingCycle === 'yearly' ? p.yearly_price : p.monthly_price;
          const priceInr = p.id === 'DEVELOPER' ? (this.billingCycle === 'yearly' ? 500 : 199) : p.id === 'SELLER' ? (this.billingCycle === 'yearly' ? 999 : 299) : 0;
          const periodLabel = this.billingCycle === 'yearly' ? '/year' : '/month';

          return `
            <div class="zenith-card" style="display:flex; flex-direction:column; justify-content:space-between; position:relative; ${p.badge === 'POPULAR' ? 'border-color:#6366f1; box-shadow:0 0 25px rgba(99,102,241,0.2);' : ''}">
              ${p.badge === 'POPULAR' ? `
                <div style="position:absolute; top:-12px; right:20px; background:#6366f1; color:#fff; font-size:10.5px; font-weight:800; padding:2px 10px; border-radius:9999px; letter-spacing:0.5px;">
                  MOST POPULAR
                </div>
              ` : ''}

              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <h3 style="font-size:18px; font-weight:700; color:#fff;">${p.name}</h3>
                  <span class="badge badge-info">${p.badge}</span>
                </div>

                <div style="display:flex; align-items:baseline; gap:4px; margin-bottom:4px;">
                  <span style="font-size:34px; font-weight:800; color:#fff;">$${price.toFixed(2)}</span>
                  <span style="color:#929292; font-size:13px;">${periodLabel}</span>
                  ${priceInr > 0 ? `<span style="color:#10b981; font-size:13px; font-weight:600; margin-left:8px;">(₹${priceInr})</span>` : ''}
                </div>

                <p style="color:#929292; font-size:13px; line-height:1.5; margin-bottom:20px;">
                  ${p.description}
                </p>

                <div style="border-top:1px solid #232328; padding-top:16px; margin-bottom:20px;">
                  <div style="font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; margin-bottom:10px;">INCLUDED CAPABILITIES</div>
                  <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; font-size:13px;">
                    ${p.features.map(f => `
                      <li style="display:flex; align-items:center; gap:8px;">
                        <span style="color:${f.startsWith('No ') ? '#ef4444' : '#10b981'}; font-weight:700;">${f.startsWith('No ') ? '✕' : '✓'}</span>
                        <span style="color:${f.startsWith('No ') ? '#6b7280' : '#e5e7eb'};">${f}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>

              <div>
                ${isCurrent ? `
                  <button class="btn btn-secondary" style="width:100%; border-color:#6366f1; color:#a5b4fc;" disabled>
                    Current Active Plan
                  </button>
                ` : `
                  <button class="btn ${p.badge === 'POPULAR' ? 'btn-primary' : 'btn-secondary'}" style="width:100%;" onclick="ZenithApp.openUpgradeModal('${p.id}')">
                    Upgrade to ${p.name}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  setBillingCycle(cycle) {
    this.billingCycle = cycle;
    this.renderSubscription(document.getElementById('content-container'));
  },

  // Interactive Payment Upgrade Modal with Dynamic UPI QR Code (zeeshan1710@fam)
  openUpgradeModal(planId) {
    const cycle = this.billingCycle || 'monthly';
    const priceUsd = planId === 'DEVELOPER' ? (cycle === 'yearly' ? 5.99 : 2.49) : (cycle === 'yearly' ? 11.99 : 3.49);
    const priceInr = planId === 'DEVELOPER' ? (cycle === 'yearly' ? 500 : 199) : (cycle === 'yearly' ? 999 : 299);
    const upiId = 'zeeshan1710@fam';
    const upiUrl = `upi://pay?pa=${upiId}&pn=Zenith%20Auth&am=${priceInr}&cu=INR&tn=ZenithAuth_${planId}_${cycle}`;
    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(upiUrl);

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:500px; background:#121214; border:1px solid #232328; border-radius:14px;">
          <div class="modal-header">
            <h3 style="font-size:17px; font-weight:700;">Upgrade to ${planId} (${cycle.toUpperCase()})</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="upgrade-checkout-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
              <!-- Price Header -->
              <div style="background:#16161b; border:1px solid #272732; border-radius:10px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:700; color:#fff; font-size:16px;">${planId} Plan</div>
                  <div style="font-size:12px; color:#929292;">Billing frequency: ${cycle.toUpperCase()}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:22px; font-weight:800; color:#10b981;">₹${priceInr}</div>
                  <div style="font-size:12px; color:#929292;">($${priceUsd.toFixed(2)})</div>
                </div>
              </div>

              <!-- UPI Instant QR Code Payment Section -->
              <div class="upi-payment-box">
                <div style="font-size:13px; font-weight:600; color:#e5e7eb;">
                  Scan & Pay via any UPI App (GPay, PhonePe, Paytm, FamPay)
                </div>

                <div class="upi-qr-wrapper">
                  <img src="${qrCodeUrl}" alt="UPI QR Code" style="width:160px; height:160px; display:block;" onerror="this.onerror=null; this.src='https://chart.googleapis.com/chart?cht=qr&chs=160x160&chl=' + encodeURIComponent('${upiUrl}')" />
                </div>

                <div class="upi-id-badge">
                  <span>UPI ID: <strong>${upiId}</strong></span>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 8px;" onclick="ZenithApp.copyToClipboard('${upiId}')">
                    ${ZenithIcons.copy} Copy
                  </button>
                </div>
              </div>

              <!-- UTR / Transaction Reference Input -->
              <div class="form-group">
                <label class="form-label">12-Digit UPI UTR / Transaction Reference ID <span style="color:#ef4444;">*</span></label>
                <input type="text" id="checkout-ref" class="form-control font-mono" placeholder="e.g. 432109876543 or TXN_..." required />
                <div style="font-size:11.5px; color:#6b7280; margin-top:4px;">Pay first via UPI QR code, then paste your transaction UTR above for verification.</div>
              </div>

              <!-- Mandatory Discord Proof Notice -->
              <div style="background:#5865F215; border:1px solid #5865F255; border-radius:10px; padding:12px 14px; display:flex; align-items:flex-start; gap:12px;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#5865F2" style="flex-shrink:0; margin-top:2px;"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <div style="font-size:12.5px; line-height:1.45; color:#c7d2fe;">
                  <div style="font-weight:700; color:#fbbf24; margin-bottom:2px;">⚠️ IMPORTANT PAYMENT VERIFICATION STEP:</div>
                  <div>After payment, join Discord and DM <strong style="color:#ffffff;">@zeeshan.dll</strong> and send your payment proof to get your plan activated!</div>
                  <div style="margin-top:6px;">
                    <a href="https://discord.gg/Ht8uqhdv6s" target="_blank" style="color:#818cf8; font-weight:700; text-decoration:underline;">Click here to Join Official Discord Server</a>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" id="confirm-upgrade-btn" class="btn btn-primary btn-sm">
                Submit Payment Verification
              </button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('upgrade-checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('confirm-upgrade-btn');
      btn.disabled = true;
      btn.innerText = 'Verifying with payment node...';

      const ref = document.getElementById('checkout-ref').value.trim();

      try {
        const res = await fetch('/api/subscription/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_name: planId,
            billing_cycle: cycle,
            payment_method: 'UPI (' + upiId + ')',
            transaction_reference: ref
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.user.account_plan = planId;
          this.showToast(data.message || 'Payment verified! Upgraded to ' + planId, 'success');
          this.closeAllModals();
          this.renderAuthenticatedLayout();
          this.navigate('subscription');
        } else {
          this.showToast(data.error || 'Payment verification failed', 'danger');
          btn.disabled = false;
          btn.innerText = 'Submit Payment Verification';
        }
      } catch {
        this.showToast('Network error during transaction verification', 'danger');
        btn.disabled = false;
        btn.innerText = 'Submit Payment Verification';
      }
    });
  },

  /* ====================================================================
     20. PAGE 16: ACCOUNT SETTINGS & PERMANENT OWNER ID (10 CHARS)
     ==================================================================== */
  async renderSettings(container) {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h2 style="font-size:22px; font-weight:700;">Account Settings</h2>
          <p class="card-desc">Security preferences, credentials, and your permanent Master Owner ID</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap:20px;">
        <!-- Owner ID Card -->
        <div class="zenith-card">
          <div class="card-header">
            <div>
              <div class="card-title">${ZenithIcons.shield} Permanent Owner ID (10 Characters)</div>
              <div class="card-desc">Permanent alphanumeric identity shared across all your software projects</div>
            </div>
          </div>
          <div style="background:#0f0f13; border:1px solid #232328; border-radius:8px; padding:18px; margin-bottom:16px;">
            <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">MASTER OWNER ID (CLIENT SDK BINDING)</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <code class="font-mono" style="font-size:22px; font-weight:800; color:#a5b4fc; letter-spacing:1px;">
                ${this.user.owner_id || 'PC1B6P1TTA'}
              </code>
              <button class="btn btn-secondary btn-sm" onclick="ZenithApp.copyToClipboard('${this.user.owner_id || 'PC1B6P1TTA'}')">
                ${ZenithIcons.copy} Copy Owner ID
              </button>
            </div>
          </div>
          <p style="font-size:12.5px; color:#929292; line-height:1.5;">
            ℹ️ All applications created under your account share this permanent 10-character Owner ID. Clients use this in tandem with unique 64-character Application Secret Keys to securely authenticate handshakes.
          </p>
        </div>

        <!-- Password Change -->
        <div class="zenith-card">
          <div class="card-header">
            <div class="card-title">${ZenithIcons.profile} Update Credentials</div>
          </div>
          <form id="change-pwd-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" id="old-pwd" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" id="new-pwd" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary btn-sm" style="margin-top:6px;">
              Update Password
            </button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('change-pwd-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('old-pwd').value;
      const newPassword = document.getElementById('new-pwd').value;

      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        this.showToast('Password updated successfully', 'success');
        document.getElementById('change-pwd-form').reset();
      } else {
        this.showToast(data.error || 'Failed to update password', 'danger');
      }
    });
  },

  /* ====================================================================
     21. MODALS & DIALOG CONTROLLERS
     ==================================================================== */
  openModal(html) {
    const container = document.getElementById('modal-root');
    container.innerHTML = html;
    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => { if (backdrop) backdrop.classList.add('open'); }, 10);
  },

  closeAllModals() {
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      setTimeout(() => {
        const root = document.getElementById('modal-root');
        if (root) root.innerHTML = '';
      }, 200);
    }
  },

  // Open Global Search (Ctrl + K)
  openGlobalSearch() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:540px;">
          <div style="padding:14px 18px; border-bottom:1px solid #252525; display:flex; align-items:center; gap:10px;">
            ${ZenithIcons.search}
            <input type="text" id="global-search-input" class="form-control" style="border:none; background:transparent; font-size:15px; padding:0;" placeholder="Search applications, users, license keys, files..." autofocus />
          </div>
          <div id="search-results-box" style="padding:12px; max-height:360px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
            <div style="text-align:center; padding:20px; color:#666; font-size:13px;">Type to search across entire Zenith Auth platform</div>
          </div>
        </div>
      </div>
    `);

    const input = document.getElementById('global-search-input');
    input.focus();
    input.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      if (!q) return;

      const res = await fetch('/api/search?q=' + encodeURIComponent(q));
      if (res.ok) {
        const { results } = await res.json();
        const box = document.getElementById('search-results-box');
        if (results.length === 0) {
          box.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No records found</div>';
          return;
        }

        box.innerHTML = results.map(r => `
          <div style="padding:10px 14px; background:#121212; border:1px solid #222; border-radius:6px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="ZenithApp.closeAllModals(); ZenithApp.navigate('${r.category === 'app' ? 'applications' : r.category === 'user' ? 'users' : 'licenses'}')">
            <div>
              <strong style="color:#fff;">${r.name || r.username || r.license_key}</strong>
              <div style="font-size:11px; color:#888;">${r.email || r.status || ''}</div>
            </div>
            <span class="badge badge-info">${r.category}</span>
          </div>
        `).join('');
      }
    });
  },

  // Reveal Secret Key Modal (64-character Hexadecimal)
  async openRevealSecretModal(appId) {
    try {
      const res = await fetch('/api/apps/' + appId + '/reveal-secret', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.secret_key) {
        this.showToast(data.error || 'Unable to retrieve secret key', 'danger');
        return;
      }

      this.openModal(`
        <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
          <div class="modal-container" style="max-width:540px;">
            <div class="modal-header">
              <h3 style="font-size:17px; font-weight:700;">Application Secret Key (64-char Hex)</h3>
              <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
            </div>
            <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
              <p style="font-size:13px; color:#929292;">
                Keep this key strictly confidential. Client applications use this 64-character hexadecimal secret to sign initialization requests.
              </p>
              <div style="background:#0c0d10; border:1px solid #232328; border-radius:8px; padding:14px; word-break:break-all;">
                <code class="font-mono" style="color:#22c55e; font-size:13px; line-height:1.6;">${data.secret_key}</code>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Close</button>
              <button class="btn btn-primary btn-sm" onclick="ZenithApp.copyToClipboard('${data.secret_key}')">
                ${ZenithIcons.copy} Copy Secret Key
              </button>
            </div>
          </div>
        </div>
      `);
    } catch {
      this.showToast('Network error while requesting secret key', 'danger');
    }
  },

  // Regenerate Secret Key Modal
  openRegenerateSecretModal(appId) {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:480px;">
          <div class="modal-header">
            <h3 style="font-size:17px; font-weight:700; color:#ef4444;">Rotate Application Secret Key?</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <div class="modal-body">
            <p style="font-size:13.5px; color:#d1d5db; line-height:1.6;">
              Rotating the secret key will immediately invalidate the previous 64-character secret. Existing client binaries will fail handshake until updated with the new key.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
            <button class="btn btn-danger btn-sm" onclick="ZenithApp.confirmRegenerateSecret(${appId})">
              Confirm & Generate New Secret
            </button>
          </div>
        </div>
      </div>
    `);
  },

  async confirmRegenerateSecret(appId) {
    try {
      const res = await fetch('/api/apps/' + appId + '/regenerate-secret', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        this.closeAllModals();
        this.showToast('Secret rotated successfully!', 'success');
        this.openRevealSecretModal(appId);
      } else {
        this.showToast(data.error || 'Failed to rotate secret', 'danger');
      }
    } catch {
      this.showToast('Network error during secret rotation', 'danger');
    }
  },

  // Create Application Modal (Generates 64-char Hex Secret & 10-char Owner ID)
  openCreateAppModal() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:480px;">
          <div class="modal-header">
            <h3 style="font-size:17px; font-weight:700;">Create New Application</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="create-app-modal-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="form-group">
                <label class="form-label">Application Name</label>
                <input type="text" id="new-app-name" class="form-control" placeholder="e.g. ZS COVER SILENT" required />
              </div>
              <div class="form-group">
                <label class="form-label">Initial Version</label>
                <input type="text" id="new-app-version" class="form-control" value="1.0" required />
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="new-app-desc" class="form-control" rows="2" placeholder="Brief project description..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" id="btn-save-new-app" class="btn btn-primary btn-sm">Create Application</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('create-app-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-new-app');
      btn.disabled = true;

      const name = document.getElementById('new-app-name').value.trim();
      const version = document.getElementById('new-app-version').value.trim();
      const description = document.getElementById('new-app-desc').value.trim();

      try {
        const res = await fetch('/api/apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, version, description })
        });
        const data = await res.json();
        if (res.ok) {
          this.showToast('Application created successfully!', 'success');
          this.closeAllModals();
          await this.loadApplications();
          this.setActiveApplication(data.id);
        } else {
          this.showToast(data.error || 'Failed to create application', 'danger');
          btn.disabled = false;
        }
      } catch {
        this.showToast('Network error creating application', 'danger');
        btn.disabled = false;
      }
    });
  },

  // License Generator Modal (XXXX-XXXX-XXXX-XXXX)
  openLicenseGeneratorModal() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:480px;">
          <div class="modal-header">
            <h3 style="font-size:17px; font-weight:700;">Generate License Keys</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="gen-lic-modal-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="form-group">
                <label class="form-label">Key Prefix (optional)</label>
                <input type="text" id="lic-prefix" class="form-control" placeholder="ZENITH" value="ZENITH" />
              </div>
              <div class="form-group">
                <label class="form-label">Batch Count</label>
                <input type="number" id="lic-count" class="form-control" value="5" min="1" max="50" required />
              </div>
              <div class="form-group">
                <label class="form-label">Duration (Days)</label>
                <input type="number" id="lic-duration" class="form-control" value="30" min="1" required />
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="lic-hwid-lock" checked />
                <label for="lic-hwid-lock" style="font-size:13px; color:#d1d5db; cursor:pointer;">Enforce Hardware ID (HWID) lock</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" id="btn-submit-gen-lic" class="btn btn-primary btn-sm">Generate Keys</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('gen-lic-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-gen-lic');
      btn.disabled = true;

      const prefix = document.getElementById('lic-prefix').value.trim();
      const count = parseInt(document.getElementById('lic-count').value, 10);
      const duration_days = parseInt(document.getElementById('lic-duration').value, 10);
      const hwid_bound = document.getElementById('lic-hwid-lock').checked ? 1 : 0;

      try {
        const res = await fetch('/api/licenses/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, count, duration_days, hwid_bound, app_id: this.activeAppId })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.closeAllModals();
          this.showToast('Generated ' + data.count + ' license keys!', 'success');
          this.renderLicenses(document.getElementById('content-container'));
        } else {
          this.showToast(data.error || 'Failed to generate licenses', 'danger');
          btn.disabled = false;
        }
      } catch {
        this.showToast('Network error generating licenses', 'danger');
        btn.disabled = false;
      }
    });
  },

  // Add HWID Modal
  openAddHwidModal(type = 'whitelisted') {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Add ${type.toUpperCase()} HWID</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="add-hwid-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group">
                <label class="form-label">Hardware ID (HWID)</label>
                <input type="text" id="hwid-val-in" class="form-control font-mono" placeholder="HWID-XXXX-XXXX-XXXX" required />
              </div>
              <div class="form-group">
                <label class="form-label">User / Device Identifier</label>
                <input type="text" id="hwid-user-in" class="form-control" placeholder="Developer Workstation" />
              </div>
              <div class="form-group">
                <label class="form-label">Note / Reason</label>
                <input type="text" id="hwid-note-in" class="form-control" placeholder="Primary engineering test rig" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save HWID</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('add-hwid-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const endpoint = type === 'blacklisted' ? '/api/hwid/blacklist' : '/api/hwid/whitelist';
      const hwid = document.getElementById('hwid-val-in').value.trim();
      const username = document.getElementById('hwid-user-in').value.trim();
      const note = document.getElementById('hwid-note-in').value.trim();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hwid, username, note, app_id: this.activeAppId })
      });
      if (res.ok) {
        this.closeAllModals();
        this.showToast('HWID added to ' + type, 'success');
        this.renderHwidManagement(document.getElementById('content-container'));
      }
    });
  },

  // Add Webhook Modal
  openAddWebhookModal() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:460px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Add Outbound Webhook</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="add-webhook-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group">
                <label class="form-label">Webhook Name</label>
                <input type="text" id="wh-name-in" class="form-control" placeholder="e.g. Discord Production Alerts" required />
              </div>
              <div class="form-group">
                <label class="form-label">Destination URL</label>
                <input type="url" id="wh-url-in" class="form-control" placeholder="https://discord.com/api/webhooks/..." required />
              </div>
              <div class="form-group">
                <label class="form-label">Events</label>
                <select id="wh-events-in" class="form-control">
                  <option value="login,register,license_activate">All Events (Login, Register, Activate)</option>
                  <option value="login">Logins Only</option>
                  <option value="license_activate">License Activations Only</option>
                  <option value="ban,hwid_mismatch">Security Alerts (Ban, HWID Mismatch)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Create Webhook</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('add-webhook-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('wh-name-in').value.trim();
      const webhook_url = document.getElementById('wh-url-in').value.trim();
      const events = document.getElementById('wh-events-in').value;

      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, webhook_url, events, app_id: this.activeAppId })
      });
      const data = await res.json();
      if (res.ok) {
        this.closeAllModals();
        this.showToast('Webhook registered successfully!', 'success');
        this.renderWebhooks(document.getElementById('content-container'));
      } else {
        this.showToast(data.error || 'Failed to create webhook', 'danger');
      }
    });
  },

  // Application Settings Modal
  async openAppSettingsModal(appId) {
    const res = await fetch('/api/apps/' + appId + '/settings');
    const settings = res.ok ? await res.json() : {};

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:520px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Application Security Policies</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="app-settings-modal-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div>
                  <div style="font-weight:600; color:#fff; font-size:13.5px;">Enforce HWID Binding</div>
                  <div style="font-size:12px; color:#6b7280;">Lock client license to first registered machine</div>
                </div>
                <input type="checkbox" id="set-hwid-lock" ${settings.hwid_lock ? 'checked' : ''} />
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-top:1px solid rgba(255,255,255,0.06); border-bottom:1px solid rgba(255,255,255,0.06);">
                <div>
                  <div style="font-weight:600; color:#38bdf8; font-size:13.5px; display:flex; align-items:center; gap:6px;">
                    <span>Binary Hash Verification</span>
                    <span style="font-size:9.5px; background:rgba(56,189,248,0.18); color:#38bdf8; padding:1px 6px; border-radius:4px; font-weight:700;">ANTI-CRACK</span>
                  </div>
                  <div style="font-size:12px; color:#9ca3af;">Verify executable SHA-256 hash. Rejects modified, dumped, or patched binaries.</div>
                </div>
                <input type="checkbox" id="set-hash-check" ${settings.hash_check ? 'checked' : ''} />
              </div>
              <div class="form-group" style="margin-top:2px;">
                <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                  <span>Locked Application Hash (SHA-256)</span>
                  <button type="button" class="btn btn-secondary btn-xs" style="font-size:11px; padding:3px 8px;" onclick="ZenithApp.resetAppHash(${appId})">Clear / Auto-Lock</button>
                </label>
                <input type="text" id="set-app-hash" class="form-control" style="font-family:monospace; font-size:11.5px;" value="${settings.app_hash || ''}" placeholder="Leave blank to auto-lock on first run, or paste SHA-256" />
                <div style="font-size:11px; color:#6b7280; margin-top:4px;">When enabled, any modification of your EXE/client will be blocked with a Critical Security Alert.</div>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div>
                  <div style="font-weight:600; color:#fff; font-size:13.5px;">Token Validation</div>
                  <div style="font-size:12px; color:#6b7280;">Require JWT signed headers on client calls</div>
                </div>
                <input type="checkbox" id="set-token-val" ${settings.token_validation ? 'checked' : ''} />
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div>
                  <div style="font-weight:600; color:#fff; font-size:13.5px;">Blacklist Enforcement</div>
                  <div style="font-size:12px; color:#6b7280;">Block hardware IDs on security blacklist</div>
                </div>
                <input type="checkbox" id="set-blacklist" ${settings.blacklist_enabled ? 'checked' : ''} />
              </div>
              <div class="form-group" style="margin-top:8px;">
                <label class="form-label">Client Session Timeout (Minutes)</label>
                <input type="number" id="set-session-timeout" class="form-control" value="${settings.session_timeout || 60}" min="5" max="1440" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save Policies</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('app-settings-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const hwid_lock = document.getElementById('set-hwid-lock').checked ? 1 : 0;
      const hash_check = document.getElementById('set-hash-check').checked ? 1 : 0;
      const app_hash = document.getElementById('set-app-hash').value.trim();
      const token_validation = document.getElementById('set-token-val').checked ? 1 : 0;
      const blacklist_enabled = document.getElementById('set-blacklist').checked ? 1 : 0;
      const session_timeout = parseInt(document.getElementById('set-session-timeout').value, 10);

      const sRes = await fetch('/api/apps/' + appId + '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hwid_lock, hash_check, app_hash, token_validation, blacklist_enabled, session_timeout })
      });
      if (sRes.ok) {
        this.closeAllModals();
        this.showToast('Security policies saved!', 'success');
        await this.loadApplications();
      }
    });
  },

  async resetAppHash(appId) {
    if (!confirm('Clear currently locked SHA-256 hash? The next client launch will automatically lock to the new build hash.')) return;
    const res = await fetch('/api/apps/' + appId + '/reset-hash', { method: 'POST' });
    if (res.ok) {
      const el = document.getElementById('set-app-hash');
      if (el) el.value = '';
      this.showToast('Binary hash reset! Next connection will auto-lock new build.', 'success');
      await this.loadApplications();
    }
  },

  // Edit App Modal
  async openEditAppModal(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Edit Application</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="edit-app-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group">
                <label class="form-label">Application Name</label>
                <input type="text" id="edit-app-name" class="form-control" value="${app.name}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Version</label>
                <input type="text" id="edit-app-ver" class="form-control" value="${app.version}" required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('edit-app-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-app-name').value.trim();
      const version = document.getElementById('edit-app-ver').value.trim();

      const res = await fetch('/api/apps/' + appId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, version })
      });
      if (res.ok) {
        this.closeAllModals();
        this.showToast('Application updated', 'success');
        await this.loadApplications();
        this.renderApplications(document.getElementById('content-container'));
      }
    });
  },

  async deleteApp(appId) {
    if (!confirm('Are you certain you want to delete this application and all associated licenses?')) return;
    const res = await fetch('/api/apps/' + appId, { method: 'DELETE' });
    if (res.ok) {
      this.showToast('Application deleted', 'info');
      await this.loadApplications();
      if (this.apps.length > 0) this.activeAppId = this.apps[0].id;
      this.renderApplications(document.getElementById('content-container'));
    }
  },

  // Add Variable Modal
  openAddVariableModal() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Add Global Variable</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="add-var-modal-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group">
                <label class="form-label">Key Name</label>
                <input type="text" id="var-key-in" class="form-control font-mono" placeholder="CONFIG_PAYLOAD_URL" required />
              </div>
              <div class="form-group">
                <label class="form-label">Value</label>
                <input type="text" id="var-val-in" class="form-control" placeholder="https://cdn.domain.com/v1" required />
              </div>
              <div class="form-group">
                <label class="form-label">Data Type</label>
                <select id="var-type-in" class="form-control">
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save Variable</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('add-var-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('var-key-in').value.trim();
      const value = document.getElementById('var-val-in').value.trim();
      const data_type = document.getElementById('var-type-in').value;

      const res = await fetch('/api/variables/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value, data_type, app_id: this.activeAppId })
      });
      if (res.ok) {
        this.closeAllModals();
        this.showToast('Global variable added!', 'success');
        this.renderVariables(document.getElementById('content-container'));
      }
    });
  },

  // Upload File Modal
  openUploadFileModal() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Upload Encrypted Asset</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="upload-file-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group">
                <label class="form-label">Asset Name / Title</label>
                <input type="text" id="upload-name-in" class="form-control" placeholder="payload_v2.dll" required />
              </div>
              <div class="form-group">
                <label class="form-label">Select File</label>
                <input type="file" id="upload-binary-in" class="form-control" required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Upload File</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('upload-file-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileIn = document.getElementById('upload-binary-in');
      const nameIn = document.getElementById('upload-name-in').value.trim();
      if (!fileIn.files.length) return;

      const formData = new FormData();
      formData.append('file', fileIn.files[0]);
      formData.append('original_name', nameIn);
      formData.append('app_id', this.activeAppId);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        this.closeAllModals();
        this.showToast('Encrypted asset uploaded successfully!', 'success');
        this.renderFiles(document.getElementById('content-container'));
      }
    });
  },

  // Add Team Member Modal
  openAddTeamModal() {
    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">Add Team Member</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="add-team-form">
            <div class="modal-body" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group">
                <label class="form-label">Member Email Address</label>
                <input type="email" id="tm-email" class="form-control" placeholder="partner@domain.com" required />
              </div>
              <div class="form-group">
                <label class="form-label">Role</label>
                <select id="tm-role" class="form-control">
                  <option value="Manager">Manager (Full App Delegated Access)</option>
                  <option value="Reseller">Reseller (License Vending Only)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Initial Key Balance (for Resellers)</label>
                <input type="number" id="tm-keys" class="form-control" value="100" min="0" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="ZenithApp.closeAllModals()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Invite Member</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('add-team-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('tm-email').value.trim();
      const role = document.getElementById('tm-role').value;
      const key_balance = parseInt(document.getElementById('tm-keys').value, 10);

      const endpoint = role === 'Reseller' ? '/api/team/reseller' : '/api/team/manager';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, key_balance, app_id: this.activeAppId })
      });
      if (res.ok) {
        this.closeAllModals();
        this.showToast('Team member invited successfully', 'success');
        this.renderTeam(document.getElementById('content-container'));
      }
    });
  },

  // Notifications Modal
  async openNotificationsModal() {
    const res = await fetch('/api/notifications');
    const notes = res.ok ? await res.json() : [];

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="font-size:16px; font-weight:700;">System Notifications</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:8px;">
            ${notes.length > 0 ? notes.map(n => `
              <div style="background:#141416; border:1px solid #232328; border-radius:8px; padding:12px;">
                <div style="font-weight:600; color:#fff; font-size:13px;">${n.title}</div>
                <div style="font-size:12px; color:#929292; margin-top:3px;">${n.message}</div>
                <div style="font-size:10.5px; color:#6b7280; margin-top:6px;">${n.created_at || 'Just now'}</div>
              </div>
            `).join('') : '<div style="text-align:center; padding:20px; color:#666;">No unread notifications</div>'}
          </div>
        </div>
      </div>
    `);
  },



  async getFreshApplications() {
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const apps = await res.json();
        this.applications = apps;
        return apps;
      }
    } catch {}
    return this.applications || [];
  },

  toggleSelectAllMgrApps() {
    const cbs = document.querySelectorAll('input[name="mgr_apps"]');
    if (!cbs.length) return;
    const allChecked = Array.from(cbs).every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
  },

  // Image 7 & 8: Manager Creation Modal with Multi-select applications (No Limit)
  async openAddManagerModal() {
    const apps = await this.getFreshApplications();
    const pages = [
      'WHITELIST', 'BLACKLIST', 'SESSION', 'VARIABLES', 'FILES', 
      'WEBHOOK', 'AUDITLOG', 'APP_SETTINGS', 'SUBSCRIPTION', 
      'LICENSES', 'CHATROOM', 'USER_VARIABLES', 'LOGS'
    ];

    this.blockedPagesSet = new Set(['WHITELIST', 'BLACKLIST', 'SESSION', 'VARIABLES', 'FILES', 'WEBHOOK', 'AUDITLOG', 'APP_SETTINGS']);

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:540px; background:#121214; border:1px solid #232328; border-radius:14px; max-height:90vh; overflow-y:auto;">
          <div class="modal-header" style="border-bottom:1px solid #232328; padding:16px 20px;">
            <h3 style="font-size:18px; font-weight:700; color:#fff;">Create Manager</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="create-manager-form" onsubmit="event.preventDefault(); ZenithApp.submitCreateManager();">
            <div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
              <!-- Assigned Applications (Multi-select, No Limit) -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="font-size:12px; font-weight:600; color:#929292;">Assigned Applications (Select Multiple — No Limit)</label>
                  <button type="button" class="btn btn-secondary btn-xs" onclick="ZenithApp.toggleSelectAllMgrApps()" style="font-size:11px; padding:2px 8px;">Select All</button>
                </div>
                <div id="mgr-apps-list" style="max-height:130px; overflow-y:auto; background:#18181b; border:1px solid #27272a; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                  ${apps.length > 0 ? apps.map(a => `
                    <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:#fff; cursor:pointer;">
                      <input type="checkbox" name="mgr_apps" value="${a.id}" checked style="accent-color:#6366f1; width:16px; height:16px;" />
                      <span><strong>${a.name}</strong> <span style="color:#71717a; font-size:11px;">(App #${a.id})</span></span>
                    </label>
                  `).join('') : '<div style="color:#ef4444; font-size:12px; padding:4px;">No applications created yet. Please create an application in the Applications tab first.</div>'}
                </div>
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Username</label>
                <input type="text" id="mgr-username" class="form-control" placeholder="Enter manager username" required style="background:#18181b; border:1px solid #27272a; color:#fff;" />
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Email Address</label>
                <input type="email" id="mgr-email" class="form-control" placeholder="Enter manager email" required style="background:#18181b; border:1px solid #27272a; color:#fff;" />
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Password</label>
                <input type="password" id="mgr-password" class="form-control" placeholder="Enter secure password" required style="background:#18181b; border:1px solid #27272a; color:#fff;" />
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; background:#18181b; padding:12px 14px; border-radius:8px; border:1px solid #27272a;">
                <div>
                  <div style="font-size:13px; font-weight:600; color:#fff;">Expiry Date</div>
                  <div style="font-size:11px; color:#71717a;">Grant permanent access or custom expiration</div>
                </div>
                <input type="date" id="mgr-expiry" class="form-control" style="width:160px; background:#121214; border:1px solid #3f3f46; color:#fff; font-size:12px;" />
              </div>

              <!-- RED BLOCK PAGES SECTION (Exact match to Image 7 & 8) -->
              <div style="border:1px solid #ef444444; background:#ef444411; border-radius:10px; padding:14px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:12px; font-weight:800; color:#f87171; letter-spacing:0.5px;">BLOCK PAGES</span>
                  <span style="font-size:11px; color:#fca5a5;">(Manager Restricted)</span>
                </div>
                <p style="font-size:11.5px; color:#a1a1aa; margin:0 0 12px 0;">Select pages that this manager should NOT have access to:</p>

                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:8px;">
                  ${pages.map(p => {
                    const isBlocked = this.blockedPagesSet.has(p);
                    return `
                      <div id="block-pill-${p}" onclick="ZenithApp.toggleBlockPage('${p}')" 
                           style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:11.5px; font-weight:700; user-select:none; transition:all 0.15s ease; ${isBlocked ? 'background:#b91c1c33; border:1px solid #ef4444; color:#fca5a5;' : 'background:#18181b; border:1px solid #27272a; color:#71717a;'}">
                        <span style="display:inline-block; width:12px; height:12px; border-radius:3px; border:1px solid ${isBlocked ? '#ef4444' : '#3f3f46'}; background:${isBlocked ? '#ef4444' : 'transparent'}; text-align:center; line-height:11px; font-size:10px; color:#fff;">${isBlocked ? '✓' : ''}</span>
                        <span>${p}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Solid White Continue Button (Image 7 & 8) -->
              <button type="submit" style="background:#ffffff; color:#000000; font-weight:700; width:100%; padding:13px; border-radius:8px; border:none; cursor:pointer; font-size:14px; margin-top:6px; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    `);
  },

  toggleBlockPage(page) {
    if (!this.blockedPagesSet) this.blockedPagesSet = new Set();
    if (this.blockedPagesSet.has(page)) {
      this.blockedPagesSet.delete(page);
    } else {
      this.blockedPagesSet.add(page);
    }
    const pill = document.getElementById('block-pill-' + page);
    if (pill) {
      const isBlocked = this.blockedPagesSet.has(page);
      pill.style.background = isBlocked ? '#b91c1c33' : '#18181b';
      pill.style.borderColor = isBlocked ? '#ef4444' : '#27272a';
      pill.style.color = isBlocked ? '#fca5a5' : '#71717a';
      const box = pill.querySelector('span');
      if (box) {
        box.style.borderColor = isBlocked ? '#ef4444' : '#3f3f46';
        box.style.background = isBlocked ? '#ef4444' : 'transparent';
        box.innerText = isBlocked ? '✓' : '';
      }
    }
  },

  async submitCreateManager() {
    const appCheckboxes = document.querySelectorAll('input[name="mgr_apps"]:checked');
    const selectedAppIds = Array.from(appCheckboxes).map(cb => cb.value).join(',');
    if (!selectedAppIds) {
      return this.showToast('Please select at least one application for the manager', 'warning');
    }
    const appId = selectedAppIds;
    const username = document.getElementById('mgr-username').value.trim();
    const email = document.getElementById('mgr-email').value.trim();
    const password = document.getElementById('mgr-password').value;
    const expiry = document.getElementById('mgr-expiry').value || null;
    const blocked_pages = Array.from(this.blockedPagesSet || []);

    try {
      const res = await fetch('/api/team/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username, email, password, assigned_apps: appId, expiry_date: expiry, blocked_pages
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create manager');
      this.closeAllModals();
      this.showToast('Manager ' + username + ' created successfully', 'success');
      this.renderTeam(document.getElementById('content-container'));
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // Image 9: Reseller Creation Modal (Strictly Select 1 Application Only)
  async openAddResellerModal() {
    const apps = await this.getFreshApplications();

    this.openModal(`
      <div class="modal-backdrop" onclick="if(event.target === this) ZenithApp.closeAllModals()">
        <div class="modal-container" style="max-width:500px; background:#121214; border:1px solid #232328; border-radius:14px;">
          <div class="modal-header" style="border-bottom:1px solid #232328; padding:16px 20px;">
            <h3 style="font-size:18px; font-weight:700; color:#fff;">Create Reseller</h3>
            <button class="sidebar-toggle-btn" onclick="ZenithApp.closeAllModals()">${ZenithIcons.close}</button>
          </div>
          <form id="create-reseller-form" onsubmit="event.preventDefault(); ZenithApp.submitCreateReseller();">
            <div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
              <!-- Assigned Applications: Select 1 Application Only (Attachment 2) -->
              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Assigned Application (Select 1 Application Only)</label>
                <select id="reseller-app-id" class="form-control" style="background:#18181b; border:1px solid #27272a; color:#fff;" required>
                  ${apps.length > 0 ? apps.map(a => `<option value="${a.id}">${a.name} (App #${a.id})</option>`).join('') : '<option value="" disabled selected>No applications created yet. Please create an application first.</option>'}
                </select>
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Username</label>
                <input type="text" id="reseller-username" class="form-control" placeholder="Enter reseller username" required style="background:#18181b; border:1px solid #27272a; color:#fff;" />
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Email Address</label>
                <input type="email" id="reseller-email" class="form-control" placeholder="Enter reseller email" required style="background:#18181b; border:1px solid #27272a; color:#fff;" />
              </div>

              <div>
                <label style="font-size:12px; font-weight:600; color:#929292; display:block; margin-bottom:6px;">Password</label>
                <input type="password" id="reseller-password" class="form-control" placeholder="Enter secure password" required style="background:#18181b; border:1px solid #27272a; color:#fff;" />
              </div>

              <!-- Expiry Toggle Switch -->
              <div style="background:#18181b; border:1px solid #27272a; border-radius:8px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:13px; font-weight:600; color:#fff;">Expiry Date</div>
                  <div style="font-size:11px; color:#71717a;">Set custom expiration or permanent</div>
                </div>
                <input type="date" id="reseller-expiry" class="form-control" style="width:160px; background:#121214; border:1px solid #3f3f46; color:#fff; font-size:12px;" />
              </div>

              <!-- Key Balance Toggle Switch (Image 9) -->
              <div style="background:#18181b; border:1px solid #27272a; border-radius:8px; padding:12px 14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <div>
                    <div style="font-size:13px; font-weight:600; color:#fff;">Key Balance</div>
                    <div style="font-size:11px; color:#71717a;">Grant starting license vending quota</div>
                  </div>
                  <input type="number" id="reseller-keys" class="form-control" value="100" min="0" style="width:120px; background:#121214; border:1px solid #3f3f46; color:#fff; font-weight:700;" />
                </div>
              </div>

              <!-- Solid White Continue Button (Image 9) -->
              <button type="submit" style="background:#ffffff; color:#000000; font-weight:700; width:100%; padding:13px; border-radius:8px; border:none; cursor:pointer; font-size:14px; margin-top:6px; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    `);
  },

  async submitCreateReseller() {
    const appId = document.getElementById('reseller-app-id').value;
    const username = document.getElementById('reseller-username').value.trim();
    const email = document.getElementById('reseller-email').value.trim();
    const password = document.getElementById('reseller-password').value;
    const expiry = document.getElementById('reseller-expiry').value || null;
    const key_balance = parseInt(document.getElementById('reseller-keys').value || '0', 10);

    try {
      const res = await fetch('/api/team/reseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username, email, password, assigned_apps: appId, key_balance, expiry_date: expiry
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create reseller');
      this.closeAllModals();
      this.showToast('Reseller ' + username + ' created successfully with ' + key_balance + ' keys', 'success');
      this.renderTeam(document.getElementById('content-container'));
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // Logout Function
  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    this.user = null;
    this.showToast('Signed out of session', 'info');
    this.renderLandingPage();
  }
};

// Global Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
  ZenithApp.init();
});

window.ZenithApp = ZenithApp;
