import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    const pythonScript = path.join(projectRoot, "execution", "scout_ripe_prospects.py");

    const { stdout } = await execPromise(`python3 "${pythonScript}"`, { cwd: projectRoot, timeout: 45000 });

    return NextResponse.json({
      success: true,
      stdout: stdout,
      message: "Scouted ripe business prospects live via Discovery Engine"
    });
  } catch (err: any) {
    console.error("❌ Scout Leads API Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute prospect scout engine" },
      { status: 500 }
    );
  }
}
