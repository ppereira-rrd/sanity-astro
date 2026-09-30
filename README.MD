# Sanity + Astro Demo

A simple demo project using **Astro** and **Sanity**.

https://sanity-astro-kappa.vercel.app/

## Project Structure

```text
SANITY-ASTRO/
├── astro-demo/       # Astro frontend
└── studio-demo/      # Sanity Studio
```

### Astro

The `astro-demo` folder contains the website frontend.

```text
astro-demo/
├── public/
├── src/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

### Sanity

The `studio-demo` folder contains the Sanity Studio, including schemas and CMS configuration.

```text
studio-demo/
├── schemaTypes/
├── static/
├── sanity.config.ts
├── sanity.cli.ts
├── package.json
└── tsconfig.json
```

## Requirements

* Node.js 22+
* npm
* A Sanity project

Check your Node.js version:

```bash
node -v
```

## Installation

Install the dependencies for both projects.

### Astro

```bash
cd astro-demo
npm install
```

### Sanity Studio

From the project root:

```bash
cd studio-demo
npm install
```

## Running the Projects

### Start Astro

```bash
cd astro-demo
npm run dev
```

Astro will normally run at:

```text
http://localhost:4321
```

### Start Sanity Studio

In a separate terminal:

```bash
cd studio-demo
npm run dev
```

Sanity Studio will normally be available at:

```text
http://localhost:3333
```

## Environment Variables

The Astro project can use environment variables to connect to Sanity.

Create:

```text
astro-demo/.env
```

Example:

```env
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
```

Replace the values with your Sanity project information.

## How It Works

```text
Sanity Studio
      ↓
   Sanity API
      ↓
   Astro
      ↓
   Website
```

Content is created and managed in Sanity Studio. Astro retrieves that content through the Sanity API and uses it to generate the website.

## Useful Commands

### Astro

```bash
npm run dev
npm run build
npm run preview
```

### Sanity

```bash
npm run dev
npm run build
```

## Notes

This is a demo project for learning and experimenting with **Astro + Sanity**.

The Astro frontend and Sanity Studio are intentionally kept as separate projects so they can be developed and deployed independently.
