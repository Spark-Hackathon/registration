// import required dependencies
require('dotenv').config();
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");

const { makeRandomUsername } = require("./utils");
const router = require("./router");

// application setup
app.use(express.static("public"));
app.use("/", router);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine(".hbs", exphbs({extname: ".hbs"}));
app.set("view engine", ".hbs");
app.set("views", `${__dirname}/views`);

// application routes
app.get("/", (req, res) => {
    res.render("index", {
        "title": `Spark Camp '${new Date().getFullYear().toString().substr(-2)}`
    });
});

// start application
app.listen(process.env.PORT, () => {
	console.log("server go vroom");
});