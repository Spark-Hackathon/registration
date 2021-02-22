const labels = "text-lg font-semibold";
const inputs = "text-xl bg-transparent mt-1 border-4 border-solid border-gray-200 outline-none focus:border-yellow transition duration-200 px-6 md:px-8 py-4 mb-8 appearance-none w-full";
const notes = "text-base text-gray-500 italic";
const spans = "text-red-500 inline-block";
const submitStyle = "block text-center py-4 w-full bg-yellow font-semibold hover:bg-yellow-dark transition duration-200 md:text-xl cursor-pointer";
const form = "md:w-100 md:mx-auto";

let updates = new Smartform("/signup-prospect", "POST");

let name = new Field("input:text", "name")
    .require()
    .setLabel("Full Name")
    .placeholder("ex. Dakota Jones");
let email = new Field("input:email", "email")
    .require()
    .setLabel("Email Address")
    .placeholder("dakota@jones.com");
let submit = new Field("input:submit", "")
    .value("Get Updates →")
    .class(submitStyle);

updates
    .styles(labels, notes, spans, inputs)
    .formStyles(form)
    .addFields([
        name,
        email,
        submit
    ])
    .mountTo("#updates_application");