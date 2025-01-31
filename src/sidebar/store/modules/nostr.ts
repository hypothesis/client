import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';

import { createStoreModule, makeAction } from '../create-store';

export type NostrProfile = {
  publicKeyHex: string;
  displayName?: string;
  picture?: string;
  loading: boolean;
};

export type State = {
  privateKey: Uint8Array | null;
  publicKeyHex: string | null;
  connectMode: 'nsec' | 'bunker' | 'nostr-connect';
  profile: NostrProfile | null;
};

const initialState: State = {
  privateKey: null,
  publicKeyHex: null,
  connectMode: 'nsec',
  profile: null,
};

const reducers = {
  SET_PRIVATE_KEY_HEX(state: State, action: { privateKeyHex: string | null }) {
    const privateKey = action.privateKeyHex
      ? hexToBytes(action.privateKeyHex)
      : null;

    return {
      ...state,
      privateKeyHex: action.privateKeyHex,
      privateKey,
      publicKeyHex: privateKey ? getPublicKey(privateKey) : null,
    };
  },
  SET_PRIVATE_KEY(state: State, action: { privateKey: Uint8Array | null }) {
    return { ...state, privateKey: action.privateKey };
  },
  SET_PUBLIC_KEY_HEX(state: State, action: { publicKeyHex: string | null }) {
    return { ...state, publicKeyHex: action.publicKeyHex };
  },
  SET_CONNECT_MODE(
    state: State,
    action: { connectMode: 'nsec' | 'bunker' | 'nostr-connect' },
  ) {
    return { ...state, connectMode: action.connectMode };
  },
  SET_PROFILE(state: State, action: { profile: NostrProfile | null }) {
    return { ...state, profile: action.profile };
  },
  SET_PROFILE_LOADING(state: State, action: { loading: boolean }) {
    if (!state.profile) {
      return state;
    }
    return {
      ...state,
      profile: { ...state.profile, loading: action.loading },
    };
  },
};

function setPrivateKey(privateKey: Uint8Array | null) {
  return makeAction(reducers, 'SET_PRIVATE_KEY', { privateKey });
}

function setPublicKeyHex(publicKeyHex: string | null) {
  return makeAction(reducers, 'SET_PUBLIC_KEY_HEX', { publicKeyHex   });
}

function setConnectMode(connectMode: 'nsec' | 'bunker' | 'nostr-connect') {
  return makeAction(reducers, 'SET_CONNECT_MODE', { connectMode });
}

function setProfile(profile: NostrProfile | null) {
  return makeAction(reducers, 'SET_PROFILE', { profile });
}

function setProfileLoading(loading: boolean) {
  return makeAction(reducers, 'SET_PROFILE_LOADING', { loading });
}

function getPublicKeyHex(state: State) {
  return state.publicKeyHex;
}

function getPrivateKey(state: State) {
  return state.privateKey;
}

function getConnectMode(state: State) {
  return state.connectMode;
}

function getProfile(state: State) {
  return state.profile;
}

function isProfileLoading(state: State) {
  return state.profile?.loading ?? false;
}

export const nostrModule = createStoreModule(initialState, {
  namespace: 'nostr',
  reducers,
  actionCreators: {
    setPrivateKey,
    setPublicKeyHex,
    setConnectMode,
    setProfile,
    setProfileLoading,
  },
  selectors: {
    getPrivateKey,
    getPublicKeyHex,
    getConnectMode,
    getProfile,
    isProfileLoading,
  },
});
