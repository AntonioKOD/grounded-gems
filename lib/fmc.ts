import admin from 'firebase-admin';

if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  admin.initializeApp({
    credential: admin.credential.cert(svc),
  });
}

export async function sendFCMToToken(token: string, title: string, body: string, data?: Record<string, string>) {
  return admin.messaging().send({
    token,
    notification: { title, body },
    data,
    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
  });
}

export async function sendFCMToTopic(topic: string, title: string, body: string, data?: Record<string, string>) {
  return admin.messaging().send({
    topic,
    notification: { title, body },
    data,
    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
  });
}
