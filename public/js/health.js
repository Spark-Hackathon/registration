const labels = "text-lg font-semibold";
const inputs = "text-xl bg-transparent mt-1 border-4 border-solid border-gray-200 outline-none focus:border-yellow transition duration-200 px-6 md:px-8 py-4 mb-8 appearance-none w-full";
const notes = "text-base text-gray-500 italic";
const spans = "text-red-500 inline-block";
const submitStyle = "block text-center py-4 w-full bg-yellow font-semibold hover:bg-yellow-dark transition duration-200 md:text-xl cursor-pointer";
const form = "md:w-100 md:mx-auto";

let health = new Smartform("/submit-health-forms", "POST");

let allergies = new Field("textarea", "allergies")
    .setLabel("Does your child have any allergies?")
    .addNote("Please provide details about any allergies your child has: food, animals, seasonal, etc. Include reaction details, date, and description.")
    .rows(5)
    .placeholder("Leave blank if not applicable.")
let epipen = new Field("textarea", "epipen")
    .setLabel("Does your child require an EpiPen?")
    .addNote("If so, please provide additional details about your child's allergy and anaphylaxis / allergy action plan.")
    .rows(5)
    .placeholder("Leave blank if not applicable.")
let dietary_restrictions = new Field("textarea", "dietary_restrictions")
    .setLabel("Does your child have any dietary restrictions?")
    .addNote("Please explain; we will forward this information to our dining staff. If you plan to send your child to camp with a packed lunch, please let us know.")
    .rows(5)
    .placeholder("Leave blank if not applicable.")
let acetaminophen = new Field("select", "otc_acetaminophen")
    .addOptions([
        [0, "No"],
        [1, "Yes"]
    ])
    .setLabel("If needed, can we give your child Acetaminophen (Tylenol)?")
let antihistamines = new Field("select", "otc_antihistamines")
    .addOptions([
        [0, "No"],
        [1, "Yes"]
    ])
    .setLabel("If needed, can we give your child Antihistamines (Benadryl, Diphenhydramine)?")
let aspirin = new Field("select", "otc_aspirin")
    .addOptions([
        [0, "No"],
        [1, "Yes"]
    ])
    .setLabel("If needed, can we give your child ASA (Aspirin)?")
let ibuprofen = new Field("select", "otc_ibuprofen")
    .addOptions([
        [0, "No"],
        [1, "Yes"]
    ])
    .setLabel("If needed, can we give your child Ibuprofen (Advil)?")
let sunscreen = new Field("select", "otc_sunscreen")
    .addOptions([
        [0, "No"],
        [1, "Yes"]
    ])
    .setLabel("If needed, can we give your child sunscreen?")
let otc_notes = new Field("textarea", "otc_notes")
    .setLabel("Is there anything staff needs to be aware of when giving any approved OTC medications to your child?")
    .rows(5)
    .placeholder("Leave blank if not applicable.")
let health_history = new Field("textarea", "health_history")
    .setLabel("Please detail any medical information we at Spark should have about your child, including but not limited to: activity restrictions, previous operations, hospitalizations, serious injuries, or communicable disease exposure within the last three months.")
    .rows(5)
    .placeholder("Leave blank if not applicable.")
let doctor_name = new Field("input:text", "doctor_name")
    .require()
    .setLabel("Family Doctor")
    .placeholder("ex. Dr. Mason")
let doctor_phone = new Field("input:tel", "doctor_phone")
    .require()
    .setLabel("Doctor's Phone Number")
    .placeholder("ex. (111) 222-3333")
let insurance_holder = new Field("input:text", "insurance_holder")
    .setLabel("Full name of policy holder")
    .placeholder("Leave blank if not applicable.")
let insurance_company = new Field("input:text", "insurance_company")
    .setLabel("Insurance company / plan name")
    .placeholder("Leave blank if not applicable.")
let insurance_group = new Field("input:text", "insurance_group")
    .setLabel("Insurance group number")
    .placeholder("Leave blank if not applicable.")
let insurance_policy = new Field("input:text", "insurance_policy")
    .setLabel("Insurance policy number")
    .placeholder("Leave blank if not applicable.")
let wavier_accept = new Field("select", "wavier_accept")
    .require()
    .addOptions([
        [0, "No, I do not accept the waiver"],
        [1, "Yes, I do accept the waiver"]
    ])
    .setLabel("Have you read, understand, and agree to abide to our <a class='underline text-yellow py-1 hover:text-yellow-dark transition duration-200' href='https://docs.google.com/document/d/1ytMXuZqaUPhTRz0bU5svxgH9bfZRG22pQfODZh8bIpU/edit#heading=h.fa8ea2qy1eto' target=_blank>medical waiver</a>?")
let cr_accept = new Field("input:text", "cr_accept")
    .require()
    .setLabel("If you accept our <a class='underline text-yellow py-1 hover:text-yellow-dark transition duration-200' href='https://docs.google.com/document/d/1ytMXuZqaUPhTRz0bU5svxgH9bfZRG22pQfODZh8bIpU/edit#heading=h.fa8ea2qy1eto' target=_blank>Consent and Release Agreement</a>, type your full name.")
    .placeholder("ex. John Smith")
let covid_accept = new Field("select", "covid_accept")
    .require()
    .addOptions([
        [0, "I do not accept the COVID-19 Protocols"],
        [1, "I do accept the COVID-19 Protocols"]
    ])
    .setLabel("Have you read, understand, and agree to abide to our <a class='underline text-yellow py-1 hover:text-yellow-dark transition duration-200' id='open-modal'>COVID-19 Protocols</a>?")

let submit = new Field("input:submit", "")
    .value("Upload Information →")
    .class(submitStyle);

const new_medication = () => {
    const template = $("template")[0];
    const med_form = template.content.cloneNode(true);

    $("#meds").append(med_form);
}

$(document).ready(() => {
    health
        .styles(labels, notes, spans, inputs)
        .formStyles(form)
        .addFields([
            allergies,
            epipen,
            dietary_restrictions,
            acetaminophen,
            antihistamines,
            aspirin,
            ibuprofen,
            sunscreen,
            otc_notes,
            health_history,
            doctor_name,
            doctor_phone,
            insurance_holder,
            insurance_company,
            insurance_group,
            insurance_policy,
            wavier_accept,
            cr_accept,
            covid_accept,
            submit
        ])
        .mountTo("#health_form");
    
    const section_template = $("template")[1];
    const section = section_template.content.cloneNode(true);

    $("#dietary_restrictions").after(section);

    $("#new_medication").click(() => {
        new_medication()
    });

    new MutationObserver(e => {
        let added = e[0].addedNodes[1];
        let med_name = $(added).find("#med_name")[0];
        let med;
        
        $(med_name).on("input", () => {
            med = med_name.value;

            $(med_name).prop("name", `${med.toLowerCase()}_medication_name`);
            
            let name_label = $(added).find("label")[0];
            $(name_label).html(`<span class="text-red-500 inline-block">*</span> ${med} Name`);

            let dosage_label = $(added).find("label")[1];
            $(dosage_label).html(`<span class="text-red-500 inline-block">*</span> ${med} Dosage`);

            let dosage_field = $(added).find("input")[1];
            $(dosage_field).prop("name", `${med.toLowerCase()}_medication_dosage`);

            let times_field = $(added).find("input")[2];
            $(times_field).prop("name", `${med.toLowerCase()}_medication_times`);

            let notes = $(added).find("textarea")[0];
            $(notes).prop("name", `${med.toLowerCase()}_medication_notes`);
        });
    }).observe($("#meds")[0], { childList: true });

    $("#covid-19").css("display", "none");

    $("#open-modal").click(() => {
        $("body").css("overflow", "hidden");
        $("#covid-19").css("display", "block");
    });

    $("#close-modal").click(() => {
        $("#covid-19").css("display", "none");
        $("body").css("overflow", "scroll");
    });
});