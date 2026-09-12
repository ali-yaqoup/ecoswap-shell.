# EcoSwap Shell

Shell/host page that composes EcoSwap microfrontends with iframe embedding and a `postMessage` event contract (Group 11).

## Overview

The shell loads catalog, cart/checkout, and account apps into frames and coordinates navigation, cart badge updates, and lightweight toast notifications.

## Apps composed

- Catalog / discovery
- Cart & checkout (Vue)
- Account / orders

Update the live URLs in `shell.js` before deploying.

## Run locally

Open `index.html` in a browser, or:

```bash
npx serve .
```

## License & copyright

Copyright © 2026 Ali Yaqoub. All rights reserved.

This software and its contents are proprietary. Unauthorized copying, distribution, modification, or commercial use is prohibited without prior written permission from the copyright holder.

See the [LICENSE](./LICENSE) file for the full notice.
