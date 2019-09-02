const cck = require("../cck");
const sendPushNotification = require("../functions/sendPushNotification");

const reservarEntrada = async evento => {
  let reservado = await cck.reservarEntrada(evento);
  await cck.cerrar();
  let payload = reservado
    ? {
        title: "Evento reservado!",
        content: `El evento "${evento.nombre}" fue reservado.`
      }
    : {
        title: "Error reservando",
        content: `No se pudo reservar el evento "${evento.nombre}"`
      };
  sendPushNotification(payload);
};

exports.getEventos = async (req, res) => {
  let eventos = await cck.fetchEventos();
  res.json(eventos);
};

exports.postAgendar = async (req, res) => {
  let evento = req.body.evento;
  let result = await cck.agendarReserva(evento);
  res.json(result);
};

exports.postReservar = async (req, res) => {
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
};

exports.postComprar = (req, res) => {
  let evento = req.body.evento;
  res.json({ jaja: "pobre", evento: { ...evento, estado: "comprado" } });
};

exports.postSubscribir = (req, res) => {
  let subscripcion = req.body;
  cck.subscribir(subscripcion);
  res.json({ success: true });
};
