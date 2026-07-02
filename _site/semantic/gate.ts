// semantic/gate.ts — bless each rendered post's DOM with lone (semantic HTML + a11y).
// Blocking: any error-severity finding fails CI. Run from the site root after
// `node build.mjs`, with bounded-systems/lone cloned at ./lone.
import { parseHTML } from "linkedom";
import { validate } from "../lone/src/mod.ts";

const DIR = "dist/blog";
let posts = 0, errors = 0, warns = 0;
for await (const e of Deno.readDir(DIR)) {
  if (!e.name.endsWith(".html")) continue;
  posts++;
  const { document } = parseHTML(await Deno.readTextFile(`${DIR}/${e.name}`));
  const subject = document.querySelector("article") ?? document.body;
  const { findings } = await validate(subject);
  const errs = findings.filter((f) => f.severity === "error");
  errors += errs.length;
  warns += findings.length - errs.length;
  if (findings.length) {
    console.log(`\n${e.name} — ${errs.length} error(s), ${findings.length - errs.length} warn(s):`);
    for (const f of findings) console.log(`  [${f.severity}] ${f.code} ${f.path} — ${f.message}`);
  } else console.log(`${e.name} — clean`);
}
console.log(`\nlone: ${posts} post(s) · ${errors} error(s) · ${warns} warn(s)`);
Deno.exit(errors > 0 ? 1 : 0);
