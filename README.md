# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Gusii HerdCare status

This repository currently contains a synthetic local demonstration of Gusii HerdCare. It is not a production backend: the UI uses browser-local demo persistence and persona selection. Read the [implementation audit](docs/implementation-audit.md) before configuring real users, providers, payments, or health data.

The PostgreSQL baseline is in [schema.sql](schema.sql). The additional required domain tables and their initial RLS policies are in [migrations/0002_required_domain_entities.sql](migrations/0002_required_domain_entities.sql); apply them only after reviewing and testing the base schema in a disposable database. Use [.env.example](.env.example) as the configuration-name inventory. It contains no secrets.

## Documentation

- [System documentation](docs/system-documentation.md): architecture, roles, routes, workflows, data model, configuration, deployment, security, and limitations.
- [Implementation audit](docs/implementation-audit.md): confirmed current-state findings and prioritized production work.
- [Test report](docs/test-report.md): commands run, build/lint/browser results, and remaining coverage.
- [Architecture notes](architecture.md): original prototype architecture reference.
- [Render deployment guide](docs/render-deployment.md): deploy the current frontend and understand the database boundary.

### Environment variables

The active database configuration is one server-side variable: `DATABASE_URL`. Set it in the ignored `.env` file, for example `postgresql://postgres:password@localhost:5432/agriherd`. Run `npm run db:health` to verify connectivity and `npm run db:migrate` to apply the SQL files. Never expose `DATABASE_URL` through `VITE_*` variables.

The SQL schema expects PostgreSQL extensions and Supabase-compatible auth objects. For local development, a local Supabase stack is the safest option; plain PostgreSQL requires equivalent extensions and auth compatibility objects.

### Render deployment

This repository includes [render.yaml](render.yaml) for the current Vite static site. Render builds `dist/` with `npm ci && npm run build`; it does not receive `DATABASE_URL` because the current browser app must not connect directly to PostgreSQL. Follow the [Render deployment guide](docs/render-deployment.md).

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
