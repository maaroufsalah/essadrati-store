// Checks that the kit guard rails catch what they are meant to catch,
// and let the allowed patterns through.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { guardRules } from "../eslint/guards.js";

const linter = new Linter({ configType: "flat" });
const config = [
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: guardRules,
  },
];

const errorsFor = (code) => linter.verify(code, config, { filename: "sample.tsx" });

const rejected = [
  ['<div className="ml-4" />', "physical margin"],
  ['<div className="md:pr-2 flex" />', "physical padding with variant"],
  ['<div className="text-left" />', "physical text alignment"],
  ['<div className="rounded-tl-lg" />', "physical corner"],
  ['const c = "left-0 top-0";', "physical inset"],
  ['<div className="bg-red-500" />', "palette color"],
  ['<div className="text-white" />', "palette white"],
  ['const s = { color: "#E9B44C" };', "hex color"],
  ["const s = `rgb(0 0 0)`;", "rgb color"],
  ["const el = <p>Hello</p>;", "english copy"],
  ["const el = <p>اطلب الآن</p>;", "arabic copy"],
  ['<img alt="Honey" src={src} />', "copy in alt"],
];

const accepted = [
  ['<div className="ms-4 pe-2 start-0 text-start rounded-s-lg" />', "logical properties"],
  ['<div className="bg-primary text-primary-fg border-border" />', "theme tokens"],
  ['<div className="shadow-soft rounded-card" />', "theme shadow and radius"],
  ['const el = <p>{t("cta")}</p>;', "translated copy"],
  ['<img alt={t("alt")} src={src} />', "translated alt"],
  ['const href = "/p/honey#reviews";', "url fragment"],
  ['const cls = "translate-x-1 overflow-left-hidden";', "unrelated words"],
];

for (const [code, label] of rejected) {
  test(`rejects ${label}`, () => {
    assert.ok(errorsFor(code).length > 0, `expected an error for: ${code}`);
  });
}

for (const [code, label] of accepted) {
  test(`accepts ${label}`, () => {
    const errors = errorsFor(code);
    assert.equal(errors.length, 0, errors.map((e) => e.message).join("\n"));
  });
}
