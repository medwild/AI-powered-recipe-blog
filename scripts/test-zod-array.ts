import { z } from "zod";

const s = z.object({
  arr: z.array(z.string()).min(8).max(15),
});

const def = (s as any)._def;
const shape = typeof def.shape === "function" ? def.shape() : def.shape;
const arrDef = (shape.arr as any)._def;

for (const c of arrDef.checks) {
  const zod = c._zod;
  console.log("constructor:", c.constructor?.name);
  console.log("  _zod keys:", Object.keys(zod));
  for (const key of Object.getOwnPropertyNames(zod)) {
    console.log(`  _zod.${key}:`, zod[key]);
  }
}
