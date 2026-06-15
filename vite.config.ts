// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeCasingPlugin = () => ({
  name: 'normalize-casing',
  async resolveId(source, importer, options) {
    if (source.includes('\0')) return null;
    const normalizedImporter = importer ? importer.replace(/^C:/i, 'c:') : importer;
    const resolved = await this.resolve(source, normalizedImporter, { skipSelf: true, ...options });
    if (resolved && resolved.id) {
      resolved.id = resolved.id.replace(/^C:/i, 'c:');
      return resolved;
    }
    return resolved;
  }
});

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    tsr: {
      autoCodeSplitting: false,
    },
  },
  vite: {
    plugins: [normalizeCasingPlugin()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
});
