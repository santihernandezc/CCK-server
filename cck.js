const puppeteer = require("puppeteer");
const db = require("./config/db");

let browser = null;
let page = null;
const arrRequests = ["image", "stylesheet", "font"];
const url = "http://www.cck.gob.ar/reservas";

const cck = {
  init: async () => {
    try {
      console.log("🐣 Iniciando...");
      browser = await puppeteer.launch({ headless: true });
      page = await browser.newPage();
      await page.setViewport({
        width: 1639,
        height: 722,
        deviceScaleFactor: 1
      });
      page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36"
      );

      await page.setRequestInterception(true);
      page.on("request", request => {
        if (arrRequests.includes(request.resourceType())) request.abort();
        else {
          request.continue();
        }
      });
      console.log("✅ Iniciado.");
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  scrapeEventos: async () => {
    try {
      console.log("🐣 Cargando...");

      await page.goto(url);
      await page.waitForSelector("#list-reservas > article");
      console.log("✅ Página cargada.");

      console.log("🐣 Juntando eventos...");
      eventos = await page.evaluate(() => {
        let boxes = document.querySelectorAll("#list-reservas > article");

        let arrEventos = [];
        let i = 0;
        for (let box of boxes) {
          let link = box.querySelector(".art-desc h3 a");
          let fecha = box.querySelector(".art-desc > span")
            ? box.querySelector(".art-desc > span").innerText
            : "";
          let entradaEstado = box.querySelector(".event-reservar");
          let imagen = box
            .querySelector(".art-img > a > img")
            .getAttribute("src");
          let href = link.href;
          let nombre = link.innerText;
          let gratis = null;
          let agotado = null;
          let proximamente = null;
          let entrada = "";
          if (entradaEstado) {
            if (/Comprar/.test(entradaEstado.innerText)) {
              entrada = "Paga";
            } else if (/agotadas/.test(entradaEstado.innerText)) {
              entrada = "Agotadas";
            } else if (/Próximamente/.test(entradaEstado.innerText)) {
              entrada = "Próximamente";
            } else {
              entrada = "Gratis";
            }
          }

          arrEventos.push({
            nombre,
            href,
            fecha,
            entrada,
            imagen,
            reservado: false
          });
        }
        return arrEventos;
      });
      console.log("✅ Eventos listos.");
      return eventos;
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  guardarEventos: async eventos => {
    try {
      console.log("🐣 Guarrrrdando...");

      await db.ref("/cck/dataEventos").set({
        eventos,
        lastUpdate: new Date().getTime()
      });
      console.log("🍻 Eventos guardados!");
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  fetchEventos: async () => {
    let datos = await db.ref("cck/dataEventos/eventos").once("value");
    return datos.val();
  },

  fetchEvento: async id => {
    let datos = await db.ref(`cck/dataEventos/eventos/${id}`).once("value");
    return datos.val();
  },

  guardarReserva: async evento => {
    console.log("🐣 Guarrrrdando...");
    try {
      await db.ref("/cck/reservasPendientes").push({ ...evento });
      console.log("🍻 Reserva guardada!");
      console.log("🐣 Fetcheando...");
      let datos = await db
        .ref(`cck/dataEventos/eventos/${evento.id}`)
        .once("value");
      let eventoAUpdatear = datos.val();
      console.log("🐣 Updateando...");
      let updates = {};
      updates["/eventos/" + evento.id] = {
        ...eventoAUpdatear,
        reservado: true
      };
      await db.ref("/cck/dataEventos").update(updates);
      console.log("🍻 Updateado!");
      return {
        guardado: true,
        evento
      };
    } catch (err) {
      console.log("💩 ERROR!", err.message);
      return {
        guardado: false,
        evento
      };
    }
  },

  fetchReservasPendientes: async () => {
    let reservasPendientes = await db
      .ref("cck/reservasPendientes")
      .once("value");
    return reservasPendientes.val();
  },

  reservarEntradas: async () => {
    let reservasPendientes = this.fetchReservasPendientes();
    console.log(reservasPendientes);
  },

  cerrar: async () => {
    try {
      browser.close();
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  }
};

module.exports = cck;
