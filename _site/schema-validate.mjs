// Minimal, dependency-free JSON Schema validator — enough for the keywords our
// vendored contracts use: type, properties, items, required, enum, pattern,
// additionalProperties (bool/schema), and $ref into #/definitions. `format` is
// accepted but not enforced (advisory). Returns an array of error strings (empty
// = valid). Matches the repo's no-dependency, hand-rolled-contract convention.

const typeOk = (t, v) => {
  switch (t) {
    case "string": return typeof v === "string";
    case "number": return typeof v === "number";
    case "integer": return Number.isInteger(v);
    case "boolean": return typeof v === "boolean";
    case "object": return v !== null && typeof v === "object" && !Array.isArray(v);
    case "array": return Array.isArray(v);
    case "null": return v === null;
    default: return true;
  }
};
const kindOf = (v) => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;

export function validateSchema(rootSchema, data) {
  const errors = [];
  const resolve = (schema) => {
    let s = schema, guard = 0;
    while (s && s.$ref && guard++ < 16) {
      const path = s.$ref.replace(/^#\//, "").split("/");
      s = path.reduce((node, p) => node?.[p], rootSchema) ?? {};
    }
    return s;
  };

  const walk = (schema, v, path) => {
    schema = resolve(schema);
    if (!schema || typeof schema !== "object") return;
    const at = path || "/";

    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((t) => typeOk(t, v))) {
        errors.push(`${at}: expected ${types.join("|")}, got ${kindOf(v)}`);
        return; // type wrong — deeper checks would be noise
      }
    }
    if (schema.enum && !schema.enum.some((e) => e === v)) errors.push(`${at}: ${JSON.stringify(v)} not in enum`);
    if (typeof v === "string" && schema.pattern && !new RegExp(schema.pattern).test(v)) {
      errors.push(`${at}: "${v}" does not match pattern ${schema.pattern}`);
    }

    if (typeOk("object", v)) {
      const props = schema.properties || {};
      for (const req of schema.required || []) if (!(req in v)) errors.push(`${at}: missing required "${req}"`);
      for (const [k, val] of Object.entries(v)) {
        if (props[k]) walk(props[k], val, `${at === "/" ? "" : at}/${k}`);
        else if (schema.additionalProperties === false) errors.push(`${at}: unexpected property "${k}"`);
        else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
          walk(schema.additionalProperties, val, `${at === "/" ? "" : at}/${k}`);
        }
      }
    }
    if (typeOk("array", v) && schema.items) v.forEach((item, i) => walk(schema.items, item, `${at === "/" ? "" : at}[${i}]`));
  };

  walk(rootSchema, data, "");
  return errors;
}
