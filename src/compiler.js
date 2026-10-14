/**
 * Token compiler – replaces {key} placeholders in a template string
 * with values from a variables object.
 *
 * Example:
 *   compileTemplate("Hello {name}, class {class}", { name: "Alex", class: "10" })
 *   → "Hello Alex, class 10"
 */
function compileTemplate(templateString, variablesObj) {
    if (!templateString) return '';
    let output = String(templateString);
    const vars = variablesObj && typeof variablesObj === 'object' ? variablesObj : {};

    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        output = output.replace(regex, value != null ? String(value) : '');
    }
    return output;
}

module.exports = compileTemplate;
