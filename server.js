// import required dependencies
require('dotenv').config({path: __dirname + "/.env"});
const express = require("express");
const app = express();

const fetch = require("node-fetch");

const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");

const { getDate, utilities } = require("./utils");
const router = require("./router");
const client = require("./client_status");

const Airbrake = require("@airbrake/node");
const airbrakeExpress = require("@airbrake/node/dist/instrumentation/express");

const airbrake = new Airbrake.Notifier({
	projectId: 328702,
	projectKey: "1fa4f064e141600f3164192a6d4210cb"
});

app.use(airbrakeExpress.makeMiddleware(airbrake));

// application setup
app.use(express.static(__dirname + "/public"));
app.use("/", router);
app.use("/", client);
app.use("/", utilities);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine(".hbs", exphbs({extname: ".hbs"}));
app.set("view engine", ".hbs");
app.set("views", `${__dirname}/views`);

// application routes
app.get("/", (req, res) => {
    fetch(`http://localhost:${process.env.PORT}/open-weeks`)
        .then(response => response.json())
        .then(weeks => {
            res.render("index", {
                "title": `Spark Camp ${getDate()}`,
                weeks
            });
        })
        .catch(err => console.error(err));
});

app.post("/", (req, res) => res.json(req.body));

app.get("/apply/camper", (req, res) => {
    fetch(`http://localhost:${process.env.PORT}/open-weeks`)
        .then(response => response.json())
        .then(weeks => {
            res.render("apply", {
                "title": `Camper Application for Spark Camp ${getDate()}`,
                "year": getDate(),
                weeks
            });
        })
        .catch(err => console.error(err));
});

app.get("/apply/updates", (req, res) => {
    res.render("updates", {
        "title": `Get Updates for Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/about-us", (req, res) => {
    res.render("about_us", {
        "title": `About Us`
    });
});

app.get("/apply/thank-you", (req, res) => {
    res.render("thank_you_apply", {
        "title": `Thank You – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/updates/thank-you", (req, res) => {
    res.render("thank_you_updates", {
        "title": `Thank You – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/admin", (req, res) => {
    res.render("admin", {
        "title": `Admin – Spark Camp ${getDate()}`,
        "layout": false,
        "year": getDate()
    });
});

app.get("/unsubscribe", (req, res) => {
    res.render("unsubscribe", {
        "title": `Unsubscribe – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/health", (req, res) => {
    res.render("health", {
        "title": `Health & Medication – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/consent-release", (req, res) => {
    res.render("consent_release", {
        "title": `Consent & Release – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.use(airbrakeExpress.makeErrorHandler(airbrake));

app.use((error, req, res, next) => {
	console.log("RUNNING ERROR");
	console.error(error, error.message);
	res.render("error", {
		title: `Help! – Spark Camp ${getDate()}`,
		error: error.message
	})
});

// start application
app.listen(process.env.PORT, () => {
	console.log("server go vroom");
});
