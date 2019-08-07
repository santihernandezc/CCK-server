const router = require("express").Router();
const cck = require("../cck");
const cckController = require("../controllers/cck");

// Endpoints;
router.get("/", cckController.getEventos);

router.post("/agendar", cckController.postAgendar);

router.post("/reservar", cckController.postReservar);

router.post("/comprar", cckController.postComprar);

router.post("/subscribir", cckController.postSubscribir);

module.exports = router;
