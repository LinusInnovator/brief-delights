import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const { url, founderEmail, autoSend } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
    }

    const projectRoot = path.resolve(process.cwd(), "..");
    const pythonScript = path.join(projectRoot, "execution", "generate_cobranded_pitch.py");

    let cmd = `python3 "${pythonScript}" --url "${url}"`;
    if (founderEmail) {
      cmd += ` --email "${founderEmail}"`;
    }
    if (autoSend) {
      cmd += ` --auto-send`;
    }

    const { stdout, stderr } = await execPromise(cmd, { cwd: projectRoot, timeout: 45000 });

    const cleanDomain = url.replace(/^https?:\/\//, "").replace("www.", "").split("/")[0];
    const slug = cleanDomain.replace(/[^a-z0-9]/gi, "").toLowerCase();

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      slug: slug,
      previewUrl: `/previews/${slug}.html`,
      output: stdout,
      message: `Live discovery & co-branded pitch generated for ${cleanDomain}`
    });
  } catch (err: any) {
    console.error("❌ Live Pitch Generation API Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute live discovery engine" },
      { status: 500 }
    );
  }
}
