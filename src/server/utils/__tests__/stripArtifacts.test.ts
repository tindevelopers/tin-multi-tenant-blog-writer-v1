import { stripArtifacts } from "../stripArtifacts";

const sample = `!<p>Hello #<br><br>World!<br><br>## Heading\n# Another`;

describe("stripArtifacts", () => {
  it("removes LLM artefacts and sanitises", () => {
    const result = stripArtifacts(sample);
    expect(result).not.toMatch(/!<|#</);
    expect(result).not.toMatch(/##/);
  });
});
