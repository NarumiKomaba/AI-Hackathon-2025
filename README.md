This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🧪 End-to-End Testing

We use [Playwright](https://playwright.dev/) for E2E testing to ensure the "AI Council Room" and other core features work seamlessly.

### How to Run Tests
1. **Install Browsers** (First time only):
   ```bash
   npx playwright install
   ```
2. **Execute Tests**:
   ```bash
   npm run test:e2e
   ```
   *Note: The test script automatically starts the development server if it's not already running.*

## 📚 Documentation

For a deep dive into the project's architecture, AI prompt engineering, and the "Explosive Speed" design philosophy, please refer to our detailed documentation:

- [**Detailed Design Document**](./doc/detailed_design.md) - Includes multi-agent system design, prompt strategies (Fact Projection, Breakthrough), and absolute parsing logic.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
