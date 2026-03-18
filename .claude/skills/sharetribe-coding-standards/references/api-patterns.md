# API Patterns

## Table of Contents
- [Server-Side API Structure](#server-side-api-structure)
- [API Endpoint Creation](#api-endpoint-creation)
- [Pagination Pattern](#pagination-pattern)
- [API Router Configuration](#api-router-configuration)
- [Frontend API Client](#frontend-api-client)
- [SDK Integration](#sdk-integration)
- [Error Handling](#error-handling)

---

## Server-Side API Structure

```
server/
├── api/
│   ├── endpointName.js           # Individual endpoint handler
│   ├── getAllUsers.js
│   ├── getAllTransactions.js
│   └── ...
├── api-util/
│   └── sdk.js                    # SDK utilities and serialization
└── apiRouter.js                  # Route registration
```

---

## API Endpoint Creation

Create API endpoints as async module exports in `server/api/`:

```javascript
// server/api/endpointName.js
const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');

const integrationSdk = flexIntegrationSdk.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET,
  baseUrl: 'https://flex-integ-api.sharetribe.com',
});

module.exports = async (req, res) => {
  try {
    const { apiQueryParams } = req.body || {};

    if (!apiQueryParams) {
      return res.status(400).json({
        error: 'Missing apiQueryParams in request body'
      });
    }

    const response = await integrationSdk.resourceName.query(apiQueryParams);

    return res.status(200).json({
      data: response?.data?.data
    });

  } catch (error) {
    console.error('Error in endpointName:', error);
    return res.status(500).json({
      error: 'Operation failed',
      details: error.message
    });
  }
};
```

---

## Pagination Pattern

Implement pagination for list endpoints:

```javascript
module.exports = async (req, res) => {
  try {
    const { apiQueryParams } = req.body;

    let allResults = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const pagedParams = {
        ...apiQueryParams,
        page: currentPage,
      };

      const response = await integrationSdk.resource.query(pagedParams);
      const pageResults = response?.data?.data || [];
      allResults = allResults.concat(pageResults);

      const meta = response?.data?.meta || {};
      totalPages = meta?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return res.status(200).json({ allResults });

  } catch (error) {
    console.error('Pagination error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

---

## API Router Configuration

### Middleware Configuration (server/apiRouter.js)

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { deserialize } = require('./api-util/sdk');

const router = express.Router();

// 1. Parse body as text first
router.use(
  bodyParser.text({
    type: [
      'application/json',
      'application/transit+json',
      'application/json; charset=utf-8'
    ],
  })
);

// 2. Deserialize Transit/JSON body
router.use((req, res, next) => {
  if (req.get('Content-Type') === 'application/transit+json' &&
      typeof req.body === 'string') {
    try {
      req.body = deserialize(req.body);
    } catch (e) {
      console.error('Failed to parse Transit:', e);
      return res.status(400).send('Invalid Transit in request body.');
    }
  } else if (req.get('Content-Type') === 'application/json; charset=utf-8') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return res.status(400).send('Invalid JSON in request body.');
    }
  }
  next();
});
```

### Route Registration

```javascript
// Import handlers
const getAllUsers = require('./api/getAllUsers');
const getAllTransactions = require('./api/getAllTransactions');

// GET endpoints
router.get('/initiate-login-as', initiateLoginAs);

// POST endpoints
router.post('/getAllUsers', getAllUsers);
router.post('/getAllTransactions', getAllTransactions);

// File upload (with multer)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post('/uploadFile', upload.single('file'), uploadFileHandler);

module.exports = router;
```

---

## Frontend API Client

### API Utility (src/util/api.js)

```javascript
import { types as sdkTypes, transit } from './sdkLoader';
import Decimal from 'decimal.js';

export const typeHandlers = [
  {
    type: sdkTypes.BigDecimal,
    customType: Decimal,
    writer: v => new sdkTypes.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

const serialize = data => transit.write(data, { typeHandlers, verbose: false });
const deserialize = str => transit.read(str, { typeHandlers });

const request = (path, options = {}) => {
  const url = `${apiBaseUrl()}${path}`;
  const { credentials, headers, body, ...rest } = options;

  const shouldSerializeBody =
    (!headers || headers['Content-Type'] === 'application/transit+json') && body;
  const bodyMaybe = shouldSerializeBody ? { body: serialize(body) } : {};

  const fetchOptions = {
    credentials: credentials || 'include',
    headers: headers || { 'Content-Type': 'application/transit+json' },
    ...bodyMaybe,
    ...rest,
  };

  return window.fetch(url, fetchOptions).then(res => {
    const contentType = res.headers.get('Content-Type')?.split(';')[0];

    if (res.status >= 400) {
      return res.json().then(data => {
        let e = new Error();
        e = Object.assign(e, data);
        throw e;
      });
    }
    if (contentType === 'application/transit+json') {
      return res.text().then(deserialize);
    } else if (contentType === 'application/json') {
      return res.json();
    }
    return res.text();
  });
};

export const post = (path, body) => request(path, { method: 'POST', body });
export const get = path => request(path, { method: 'GET' });
```

### Creating Client Functions

```javascript
// In src/util/api.js
export const getAllTransactions = body => post('/api/getAllTransactions', body);
export const customEndpoint = body => post('/api/customEndpoint', body);

// For file uploads
export const uploadFile = (formData) => {
  return request('/api/uploadFile', {
    method: 'POST',
    headers: {}, // Let browser set Content-Type for FormData
    body: formData,
  });
};
```

---

## SDK Integration

### Server-Side SDK (server/api-util/sdk.js)

```javascript
const sharetribeSdk = require('sharetribe-flex-sdk');
const Decimal = require('decimal.js');

const CLIENT_ID = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const CLIENT_SECRET = process.env.SHARETRIBE_SDK_CLIENT_SECRET;

const typeHandlers = [
  {
    type: sharetribeSdk.types.BigDecimal,
    customType: Decimal,
    writer: v => new sharetribeSdk.types.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

exports.typeHandlers = typeHandlers;
exports.serialize = data => sharetribeSdk.transit.write(data, { typeHandlers });
exports.deserialize = str => sharetribeSdk.transit.read(str, { typeHandlers });

exports.handleError = (res, error) => {
  if (error.status && error.statusText && error.data) {
    const { status, statusText, data } = error;
    res.status(error.status).json({
      name: 'LocalAPIError',
      message: 'Local API request failed',
      status, statusText, data,
    });
  } else {
    res.status(500).json({ error: error.message });
  }
};
```

### Frontend SDK Loader (src/util/sdkLoader.js)

```javascript
import * as importedSdk from 'sharetribe-flex-sdk';

const isServer = () => typeof window === 'undefined';

let exportSdk;
if (isServer()) {
  exportSdk = eval('require')('sharetribe-flex-sdk');
} else {
  exportSdk = importedSdk;
}

const { createInstance, types, transit, util } = exportSdk;
export { createInstance, types, transit, util };
```

---

## Error Handling

### Error Utilities (src/util/errors.js)

```javascript
import {
  isForbiddenError,
  isNotFoundError,
  isTooManyRequestsError,
  isSignupEmailTakenError,
  storableError,
} from '../../util/errors';

// In thunk error handling
.catch(e => {
  const error = storableError(e);

  if (isForbiddenError(error)) {
    // Handle 403
  } else if (isNotFoundError(error)) {
    // Handle 404
  } else if (isTooManyRequestsError(error)) {
    // Handle rate limiting
  }

  dispatch(fetchError(error));
});
```

**Always wrap errors with `storableError` before dispatching:**

```javascript
dispatch(fetchError(storableError(e)));
```
