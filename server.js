// import required dependencies
require('dotenv').config();
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");

const { getDate } = require("./utils");
const router = require("./router");

// application setup
app.use(express.static(__dirname + "/public"));
app.use("/", router);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine(".hbs", exphbs({extname: ".hbs"}));
app.set("view engine", ".hbs");
app.set("views", `${__dirname}/views`);

// application routes
app.get("/", (req, res) => {
    res.render("index", {
        "title": `Spark Camp ${getDate()}`
    });
});

app.post("/", (req, res) => res.json(req.body));

app.get("/apply/camper", (req, res) => {
    res.render("apply", {
        "title": `Camper Application for Spark Camp ${getDate()}`,
        "year": getDate()
    });
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

// start application
app.listen(process.env.PORT, () => {
	console.log("server go vroom");
});