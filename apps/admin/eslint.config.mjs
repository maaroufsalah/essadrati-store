import { defineConfig } from "eslint/config";
import { react } from "@nocido/config/eslint/react";

export default defineConfig({ ignores: [".medusa/**"] }, react);
