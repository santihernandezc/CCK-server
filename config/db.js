// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
var firebase = require("firebase/app");

// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/database");
var {firebaseConfig} = require('./config')
 
 // Initialize Firebase
 firebase.initializeApp(firebaseConfig);
  // Get a reference to the database service
  var database = firebase.database();


  module.exports = database;