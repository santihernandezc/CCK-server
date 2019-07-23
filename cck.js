const puppeteer = require("puppeteer");
const fs = require("fs");

let browser = null;
let page = null;
const arrRequests = ["image", "stylesheet", "font"];
const url = "http://www.cck.gob.ar/reservas";

const cck = {
  init: async () => {
    try {
      console.log("🐣 Iniciando...");
      browser = await puppeteer.launch({ headless: false });
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

  fetchEventos: async () => {
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
          let href = link.href;
          let nombre = link.innerText;
          let gratis = null;
          let agotado = null;
          let proximamente = null;
          let entrada = "";
          if (entradaEstado) {
            if (!/Comprar/.test(entradaEstado.innerText)) {
              entrada = "Gratis";
            } else if (/Agotadas/.test(entradaEstado.innerText)) {
              entrada = "Agotada";
            } else if (/Proximamente/.test(entradaEstado.innerText)) {
              entrada = "Proximamente";
            } else {
              entrada = "Paga";
            }
          }

          arrEventos.push({
            nombre,
            href,
            fecha,
            entrada
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

      await fs.writeFileSync("./eventos.json", JSON.stringify(eventos));
      console.log("🍻 Eventos guardados!");
    } catch (err) {
      console.log("💩 ERROR!", err.message);
    }
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
