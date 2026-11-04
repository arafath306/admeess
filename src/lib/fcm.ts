import { SignJWT } from 'jose';

export async function getFCMToken() {
  const serviceAccount = {
    "type": "service_account",
    "project_id": "pigeon-ngst",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDC5+uJEL/rHy0U\nO3WeLV4HJjtYBst1HJFFX94CU0xBk+yo9fi5GoXPryK2tZzJEI/xAf7nNdeCE64s\nN2zau4i3S0Jadl5/MgVfpfFVjoQi3iTMeGg8FXP2nTyII2fUJMbqwyn3vjSYJJ08\nN3NrdiJ44w3W2c5jEzccVmyuz+5yESssiZ2+HhTBjlg5HIk8mUtGP7oAa6ReDyI/\nicDL9NaBvHrstzEKuGRo3KV2Ckk9qfaK6SzhJ9KWfuQ4M//laCifyoNnJfmARN6W\nDWWW/oObMRlmZpawEd8jeuxHYdEh+vxGiXMoYLE4YCjM4Ok6d638TvByfvGYlSer\nkWctRSTDAgMBAAECggEAF93ASLtlVMwvf++7+k+B2QxEbgX++esymrUfgVdj2g/c\nBeCAwWHPCtxeOtNITJKbnZ5p8TP1nLb+N+ndiXc3SYKMsHkYHykn4Ut3nsthwMdE\n6EjCMsFJvuQIGn+DYkXSmcKmK/D9jbfGDS6ZEoqXtAfRlQJ8tEMRF4Y5rrpFb3AV\n6kPdGokwwjbROZqqgJo2g4dIv4omZ6o/6CboKjx4BSRp3Ce26FqZvjYifVFHkQVI\nlapHOdz5PKpXBD9hFDWm9P1gfLKkhXqlcvQ3rN5StLdqCtuP0IGRuoc9Dd23XHUS\naMIiS0BXXL2RDFxy3jbtA2kDIOBJrQXRwBRxB6vmMQKBgQDv3iQMNod57Nd9HxYo\nmcZWGGwGL/VRbcTxLlEiCLHIFdqmjzb+bE05h0PSBt6VxQDSa6wCz8nG++f/2Zjz\nT9uy7M5AFUO/noBhj9qeDAVfwHLNeNjHuO1rypy+vwN0SVwEmMgWVkHSn+xYg1/p\ni54T6kU8eLCd5EpMmFDCctfB2wKBgQDQA6lQHwqmFC1yfLIwbRTDrY/v87cdgvJR\n6Wpf4fYzR1erUsORtiLg2LuLAZGP/RVsYLwRNoZdN2SYbZYP8mMclMPhQYPDJSK5\nZHFItFkT71jcfdHcvoHQt1uPNUaOy+ksACscRi+AfKtkBQ/XTtYuZWysKe4lV9yF\nEz8TrIVhOQKBgQDYW/0T7xOgTJvKxoGMObiG7Bx0MEoNGwArs+WG12TU37GLz16B\ne1rk6zeneH7JhRtKschD+P0+OPZ49uNZhMzcxXD8qLGlY+jVF5bQPHOUfNiQsdKH\nxCyTr/xWqaEKASm5E75XN5LD03CyHj4jQMZjnEq7UvmsUcEa+cDOxBwNRQKBgQC7\nISAWyOYeg/ZikRUIBYlxg1kChyBLdzqhP7eHbFK8zMhsgncXRV/ZIICOy6l0fDvi\nlJ97aK61exiPG76st+Q7mQUiRnrPej/jwh07R6r/CQnKyZGa4PMNnXXLviSsX3pz\nL++Ybvdawky5HOikS/LYKDv8IXhwtbrXKHpNK52N2QKBgQDNBMge/74TvhBKbFOY\n+l/CWJMrfENTHA0/KewZYTVfLtyIDU2gEHJ5L/kjzT1eG/ODlchMBMDPly4j69L5\n599TSrbE4m4cwcLLxqE8QT2Ntq1hdGcANt0XTdSf3pHNTmkDChE0s8rqJduqI5ZF\n/uiMDuHJ85LPQEiCEtWNEoeObg==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@pigeon-ngst.iam.gserviceaccount.com"
  };

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  };

  try {
    const privateKeyObj = await crypto.subtle.importKey(
      'pkcs8',
      str2ab(serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const jwt = await new SignJWT(payload)
      .setProtectedHeader(header)
      .sign(privateKeyObj as any);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("FCM Token Error:", error);
    return null;
  }
}

function str2ab(str: string) {
  const binary_string = window.atob(str);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface SendPushOptions {
  tag?: string;
  channelId?: string;
  type?: string;
  payload?: string;
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  options?: SendPushOptions
) {
  try {
    const accessToken = await getFCMToken();
    if (!accessToken) throw new Error("Failed to get FCM Access Token");

    const channelId = options?.channelId || 'pigeon_activity';
    const tag = options?.tag || 'dak_broadcast';

    const message: any = {
      message: {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          title,
          body,
          type: options?.type || 'activity',
          channel_id: channelId,
          tag: tag,
          payload: options?.payload || '',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: channelId,
            tag: tag, // Automatically replaces duplicate alerts on Android OS
          }
        },
        apns: {
          headers: {
            "apns-collapse-id": tag, // Replaces duplicate alerts on iOS
          },
          payload: {
            aps: {
              sound: 'default',
            }
          }
        }
      }
    };

    const response = await fetch('https://fcm.googleapis.com/v1/projects/pigeon-ngst/messages:send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`FCM Error: ${JSON.stringify(errorData)}`);
    }

    return true;
  } catch (error) {
    console.error("Push send error:", error);
    return false;
  }
}
