import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
if (!existsSync(path.join(root, ".next/standalone/server.js"))) {
  throw new Error("Run npm run build without SITE_STATIC_EXPORT first to generate the Azure standalone server.");
}
const stage = path.join(root, "azure-dist");
// This is generated build output. Keep old route caches and removed chunks out
// of subsequent deployments, even when their route keys are unchanged.
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
cpSync(path.join(root, ".next/standalone"), stage, { recursive: true });
mkdirSync(path.join(stage, ".next"), { recursive: true });
cpSync(path.join(root, ".next/static"), path.join(stage, ".next/static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(stage, "public"), { recursive: true });
const archive = path.join(root, "evergarden-azure.zip");
// The archive is generated from scratch to avoid retaining removed entries.
execFileSync("python3", ["-c", "import pathlib,sys,zipfile; root=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(root)) for p in root.rglob('*') if p.is_file()]; z.close()", stage, archive], { stdio: "inherit" });
console.log(`Azure deployment ZIP: ${archive}`);
console.log("Startup command: node server.js; App setting: HOSTNAME=0.0.0.0; Node runtime: 24 LTS");
