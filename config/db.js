var firebase = require("firebase/app");

require("firebase/auth");
require("firebase/database");
var { firebaseConfig } = require("./config");

firebase.initializeApp(firebaseConfig);
var database = firebase.database();

module.exports = database;
