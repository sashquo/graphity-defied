# Deployment

The app needs no server, secrets, or environment variables. Vite emits a portable build in `dist/` with relative URLs. Use `npm ci && npm run build` and publish the contents of `dist/`. Serve over HTTPS.

## GitHub Pages

1. Push the source to GitHub.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. Run **Deploy to GitHub Pages** from the **Actions** tab (or push to `main`). The workflow builds and tests the app, then publishes the static artifact.
4. Open the HTTPS URL shown in the deployment job or Pages settings. If adding a custom domain, follow [GitHub Pages' domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) and enable **Enforce HTTPS** after DNS verification.

See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for permissions and plan requirements.

## Netlify or another static host

With Netlify, import the GitHub repository, set the build command to `npm run build`, use Node 22+, and publish `dist`. You can also upload the built `dist` directory to a static host directly. The app has no client-side URL routes, so it requires no rewrite rules. Use the host's custom-domain settings when needed.

For a smoke test, open the HTTPS site, select **Try Demo**, hold W to move, then open **Track Lab** and import a FIT file. The game and Garmin decoder are lazy-loaded from the same site.

