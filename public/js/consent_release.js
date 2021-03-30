const labels = "text-lg font-semibold";
const inputs = "text-xl bg-transparent mt-1 border-4 border-solid border-gray-200 outline-none focus:border-yellow transition duration-200 px-6 md:px-8 py-4 mb-8 appearance-none w-full";
const notes = "text-base text-gray-500 italic";
const spans = "text-red-500 inline-block";
const submitStyle = "block text-center py-4 w-full bg-yellow font-semibold hover:bg-yellow-dark transition duration-200 md:text-xl cursor-pointer";
const form = "md:w-100 md:mx-auto";

let consent_release = new Smartform("/consent-and-release", "POST");

let cr_accept = new Field("input:text", "cr_accept")
    .require()
    .setLabel("If you accept our <a class='underline text-yellow py-1 hover:text-yellow-dark transition duration-200' href='https://docs.google.com/document/d/1ytMXuZqaUPhTRz0bU5svxgH9bfZRG22pQfODZh8bIpU/edit#heading=h.fa8ea2qy1eto' target=_blank>Consent and Release Agreement</a>, type your full name.")
    .placeholder("ex. John Smith");
let submit = new Field("input:submit", "")
    .value("Sign Agreement →")
    .class(submitStyle);

$(document).ready(() => {
    const search_params = new URLSearchParams(window.location.search);
    
    if(search_params.has("camper_id")) {
        let camper_id = new Field("input:hidden", "camper_id")
            .value(search_params.get("camper_id"))

        consent_release
            .styles(labels, notes, spans, inputs)
            .formStyles(form)
            .addFields([
                camper_id,
                cr_accept,
                submit
            ])
            .mountTo("#cr_application");
    } else {
        alert("ERROR: No camper_id detected. ERR:NCI");
    }
});