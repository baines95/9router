import { describe, it, expect } from "vitest";

import { FORMATS } from "../../src/lib/open-sse/translator/formats.js";
import { translateRequest } from "../../src/lib/open-sse/translator/index.js";

describe("RTK translator integration", () => {
  it("compresses large tool_result content but keeps normal user text unchanged", () => {
    const largeToolOutput = [
      "1. first line",
      "2. second line",
      "3. third line",
      "4. fourth line",
      "5. fifth line",
      "6. sixth line",
      "7. seventh line",
      "8. eighth line",
    ].join("\n");

    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "keep this normal user text" },
            {
              type: "tool_result",
              tool_use_id: "tool_1",
              content: largeToolOutput,
            },
          ],
        },
      ],
    };

    const result = translateRequest(
      FORMATS.OPENAI,
      FORMATS.OPENAI,
      "gpt-4o",
      JSON.parse(JSON.stringify(body)),
      true,
      null,
      "openai"
    );

    const content = result.messages[0].content;
    const textPart = content.find((p) => p.type === "text");
    const toolPart = content.find((p) => p.type === "tool_result");

    expect(textPart.text).toBe("keep this normal user text");
    expect(toolPart.content).not.toBe(largeToolOutput);
    expect(typeof toolPart.content).toBe("string");
    expect(toolPart.content.length).toBeGreaterThan(0);
  });

  it("does not modify tool_result when is_error is true", () => {
    const errOutput = "error tool output should stay untouched";
    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_2",
              is_error: true,
              content: errOutput,
            },
          ],
        },
      ],
    };

    const result = translateRequest(
      FORMATS.OPENAI,
      FORMATS.OPENAI,
      "gpt-4o",
      JSON.parse(JSON.stringify(body)),
      true,
      null,
      "openai"
    );

    expect(result.messages[0].content[0].content).toBe(errOutput);
  });

  it("fails open and preserves original tool_result when filter cannot process content", () => {
    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_3",
              content: { value: 1n },
            },
          ],
        },
      ],
    };

    const result = translateRequest(
      FORMATS.OPENAI,
      FORMATS.OPENAI,
      "gpt-4o",
      body,
      true,
      null,
      "openai"
    );

    expect(result.messages[0].content[0].content).toEqual({ value: 1n });
  });

  it("compresses successful role tool messages", () => {
    const largeToolOutput = [
      "1. first line",
      "2. second line",
      "3. third line",
      "4. fourth line",
      "5. fifth line",
      "6. sixth line",
      "7. seventh line",
      "8. eighth line",
    ].join("\n");

    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "tool",
          tool_call_id: "call_1",
          content: largeToolOutput,
        },
      ],
    };

    const result = translateRequest(
      FORMATS.OPENAI,
      FORMATS.OPENAI,
      "gpt-4o",
      JSON.parse(JSON.stringify(body)),
      true,
      null,
      "openai"
    );

    expect(result.messages[0].content).not.toBe(largeToolOutput);
    expect(result.messages[0].content).toContain("RTK compressed");
  });

  it("does not rewrite short enumerated tool output when nothing would be omitted", () => {
    const shortEnumeratedOutput = [
      "1. first line",
      "2. second line",
      "3. third line",
      "4. fourth line",
      "5. fifth line",
      "6. sixth line",
    ].join("\n");

    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "tool",
          tool_call_id: "call_2",
          content: shortEnumeratedOutput,
        },
      ],
    };

    const result = translateRequest(
      FORMATS.OPENAI,
      FORMATS.OPENAI,
      "gpt-4o",
      JSON.parse(JSON.stringify(body)),
      true,
      null,
      "openai"
    );

    expect(result.messages[0].content).toBe(shortEnumeratedOutput);
  });
});
