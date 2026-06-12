import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { log } = await request.json();

    if (!log || typeof log !== "string") {
      return NextResponse.json(
        { error: "Log content is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `Analyze the following deployment/CI-CD log and identify any failures, errors, or issues. Provide a concise summary of what went wrong and suggest remediation steps if applicable.

Log content:
\`\`\`
${log}
\`\`\`

Please provide:
1. Summary of the issue (if any)
2. Root cause analysis
3. Recommended remediation steps`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    return NextResponse.json({
      result: analysis,
      success: true,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze log content",
      },
      { status: 500 }
    );
  }
}
