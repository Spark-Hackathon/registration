// import required dependencies
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");

const { makeRandomUsername } = require("./utils");

// application setup
app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine(".hbs", exphbs({extname: ".hbs"}));
app.set("view engine", ".hbs");
app.set("views", `${__dirname}/views`);

// summer camp year
const get_year = () => new Date().getFullYear().toString().substr(-2);

// application routes
app.get("/", (req, res) => {
    res.render("index", {
        "title": `Spark Camp '${get_year()}`
    });
});

// start application
app.listen(8080);