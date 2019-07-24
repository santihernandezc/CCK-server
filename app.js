const cck = require("./cck");
const cron = require("node-cron");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", async (req, res) => {
  let eventos = await cck.fetchEventos();
  res.json(eventos);
});

// app.get('/reservar', (req, res) => {
//   res.send("<h1>Reservar</h1>")
//   console.log('reservar')
// })
// app.get('/reservar/:id', (req, res) => {
//   res.send("<h1>Reservar "+req.params.id+"</h1>")
//   console.log(req.params.id)
// })

const scrapeAndSave = async () => {
  let eventos = [];
  await cck.init();
  eventos = await cck.scrapeEventos();
  cck.guardarEventos(eventos);
  cck.cerrar();
};

scrapeAndSave();

const time = "01 12 * * 2";

cron.schedule(
  time,
  async () => {
    console.log("🐣 Running the cron!");
    try {
      await scrapeAndSave();
    } catch (err) {
      console.log(err.message);
    }
  },
  {
    timezone: "America/Argentina/Buenos_Aires"
  }
);

const port = process.env.PORT || 5000;

app.listen(port, () => console.log("Listening on port", port));
