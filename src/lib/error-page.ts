export function renderErrorPage(error?: any): string {
  const message = error?.message || (typeof error === 'string' ? error : "Unknown error");
  const stack = error?.stack || "";
  const errorDetailsHtml = error ? `
    <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 0.375rem; padding: 1.5rem; margin-top: 1.5rem; text-align: left; font-family: monospace; font-size: 0.75rem; color: #991b1b; overflow-x: auto; max-width: 100%; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);">
      <strong style="display: block; font-size: 0.85rem; margin-bottom: 0.5rem; color: #7f1d1d;">Server Error: ${message}</strong>
      ${stack ? `<pre style="margin: 0; white-space: pre-wrap; font-size: 0.7rem; color: #b91c1c; line-height: 1.4;">${stack}</pre>` : ''}
    </div>
  ` : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 36rem; width: 100%; text-align: center; padding: 2rem; background: #fff; border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
      ${errorDetailsHtml}
    </div>
  </body>
</html>`;
}
