# Redux Patterns (Ducks)

## Table of Contents
- [Ducks Pattern Overview](#ducks-pattern-overview)
- [Action Types](#action-types)
- [Initial State](#initial-state)
- [Reducer](#reducer)
- [Action Creators](#action-creators)
- [Thunk Actions](#thunk-actions)
- [Selectors](#selectors)
- [Reducer Registration](#reducer-registration)
- [LoadData Registration](#loaddata-registration)
- [Complete Duck Template](#complete-duck-template)

---

## Ducks Pattern Overview

Structure Redux state using the Ducks pattern:
- Action types namespaced as `app/feature/ACTION_NAME`
- Initial state object
- Reducer as default export
- Action creators as named exports
- Thunks for async operations

---

## Action Types

```javascript
// Format: 'app/feature/ACTION_NAME'
export const FETCH_REQUEST = 'app/featureName/FETCH_REQUEST';
export const FETCH_SUCCESS = 'app/featureName/FETCH_SUCCESS';
export const FETCH_ERROR = 'app/featureName/FETCH_ERROR';
```

---

## Initial State

```javascript
const initialState = {
  data: null,
  inProgress: false,
  error: null,
};
```

---

## Reducer

```javascript
export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case FETCH_REQUEST:
      return { ...state, inProgress: true, error: null };
    case FETCH_SUCCESS:
      return { ...state, inProgress: false, data: payload };
    case FETCH_ERROR:
      console.error(payload); // eslint-disable-line no-console
      return { ...state, inProgress: false, error: payload };
    default:
      return state;
  }
}
```

---

## Action Creators

```javascript
export const fetchRequest = () => ({ type: FETCH_REQUEST });
export const fetchSuccess = data => ({ type: FETCH_SUCCESS, payload: data });
export const fetchError = error => ({ type: FETCH_ERROR, payload: error, error: true });
```

---

## Thunk Actions

### SDK-based Thunk

```javascript
export const fetchData = params => (dispatch, getState, sdk) => {
  dispatch(fetchRequest());

  return sdk.someEndpoint.query(params)
    .then(response => {
      dispatch(fetchSuccess(response.data));
      return response;
    })
    .catch(e => {
      dispatch(fetchError(storableError(e)));
      throw e;
    });
};
```

### Custom API-based Thunk

```javascript
export const fetchFromCustomAPI = params => (dispatch, getState, sdk) => {
  dispatch(fetchRequest());

  return customEndpoint({ apiQueryParams: params })
    .then(response => {
      dispatch(fetchSuccess(response.data));
      return response;
    })
    .catch(e => {
      dispatch(fetchError(storableError(e)));
      throw e;
    });
};
```

### Async/Await Thunk

```javascript
export const complexOperation = params => async (dispatch, getState, sdk) => {
  dispatch(fetchRequest());

  try {
    const state = getState();
    const { currentUser } = state.user;

    const [listings, transactions] = await Promise.all([
      sdk.listings.query({ authorId: currentUser.id.uuid }),
      sdk.transactions.query({ customerId: currentUser.id.uuid }),
    ]);

    const combinedData = {
      listings: listings.data.data,
      transactions: transactions.data.data,
    };

    dispatch(fetchSuccess(combinedData));
    return combinedData;

  } catch (e) {
    dispatch(fetchError(storableError(e)));
    throw e;
  }
};
```

---

## Selectors

```javascript
export const selectData = state => state.featureName.data;
export const selectFetchInProgress = state => state.featureName.fetchInProgress;
export const selectFetchError = state => state.featureName.fetchError;
```

---

## Reducer Registration

### Global Reducers (src/ducks/index.js)

```javascript
import auth from './auth.duck';
import user from './user.duck';
// Add new global ducks here
import newFeature from './newFeature.duck';

export {
  auth,
  user,
  newFeature,
};
```

### Page Reducers (src/containers/reducers.js)

```javascript
import CheckoutPage from './CheckoutPage/CheckoutPage.duck';
import SearchPage from './SearchPage/SearchPage.duck';
// Add new page ducks here
import NewPage from './NewPage/NewPage.duck';

export {
  CheckoutPage,
  SearchPage,
  NewPage,
};
```

---

## LoadData Registration

Register page loadData functions in `src/containers/pageDataLoadingAPI.js`:

```javascript
import { loadData as ListingPageLoader } from './ListingPage/ListingPage.duck';
import { loadData as NewPageLoader } from './NewPage/NewPage.duck';

const getPageDataLoadingAPI = () => {
  return {
    ListingPage: { loadData: ListingPageLoader },
    NewPage: { loadData: NewPageLoader },
  };
};

export default getPageDataLoadingAPI;
```

### LoadData Function Patterns

**Simple:**
```javascript
export const loadData = (params, search) => dispatch => {
  const pageAsset = { pageName: `content/pages/${ASSET_NAME}.json` };
  return dispatch(fetchPageAssets(pageAsset, true));
};
```

**SDK-based:**
```javascript
export const loadData = (params, search) => (dispatch, getState, sdk) => {
  const { id } = params;
  return Promise.all([
    dispatch(fetchListing(id)),
    dispatch(fetchReviews(id)),
  ]);
};
```

---

## Complete Duck Template

```javascript
// src/ducks/featureName.duck.js OR
// src/containers/PageName/PageName.duck.js

import { storableError } from '../util/errors';
import { customEndpoint } from '../util/api';

// ================ Action types ================ //

export const FETCH_REQUEST = 'app/featureName/FETCH_REQUEST';
export const FETCH_SUCCESS = 'app/featureName/FETCH_SUCCESS';
export const FETCH_ERROR = 'app/featureName/FETCH_ERROR';
export const CLEAR_DATA = 'app/featureName/CLEAR_DATA';

// ================ Initial state ================ //

const initialState = {
  data: null,
  fetchInProgress: false,
  fetchError: null,
};

// ================ Reducer ================ //

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;

  switch (type) {
    case FETCH_REQUEST:
      return { ...state, fetchInProgress: true, fetchError: null };
    case FETCH_SUCCESS:
      return { ...state, fetchInProgress: false, data: payload };
    case FETCH_ERROR:
      console.error(payload);
      return { ...state, fetchInProgress: false, fetchError: payload };
    case CLEAR_DATA:
      return initialState;
    default:
      return state;
  }
}

// ================ Selectors ================ //

export const selectData = state => state.featureName.data;
export const selectFetchInProgress = state => state.featureName.fetchInProgress;

// ================ Action creators ================ //

export const fetchRequest = () => ({ type: FETCH_REQUEST });
export const fetchSuccess = data => ({ type: FETCH_SUCCESS, payload: data });
export const fetchError = error => ({ type: FETCH_ERROR, payload: error, error: true });
export const clearData = () => ({ type: CLEAR_DATA });

// ================ Thunk actions ================ //

export const fetchData = params => (dispatch, getState, sdk) => {
  dispatch(fetchRequest());

  return sdk.resourceName.query(params)
    .then(response => {
      dispatch(fetchSuccess(response.data.data));
      return response;
    })
    .catch(e => {
      dispatch(fetchError(storableError(e)));
      throw e;
    });
};

// ================ Page loadData ================ //

export const loadData = (params, search) => (dispatch, getState, sdk) => {
  dispatch(clearData());
  return dispatch(fetchData(params));
};
```
