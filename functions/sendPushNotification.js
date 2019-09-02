const webpush = require("web-push");

let privateKey = "iCKuWWUXTHWpgFB5afN5AyZDVGnXmjtFjeXMHA_z0IY";
let publicKey =
  "BFE7GUyRtAmST40rSrpKGaHO3qYSauvwHp5JJH0P2dsmAuCDJJjiKw1PGnkiom9QtQwhUCVCMVYIq_fVjIhCFVM";

const sendPushNotification = async payload => {
  console.log("🐣 Mandando notificación...");
  payload = JSON.stringify(payload);
  webpush.setVapidDetails(
    "mailto:santiagohernandez.1997@gmail.com",
    publicKey,
    privateKey
  );
  let subscripciones = await cck.getSubscripciones();
  subscripciones.forEach(sub => {
    let pushConfig = {
      endpoint: sub.val().endpoint,
      keys: {
        auth: sub.val().keys.auth,
        p256dh: sub.val().keys.p256dh
      }
    };
    webpush
      .sendNotification(pushConfig, payload)
      .then(console.log("✅ Notificación enviada."))
      .catch(err => console.log(err));
  });
};

module.exports = sendPushNotification;
