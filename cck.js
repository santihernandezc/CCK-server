const puppeteer = require("puppeteer");
const db = require("./config/db");
const config = require("./config/config");

let browser = null;
let page = null;
const arrRequests = ["image", "stylesheet", "font"];
const url = "http://www.cck.gob.ar/reservas";

const cck = {
  //  SCRAPING  //

  async init() {
    try {
      console.log("🐣 Iniciando...");
      browser = await puppeteer.launch({
        // Dev
        // headless: false
        // Prod
        args: ["--headless", "--no-sandbox", "--disable-setuid-sandbox"]
      });
      page = await browser.newPage();
      await page.setViewport({
        width: 1639,
        height: 722,
        deviceScaleFactor: 1
      });
      page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36"
      );
      // Más rápido
      await page.setRequestInterception(true);
      page.on("request", request => {
        if (arrRequests.includes(request.resourceType())) request.abort();
        else {
          request.continue();
        }
      });
      console.log("✅ Iniciado.");

      console.log("🐣 Cargando...");
      await page.goto(url);
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  // Scrapear eventos
  async scrapeEventos() {
    try {
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
            imagen
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

  async encontrarLinkEvento(evento) {
    try {
      await page.waitForSelector("#list-reservas > article");
      console.log("✅ Página cargada.");
      let link = await page.evaluate(({ nombre, fecha }) => {
        let boxes = Array.from(
          document.querySelectorAll("#list-reservas > article")
        );

        let matchedEvent = boxes.filter(
          box =>
            box.querySelector(".art-desc h3 a").innerText === nombre &&
            box.querySelector(".art-desc > span").innerText === fecha
        );
        let link = matchedEvent[0]
          .querySelector(".event-reservar a")
          .getAttribute("href");
        return link;
      }, evento);
      await page.goto(link);
      console.log("🐣 Cargando...");
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  async cerrar() {
    try {
      browser.close();
      console.log("✅ Navegador cerrado.");
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  // DB

  //Eventos
  async guardarEventos(eventos) {
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

  async fetchEventos() {
    let datos = await db.ref("cck/dataEventos/eventos").once("value");
    return datos.val();
  },

  async fetchEvento(id) {
    let datos = await db.ref(`cck/dataEventos/eventos/${id}`).once("value");
    return datos.val();
  },

  //Reservas

  async agendarReserva(evento) {
    console.log("🐣 Agendando...");
    try {
      await db.ref("/cck/reservas/pendientes").push({ ...evento });
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
        estado: "agendado"
      };
      await db.ref("/cck/dataEventos").update(updates);
      console.log("🍻 Updateado!");
      return {
        evento: {
          ...evento,
          estado: "agendado"
        }
      };
    } catch (err) {
      console.log("💩 ERROR!", err.message);
      return evento;
    }
  },

  async fetchReservasPendientes() {
    let reservasPendientes = await db
      .ref("cck/reservas/pendientes")
      .once("value");
    return reservasPendientes.val();
  },
  async fetchReservaPendiente(id) {
    let reservaPendiente = await db
      .ref(`/cck/reservas/pendientes/${id}`)
      .once("value");
    return reservaPendiente.val();
  },

  async reservarEntradasAgendadas() {
    try {
      let reservasPendientes = await this.fetchReservasPendientes();
      let keys = Object.keys(reservasPendientes);
      if (keys.length > 0) {
        let arrEventos = [];
        for (let key of keys) {
          reservasPendientes[key].id = key;
          arrEventos.push(reservasPendientes[key]);
        }
        for (let evento of arrEventos) {
          await this.init();
          let reservado = await this.reservarEntrada(evento);
          if (reservado) {
            console.log("🐣 Removiendo evento pendiente...");
            let reserva = await this.fetchReservaPendiente(evento.id);
            await db.ref("/cck/reservas/reservadas").push({ ...reserva });
            await db.ref(`/cck/reservas/pendientes/${evento.id}`).remove();
            console.log("✅ Evento removido.");
            console.log("🐣 Updateando...");
            let eventoAUpdatear = await db
              .ref(`cck/dataEventos/eventos/${evento.id}`)
              .once("value");
            let updates = {};
            updates["/eventos/" + evento.id] = {
              ...eventoAUpdatear,
              estado: "reservado"
            };
            await db
              .ref(`/cck/dataEventos/eventos/${evento.id}`)
              .update(updates);
            console.log("✅ Evento actualizado.");
          } else {
            console.log("💩 ERROR!", "No se pudo reservar");
          }

          await this.cerrar();
        }
      }
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
  },

  async reservarEntrada(evento) {
    try {
      await this.encontrarLinkEvento(evento);
      await page.waitForSelector("#c_personas");
      console.log("✅ Página cargada.");

      console.log("🐣 Eligiendo...");
      let horario = await page.$eval(
        "#c_horario option:last-of-type",
        el => el.value
      );
      await page.select("#c_horario", horario);
      await page.select("#c_personas", "2");
      await page.click("#ticketReservationButton");
      console.log("✅ Opciones elegidas.");
      console.log("🐣 Ingresando datos...");
      await page.waitForSelector("#inputEmail");
      await page.type("#inputEmail", config.cck.email);
      await page.type("input[type='password']", config.cck.password);
      await page.click("#login-button");
      console.log("✅ Datos ingresados.");
      console.log("🐣 Terminando...");
      await page.waitForSelector(
        '.form-check-input[type="radio"]:first-of-type'
      );
      await page.click('.form-check-input[type="radio"]:first-of-type');
      await page.click("#confirm-order-button");
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      console.log("🍻 Reservado!");
      console.log("🐣 Updateando...");
      let updates = {};
      updates["/eventos/" + evento.id] = {
        ...eventoAUpdatear,
        estado: "reservado"
      };
      await db.ref("/cck/dataEventos").update(updates);
      console.log("🍻 Updateado!");
      return true;
    } catch (err) {
      console.log("💩 ERROR!", err.message);
      return false;
    }
  }
};

module.exports = cck;
