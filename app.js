const cck = require("./cck");
const cron = require("node-cron");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(express.json());

const scrapeAndSave = async () => {
  let eventos = [];
  await cck.init();
  eventos = await cck.scrapeEventos();
  cck.guardarEventos(eventos);
  cck.cerrar();
};
const syncReservasYEventos = async () => {
  console.log("🐣 Fetcheando reservas...");
  let reservas = await cck.fetchReservasPendientes();
  console.log("🐣 Fetcheando eventos...");
  let eventos = await cck.fetchEventos();
  console.log("🐣 Procesando...");
  let keys = Object.keys(reservas);
  let arrReservas = [];
  for (let key of keys) {
    arrReservas.push(reservas[key]);
  }
  keys = Object.keys(eventos);
  let arrEventos = [];
  for (let key of keys) {
    arrEventos.push(eventos[key]);
  }
  let nuevoArrEventos = [];
  for (let reserva of arrReservas) {
    nuevoArrEventos = arrEventos.map(evento => {
      if (reserva.nombre === evento.nombre && reserva.fecha === evento.fecha) {
        return { ...evento, reservado: true };
      }
      return evento;
    });
  }
  console.log("🐣 Guarrrrdando...");
  cck.guardarEventos(nuevoArrEventos);
};

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

app.post("/", async (req, res) => {
  let evento = req.body;
  console.log(evento);
  let result = await cck.guardarReserva(evento);
  res.json(result);
});

// scrapeAndSave();
// syncReservasYEventos();

const time = "01 12 * * 3";

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
