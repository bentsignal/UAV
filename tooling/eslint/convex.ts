import * as path from "node:path";
import type { Rule } from "eslint";
import { defineConfig } from "eslint/config";

const noHyphenatedFilesRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow hyphenated Convex source filenames.",
    },
    messages: {
      noHyphenatedFiles:
        "Convex files cannot use hyphens. Replace hyphens with underscores.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename;
        const basename = path.basename(filename, path.extname(filename));
        if (!basename.includes("-")) return;

        context.report({
          node,
          messageId: "noHyphenatedFiles",
        });
      },
    };
  },
} satisfies Rule.RuleModule;

const PUBLIC_CONSTRUCTORS = new Set(["action", "mutation", "query"]);

const requireAuthedFunctionsRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require UAV public Convex functions to use owner-authenticated wrappers.",
    },
    messages: {
      requireAuthedFunction:
        "Use the owner-authenticated wrapper from the shared functions module instead of raw `{{ name }}`.",
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          typeof node.source.value !== "string" ||
          !node.source.value.endsWith("_generated/server")
        ) {
          return;
        }
        if (path.basename(context.filename) === "functions.ts") return;

        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported =
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value;
          if (
            typeof imported !== "string" ||
            !PUBLIC_CONSTRUCTORS.has(imported)
          ) {
            continue;
          }

          context.report({
            data: { name: imported },
            messageId: "requireAuthedFunction",
            node: specifier,
          });
        }
      },
    };
  },
} satisfies Rule.RuleModule;

export const convexConfig = defineConfig({
  files: ["src/**/*.{ts,tsx,js,jsx}"],
  plugins: {
    convexLocal: {
      rules: {
        "no-hyphenated-files": noHyphenatedFilesRule,
        "require-authed-functions": requireAuthedFunctionsRule,
      },
    },
  },
  rules: {
    "convexLocal/no-hyphenated-files": "error",
    "convexLocal/require-authed-functions": "error",
  },
});
