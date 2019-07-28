const cck = require("./cck");
const cron = require("node-cron");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const webpush = require("web-push");

let privateKey = "iCKuWWUXTHWpgFB5afN5AyZDVGnXmjtFjeXMHA_z0IY";
let publicKey =
  "BFE7GUyRtAmST40rSrpKGaHO3qYSauvwHp5JJH0P2dsmAuCDJJjiKw1PGnkiom9QtQwhUCVCMVYIq_fVjIhCFVM";

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(express.json());

// Funciones
const scrapeAndSave = async () => {
  let eventos = [];
  await cck.init();
  eventos = await cck.scrapeEventos();
  await cck.guardarEventos(eventos);
  await syncReservasYEventos();
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
        return { ...evento, estado: "agendado" };
      }
      return evento;
    });
  }
  console.log("🐣 Guarrrrdando...");
  await cck.guardarEventos(nuevoArrEventos);
  console.log("🍻 Sincronizado.");
  let payload = {
    title: "Eventos actualizados!",
    content: "Hay nuevos eventos disponibles"
  };
  sendPushNotification(payload);
};
const reservarEntrada = async evento => {
  let reservado = await cck.reservarEntrada(evento);
  await cck.cerrar();
  let payload = reservado
    ? {
        title: "Evento reservado!",
        content: `El evento "${evento.nombre}" reservado.`
      }
    : {
        title: "Error reservando",
        content: `No se pudo reservar el evento "${evento.nombre}"`
      };
  sendPushNotification(payload);
};

const sendPushNotification = async payload => {
  console.log("🐣 Mandando notificación...");
  payload = JSON.stringify(payload);
  webpush.setVapidDetails(
    "mailto:santiagohernandez.1997",
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

// Headers
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Endpoints
app.get("/", async (req, res) => {
  let eventos = await cck.fetchEventos();
  res.json(eventos);
});

app.post("/agendar", async (req, res) => {
  let evento = req.body.evento;
  let result = await cck.agendarReserva(evento);
  res.json(result);
});

app.post("/reservar", async (req, res) => {
  let evento = req.body.evento;
  response = {
    success: true,
    message: "Reservando...",
    evento: { ...evento, estado: "reservado" }
  };
  console.log(evento);
  res.json(response);
  await cck.init();
  reservarEntrada(evento);
});

app.post("/comprar", (req, res) => {
  let evento = req.body.evento;
  res.json({ jaja: "pobre", evento: { ...evento, estado: "comprado" } });
});

app.post("/subscribir", (req, res) => {
  let subscripcion = req.body;
  cck.subscribir(subscripcion);
  res.json({ success: true });
});

// Manual

// scrapeAndSave();
// syncReservasYEventos();
// cck.reservarEntradasAgendadas();

// CRON!
const mainTime = "01 12 * * 2-4";

cron.schedule(
  mainTime,
  async () => {
    console.log("🐣 Reservas!");
    try {
      await cck.reservarEntradasAgendadas();
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },
  {
    timezone: "America/Argentina/Buenos_Aires"
  }
);
let scrapeTime = "05 12 * * *";

cron.schedule(
  scrapeTime,
  async () => {
    console.log("🐣 Scrappin' time!");
    try {
      await scrapeAndSave();
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },
  {
    timezone: "America/Argentina/Buenos_Aires"
  }
);

const port = process.env.PORT || 5000;

app.listen(port, () => console.log("Listening on port", port));
