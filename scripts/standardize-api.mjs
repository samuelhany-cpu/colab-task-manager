import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const apiDir = path.join(rootDir, "app", "api");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith("route.ts")) {
      results.push(file);
    }
  });
  return results;
}

const routes = walk(apiDir);

routes.forEach((routePath) => {
  let content = fs.readFileSync(routePath, "utf8");
  let originalContent = content;

  // Remove legacy imports
  content = content.replace(
    /import { getServerSession } from "next-auth\/next";\n?/g,
    "",
  );
  content = content.replace(
    /import { authOptions } from "@\/lib\/auth";\n?/g,
    "",
  );

  // Ensure getCurrentUser is imported if needed, and remove partial NextAuth imports if left
  if (
    content.includes("getCurrentUser") &&
    !content.includes("import { getCurrentUser }")
  ) {
    content =
      `import { getCurrentUser } from "@/lib/supabase/server";\n` + content;
  }

  // Cleanup double newlines if imports were removed
  content = content.replace(/\n\n\n/g, "\n\n");

  if (content !== originalContent) {
    console.log(`Updated: ${path.relative(rootDir, routePath)}`);
    fs.writeFileSync(routePath, content);
  }
});

console.log("API Standardization Complete.");
