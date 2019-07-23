const cck = require("./cck");
const cron = require("node-cron");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "eventos.json"));
});

const fetchAndSave = async () => {
  let eventos = [];
  await cck.init();
  eventos = await cck.fetchEventos();
  cck.guardarEventos(eventos);
  cck.cerrar();
};

// fetchAndSave();

const time = "01 12 * * 2";

cron.schedule(
  time,
  () => {
    console.log("🐣 Running the cron!");
    fetchAndSave();
  },
  {
    timezone: "America/Argentina/Buenos_Aires"
  }
);

app.listen(process.env.PORT || 5000);
