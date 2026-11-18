import { describe, expect, it } from "vitest";

import { highlight } from "./highlight";

describe("highlight", () => {
  it("splits code into comment, string, keyword and plain tokens", () => {
    expect(highlight("import js from \"@eslint/js\";\n// ESLint core\n")).toEqual([
      { type: "keyword", text: "import" },
      { type: "plain", text: " js " },
      { type: "keyword", text: "from" },
      { type: "plain", text: " " },
      { type: "string", text: "\"@eslint/js\"" },
      { type: "plain", text: ";\n" },
      { type: "comment", text: "// ESLint core" },
      { type: "plain", text: "\n" },
    ]);
  });

  it("does not treat a glob or a keyword inside a string as a comment or keyword", () => {
    const tokens = highlight("files: [\"src/**/*.js\", \"//default\"]");

    expect(tokens.filter((token) => token.type !== "plain")).toEqual([
      { type: "string", text: "\"src/**/*.js\"" },
      { type: "string", text: "\"//default\"" },
    ]);
    expect(tokens.map((token) => token.text).join("")).toBe("files: [\"src/**/*.js\", \"//default\"]");
  });
});
