import { createNetworkConstants } from 'Src/utils';

export const REGISTER = createNetworkConstants('REGISTER');
export const LOGIN = createNetworkConstants('LOGIN');
export const SET_PASSWORD = createNetworkConstants('SET_PASSWORD');
export const FORGOT_PASSWORD = createNetworkConstants('FORGOT_PASSWORD');
export const SETUP = createNetworkConstants('SETUP');
export const OAUTH_DATA = createNetworkConstants('OAUTH_DATA');
export const REGISTER_EMAIL = createNetworkConstants('REGISTER_EMAIL');
export const LOGOUT = createNetworkConstants('LOGOUT');

export const VERIFY_EMAIL = {
  REQUEST: 'VERIFY_EMAIL.REQUEST'
};

export const SETUP_REFILL = 'SETUP_REFILL';
export const SETUP_FILLED = 'SETUP_FILLED';

export const SNACKBAR = {
  INFO: 'SNACKBAR.INFO',
  SUCCESS: 'SNACKBAR.SUCCESS',
  DANGER: 'SNACKBAR.DANGER',
  CLEAR: 'SNACKBAR.CLEAR'
};
