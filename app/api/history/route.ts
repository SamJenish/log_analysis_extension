import { NextRequest, NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/token-validation";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Validate Bearer token from extension
    const userId = await validateBearerToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - invalid or missing token" },
        { status: 401 }
      );
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // Get total count
    const total = await prisma.historyEntry.count({
      where: { userId },
    });

    // Get paginated entries
    const entries = await prisma.historyEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        logInput: true,
        result: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch history",
      },
      { status: 500 }
    );
  }
}
