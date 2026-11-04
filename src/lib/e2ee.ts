// @ts-ignore
import { x25519 } from '@noble/curves/ed25519.js';

const APP_SALT = 'dak_e2ee_v1_2025_stable_key';

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function b64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

const seedCache: Record<string, Uint8Array> = {};

async function deriveStableSeed(uid: string): Promise<Uint8Array> {
  if (seedCache[uid]) return seedCache[uid];

  const ikm = encodeUtf8(uid);
  const salt = encodeUtf8(APP_SALT);
  const info = encodeUtf8('dak_e2ee_x25519_private_key');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(ikm),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(info),
    },
    keyMaterial,
    256
  );

  const seed = new Uint8Array(derivedBits);
  seedCache[uid] = seed;
  return seed;
}

async function tryDecryptWithSecret(
  sharedSecret: Uint8Array,
  nonce: Uint8Array,
  mac: Uint8Array,
  cipherText: Uint8Array
): Promise<string | null> {
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(sharedSecret),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const combined = new Uint8Array(cipherText.length + mac.length);
    combined.set(cipherText);
    combined.set(mac, cipherText.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
      cryptoKey,
      toArrayBuffer(combined)
    );

    return decodeUtf8(new Uint8Array(decrypted));
  } catch (e) {
    return null;
  }
}

export async function decryptAdminMessage(
  senderUid: string,
  receiverPublicKeyB64: string | null | undefined,
  e2eeMessage: string
): Promise<{ text: string; decrypted: boolean }> {
  if (!e2eeMessage.startsWith('E2EE:v1:')) {
    return { text: e2eeMessage, decrypted: false };
  }

  if (!receiverPublicKeyB64) {
    return { text: '(Encrypted - Key missing)', decrypted: false };
  }

  try {
    const parts = e2eeMessage.split(':');
    if (parts.length !== 5) {
      return { text: '(Encrypted - Invalid format)', decrypted: false };
    }

    const nonce = b64ToBytes(parts[2]);
    const mac = b64ToBytes(parts[3]);
    const cipherText = b64ToBytes(parts[4]);

    const senderSeed = await deriveStableSeed(senderUid);
    const receiverPubKey = b64ToBytes(receiverPublicKeyB64);
    const sharedSecret = x25519.getSharedSecret(senderSeed, receiverPubKey);

    const res = await tryDecryptWithSecret(sharedSecret, nonce, mac, cipherText);
    if (res !== null) {
      return { text: res, decrypted: true };
    }
  } catch (e) {
    console.warn('Decryption attempt failed:', e);
  }

  return { text: '(Encrypted payload)', decrypted: false };
}

export async function decryptAdminMessageBidirectional(
  senderUid: string,
  receiverUid: string,
  senderPublicKeyB64: string | null | undefined,
  receiverPublicKeyB64: string | null | undefined,
  e2eeMessage: string
): Promise<{ text: string; decrypted: boolean }> {
  if (!e2eeMessage || !e2eeMessage.startsWith('E2EE:v1:')) {
    return { text: e2eeMessage || '', decrypted: false };
  }

  const parts = e2eeMessage.split(':');
  if (parts.length !== 5) {
    return { text: '(Encrypted - Malformed)', decrypted: false };
  }

  try {
    const nonce = b64ToBytes(parts[2]);
    const mac = b64ToBytes(parts[3]);
    const cipherText = b64ToBytes(parts[4]);

    // Path 1: Sender seed + Receiver pubkey
    if (senderUid && receiverPublicKeyB64) {
      try {
        const senderSeed = await deriveStableSeed(senderUid);
        const receiverPubKey = b64ToBytes(receiverPublicKeyB64);
        const s1 = x25519.getSharedSecret(senderSeed, receiverPubKey);
        const dec1 = await tryDecryptWithSecret(s1, nonce, mac, cipherText);
        if (dec1 !== null) return { text: dec1, decrypted: true };
      } catch (_) {}
    }

    // Path 2: Receiver seed + Sender pubkey
    if (receiverUid && senderPublicKeyB64) {
      try {
        const receiverSeed = await deriveStableSeed(receiverUid);
        const senderPubKey = b64ToBytes(senderPublicKeyB64);
        const s2 = x25519.getSharedSecret(receiverSeed, senderPubKey);
        const dec2 = await tryDecryptWithSecret(s2, nonce, mac, cipherText);
        if (dec2 !== null) return { text: dec2, decrypted: true };
      } catch (_) {}
    }

    // Path 3: Fallback using purely derived public keys (in case DB public key is out of sync)
    if (senderUid && receiverUid) {
      try {
        const senderSeed = await deriveStableSeed(senderUid);
        const receiverSeed = await deriveStableSeed(receiverUid);
        const receiverDerivedPub = x25519.getPublicKey(receiverSeed);
        const s3 = x25519.getSharedSecret(senderSeed, receiverDerivedPub);
        const dec3 = await tryDecryptWithSecret(s3, nonce, mac, cipherText);
        if (dec3 !== null) return { text: dec3, decrypted: true };
      } catch (_) {}
    }
  } catch (e) {
    console.warn('Bidirectional decryption error:', e);
  }

  return { text: '(Encrypted with previous session key)', decrypted: false };
}
