const admin = require('firebase-admin');

const serviceAccount = require('./adminCred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://notificationtest-87069.firebaseio.com/"
});

module.exports = admin;