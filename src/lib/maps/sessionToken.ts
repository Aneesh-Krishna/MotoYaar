let _token: google.maps.places.AutocompleteSessionToken | null = null;

export function getSessionToken(): google.maps.places.AutocompleteSessionToken {
  if (!_token) {
    _token = new google.maps.places.AutocompleteSessionToken();
  }
  return _token;
}

/**
 * Returns the current token and resets state so the next getSessionToken()
 * creates a fresh token. Call this immediately before placesService.getDetails()
 * to correctly close the billing session.
 */
export function consumeSessionToken(): google.maps.places.AutocompleteSessionToken {
  const token = getSessionToken();
  _token = null;
  return token;
}
