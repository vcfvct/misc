#!/usr/bin/env node

const puppeteer = require('puppeteer');

puppeteer.launch({
    headless: false,
    slowMo: 2000 // slow down by 250ms
}).then(async browser => {
    const page = await browser.newPage();
    let currentURL;
    page
        .waitForSelector('img')
        .then(() => console.log('First URL with image: ' + currentURL));
    for (currentURL of ['https://example.com', 'https://google.com', 'https://bbc.com']) {
        await page.goto(currentURL);
    }
    await browser.close();
});

/*
 this.browser = await puppeteer.launch(
            {
                headless: true,
                timeout: 0,
                args:
                [
                    '--disable-dev-profile',
                    '--disable-setuid-sandbox',
                    // '--disable-javascript', // sounds good, doesn't work
                    '--disable-javascript-harmony-shipping', // Disable latest shipping ECMAScript 6 features. ↪
                    '--no-sandbox', // Disables the sandbox for all process types that are normally sandboxed. ↪
                    '--disable-translate', // Disable built-in Google Translate service
                    '--disable-background-networking', // Disable several subsystems which run network requests in the background. This is for use when doing network performance testing to avoid noise in the measurements. ↪
                    '--safebrowsing-disable-auto-update', // Disable fetching safebrowsing lists, likely redundant due to disable-background-networking
                    '--disable-sync', // Disable syncing to a Google account
                    '--metrics-recording-only', // Disable reporting to UMA, but allows for collection
                    '--disable-default-apps', // Disable installation of default apps on first run
                    '--headless',// https://developers.google.com/web/updates/2017/04/headless-chrome
                    '--hide-scrollbars',  // Hide scrollbars from screenshots. ↪
                    '--allow-http-background-page', // Allows non-https URL for background_page for hosted apps. ↪
                    '--allow-http-screen-capture', // Allow non-secure origins to use the screen capture API and the desktopCapture extension API. ↪
                    '--allow-insecure-localhost', // Enables TLS/SSL errors on localhost to be ignored (no interstitial, no blocking of requests). ↪
                    '--allow-no-sandbox-job', // Enables the sandboxed processes to run without a job object assigned to them. This flag is required to allow Chrome to run in RemoteApps or Citrix. This flag can reduce the security of the sandboxed processes and allow them to do certain API calls like shut down Windows or access the clipboard. Also we lose the chance to kill some processes until the outer job that owns them finishes. ↪
                    '--allow-running-insecure-content', // By default, an https page cannot run JavaScript, CSS or plugins from http URLs. This provides an override to get the old insecure behavior. ↪
                    '--ash-disable-smooth-screen-rotation', // Disables a smoother animation for screen rotation. ↪
                    '--ash-disable-touch-exploration-mode', // Disable the Touch Exploration Mode. Touch Exploration Mode will no longer be turned on automatically when spoken feedback is enabled when this flag is set. ↪
                    '--audio-output-channels=0', // Number of audio output channels. This will be used to send audio buffer with specific number of channels to ALSA and generate loopback audio. Default value is 2. ↪
                    '--cc-layer-tree-test-long-timeout', // Increases timeout for memory checkers. ↪
                    '--disable-3d-apis', // Disables client-visible 3D APIs, in particular WebGL and Pepper 3D. This is controlled by policy and is kept separate from the other enable/disable switches to avoid accidentally regressing the policy support for controlling access to these APIs. ↪
                    '--disable-accelerated-video-decode', // Disables hardware acceleration of video decode, where available. ↪
                    '--disable-avfoundation-overlays[11]', // Disable use of AVFoundation to draw video content. ↪
                    '--disable-bookmark-reordering', // Disables bookmark reordering. ↪
                    '--disable-boot-animation', // Disables wallpaper boot animation (except of OOBE case). ↪
                    '--disable-browser-task-scheduler', // No description ↪
                    '--disable-bundled-ppapi-flash', // Disables the bundled PPAPI version of Flash. ↪ 
                    '--disable-captive-portal-bypass-proxy', // Disables bypass proxy for captive portal authorization. ↪
                    '--disable-cast-streaming-hw-encoding', // Disables hardware encoding support for Cast Streaming. ↪
                    '--disable-clear-browsing-data-counters', // Disables data volume counters in the Clear Browsing Data dialog. ↪
                    '--disable-client-side-phishing-detection', // Disables the client-side phishing detection feature. Note that even if client-side phishing detection is enabled, it will only be active if the user has opted in to UMA stats and SafeBrowsing is enabled in the preferences. ↪
                    '--disable-cloud-import', // Disables cloud backup feature. ↪
                    '--disable-component-cloud-policy', // Disables fetching and storing cloud policy for components. ↪
                    '--disable-component-extensions-with-background-pages', // Disable default component extensions with background pages - useful for performance tests where these pages may interfere with perf results. ↪
                    '--disable-component-update', // No description ↪
                    '--disable-default-apps', // Disables installation of default apps on first run. This is used during automated testing. ↪
                    '--disable-demo-mode', // Disables the Chrome OS demo. ↪
                    '--disable-device-discovery-notifications', // Disables device discovery notifications. ↪
                    '--disable-dinosaur-easter-egg', // Disables the dinosaur easter egg on the offline interstitial. ↪
                    '--disable-drive-search-in-app-launcher', // No description ↪
                    '--disable-extensions', // Disable extensions. ↪
                    '--disable-file-system', // Disable FileSystem API. ↪
                    '--disable-flash-3d', // Disable 3D inside of flapper. ↪  ??
                    '--disable-flash-stage3d', // Disable Stage3D inside of flapper. ↪ ??
                    '--disable-gesture-editing', // No description ↪
                    '--disable-gesture-requirement-for-presentation', // Disable user gesture requirement for presentation. ↪
                    '--disable-gesture-typing', // No description ↪
                    '--disable-glsl-translator', // Disable the GLSL translator. ↪
                    '--disable-gpu', // Disables GPU hardware acceleration. If software renderer is not in place, then the GPU process won't launch. ↪
                    '--disable-kill-after-bad-ipc', // Don't kill a child process when it sends a bad IPC message. Apart from testing, it is a bad idea from a security perspective to enable this switch. ↪
                    '--disable-legacy-window[1]', // Disable the Legacy Window which corresponds to the size of the WebContents. ↪
                    '--disable-local-storage', // Disable LocalStorage. ↪
                    '--disable-logging', // Force logging to be disabled. Logging is enabled by default in debug builds. ↪
                    '--disable-logging-redirect[8]', // Disables logging redirect for testing. ↪
                    '--disable-login-animations', // Avoid doing expensive animations upon login. ↪
                    '--disable-login-screen-apps[8]', // Disables apps on the login screen. By default, they are allowed and can be installed through policy. ↪
                    '--disable-low-latency-dxva', // Disables using CODECAPI_AVLowLatencyMode when creating DXVA decoders. ↪
                    '--disable-media-session-api[6]', // Disable Media Session API ↪
                    '--disable-namespace-sandbox', // Disables usage of the namespace sandbox. ↪
                    '--disable-native-gpu-memory-buffers', // Disables native GPU memory buffer support. ↪
                    '--disable-new-channel-switcher-ui', // Disables new channel switcher UI. ↪
                    '--disable-new-korean-ime', // Disables the new Korean IME in chrome://settings/languages. ↪
                    '--disable-new-virtual-keyboard-behavior', // Disable new window behavior for virtual keyboard (do not change work area in non-sticky mode). ↪
                    '--disable-new-zip-unpacker', // Disables the new File System Provider API based ZIP unpacker. ↪
                    '--disable-notifications', // Disables the Web Notification and the Push APIs. ↪
                    '--disable-ntp-most-likely-favicons-from-server', // Disables the new Google favicon server for fetching favicons for Most Likely tiles on the New Tab Page. ↪
                    '--disable-nv12-dxgi-video', // Disables the video decoder from drawing to an NV12 textures instead of ARGB. ↪
                    '--disable-offer-upload-credit-cards', // Disables offering to upload credit cards. ↪
                    '--disable-office-editing-component-extension', // Disables Office Editing for Docs, Sheets & Slides component app so handlers won't be registered, making it possible to install another version for testing. ↪
                    '--disable-offline-auto-reload', // Disable auto-reload of error pages if offline. ↪
                    '--disable-offline-auto-reload-visible-only', // Disable only auto-reloading error pages when the tab is visible. ↪
                    '--disable-password-generation', // Disables password generation when we detect that the user is going through account creation. ↪
                    '--disable-per-user-timezone', // Disables per-user timezone. ↪
                    '--disable-permissions-api', // Disables the Permissions API. ↪
                    '--disable-physical-keyboard-autocorrect', // Disables suggestions while typing on a physical keyboard. ↪
                    '--disable-pinch', // Disables compositor-accelerated touch-screen pinch gestures. ↪
                    '--disable-pnacl-crash-throttling', // Disables crash throttling for Portable Native Client. ↪
                    '--disable-popup-blocking', // Disable pop-up blocking. ↪
                    '--disable-rgba-4444-textures', // Disables RGBA_4444 textures. ↪
                    '--disable-signin-promo', // Disables sign-in promo. ↪
                    '--disable-signin-scoped-device-id', // Disables sending signin scoped device id to LSO with refresh token request. ↪
                    '--disable-software-rasterizer', // Disables the use of a 3D software rasterizer. ↪
                    '--disable-speech-api', // Disables the Web Speech API. ↪
                    '--disable-suggestions-ui', // Disables the Suggestions UI ↪
                    '--disable-sync-app-list', // No description ↪
                    '--disable-sync-types', // Disables syncing one or more sync data types that are on by default. See sync/base/model_type.h for possible types. Types should be comma separated, and follow the naming convention for string representation of model types, e.g.: '--disable-synctypes='Typed URLs, Bookmarks, Autofill Profiles' ↪
                    '--disable-system-timezone-automatic-detection', // Disables SystemTimezoneAutomaticDetection policy. ↪
                    '--disable-tab-for-desktop-share', // Enables tab for desktop sharing. ↪
                    '--disable-third-party-keyboard-workaround', // Disables the 3rd party keyboard omnibox workaround. ↪
                    '--disable-threaded-animation', // No description ↪
                    '--disable-timeouts-for-profiling[6]', // Disable timeouts that may cause the browser to die when running slowly. This is useful if running with profiling (such as debug malloc). ↪
                    '--disable-touch-adjustment', // Disables touch adjustment. ↪
                    '--disable-touch-drag-drop', // Disables touch event based drag and drop. ↪
                    '--disable-v8-idle-tasks', // Disable V8 idle tasks. ↪
                    '--disable-vaapi-accelerated-video-encode[8]', // Disables VA-API accelerated video encode. ↪
                    '--disable-web-notification-custom-layouts', // Disables Web Notification custom layouts. ↪
                    '--disable-web-security', // Don't enforce the same-origin policy. (Used by people testing their sites.) ↪
                    '--disable-webgl', // Disable experimental WebGL support. ↪
                    '--disable-xss-auditor', // Disables Blink's XSSAuditor. The XSSAuditor mitigates reflective XSS. ↪
                    '--no-default-browser-check', // Disables the default browser check. Useful for UI/browser tests where we want to avoid having the default browser info-bar displayed. ↪
                    '--no-experiments', // Disables all experiments set on about:flags. Does not disable about:flags itself. Useful if an experiment makes chrome crash at startup: One can start chrome with '--no-experiments, disable the problematic lab at about:flags and then restart chrome without this switch again. ↪
                    '--no-first-run', // Skip First Run tasks, whether or not it's actually the First Run. Overridden by kForceFirstRun. This does not drop the First Run sentinel and thus doesn't prevent first run from occuring the next time chrome is launched without this flag. ↪
                    '--no-proxy-server', // Don't use a proxy server, always make direct connections. Overrides any other proxy server flags that are passed. ↪
                    '--no-referrers', // Don't send HTTP-Referer headers. ↪
                    '--ui-disable-partial-swap', // Disable partial swap which is needed for some OpenGL drivers / emulators. ↪
                ]
            }
        )
*/