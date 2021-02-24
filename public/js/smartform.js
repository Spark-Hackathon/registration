const parseFieldTag = (field_type, name) => {
    if(field_type.includes(":")) {
        let type = field_type.substring(6);
        return `<input type="${type}" name="${name}" id="${name}" />`;
    }

    return `<${field_type} name="${name}" id="${name}"></${field_type}>`;
}

class Smartform {
    constructor(action, method) {
        this.action = action;
        this.method = method;

        this.label_styles = null;
        this.note_styles = null;
        this.span_styles = null;
        this.input_styles = null;

        this.form = $(`<form action="${this.action}" method="${this.method}"></form>`);
    }

    mountTo = (mount_location) => {
        $(`${mount_location}`).append(this.form);
    }

    styles = (labels, notes, spans, inputs) => {
        this.label_styles = labels;
        this.note_styles = notes;
        this.span_styles = spans;
        this.input_styles = inputs;

        return this;
    }

    formStyles = (styles) => {
        this.form.prop("class", styles);
        return this;
    }

    addFields = (fields) => {
        for(let field of fields) {
            let label = field.label.prop("class", this.label_styles);
            let input = field.field;

            if(!(input.attr("type") == "submit")) {
                input.prop("class", this.input_styles);
            }

            $(label).find("span").prop("class", this.span_styles);

            this.form.append(label);
            if(field.note) {
                let note = field.note.prop("class", this.note_styles);
                this.form.append(note);
            }
            this.form.append(input);
        }

        return this;
    }
}

class Field {
    constructor(field_type, name) {
        this.field_type = field_type;
        this.name = name;

        this.field = $(parseFieldTag(this.field_type, this.name));
        this.label = $(`<label for="${this.name}"></label>`);
        this.note = $("<p></p>");
    }

    removeType = () => {
        this.field.removeAttr("type");
        return this;
    }

    multiple = () => {
        this.field.prop("multiple", "true");
        return this;
    }

    setSelectize = () => {
        this.field.selectize({ maxItems: 3 });
        return this;
    }

    removeName = () => {
        this.field.removeAttr("name");
        return this;
    }

    addNote = (note_text) => {
        this.note.text(note_text);
        return this;
    }

    list = (identifier) => {
        this.field.attr("list", identifier);
        return this;
    }

    require = () => {
        this.field.attr("required", true);
        return this;
    }

    id = (identifier) => {
        this.field.attr("id", identifier);
        this.label.attr("for", identifier);
        return this;
    }

    class = (name) => {
        this.field.attr("class", name);
        return this;
    }

    size = (n) => {
        this.field.attr("size", `${n}`);
        return this;
    }

    placeholder = (text) => {
        this.field.attr("placeholder", text);
        return this;
    }

    value = (value) => {
        this.field.attr("value", value);
        return this;
    }

    pattern = (value) => {
        this.field.attr("pattern", value);
        return this;
    }

    setLabel = (text) => {
        const requiredState = this.field.attr("required");
        const state = (typeof requiredState !== typeof undefined && requiredState !== false) ? true : false;

        if(state) {
            this.label.append("<span>*</span> ");
        }

        this.label.append(text);
        return this;
    }

    addOptions = (values) => {
        for(let value of values) {
            let option = $("<option></option>");

            if(typeof value === "string") {
                option.prop("value", value);
                option.html(`${value} ▾`);
            } else {
                option.prop("value", value[0]);
                option.html(`${value[1]} ▾`);
            }

            this.field.append(option);
        }

        return this;
    }
}