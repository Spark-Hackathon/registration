const labels = "text-sm font-semibold";
const inputs = "bg-transparent mt-1 border-2 border-solid border-gray-200 outline-none focus:border-black transition duration-200 px-4 py-2 mb-8 appearance-none w-full";
const notes = "text-sm text-gray-600 italic";
const spans = "text-red-500 inline-block";
const submitStyle = "w-full p-4 font-semibold bg-yellow-300 cursor-pointer hover:bg-yellow-500 hover:text-white transition duration-200 rounded-lg";
const form = "lg:w-96 lg:mx-auto";

let updates = new Smartform("/", "POST");

let firstName = new Field("input:text", "first_name")
    .require()
    .setLabel("First Name")
    .placeholder("ex. Tanjiro");
let lastName = new Field("input:text", "last_name")
    .require()
    .setLabel("Last Name")
    .placeholder("ex. Kamado");
let email = new Field("input:email", "email")
    .require()
    .setLabel("Email Address")
    .placeholder("kamado@tanjiro.com");
let submit = new Field("input:submit", "")
    .value("Apply for Summer Spark")
    .class(submitStyle);

updates
    .styles(labels, notes, spans, inputs)
    .formStyles(form)
    .addFields([
        firstName,
        lastName,
        email,
        submit
    ])
    .mountTo("#updates_application");