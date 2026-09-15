import { TenraiProvider } from "./tenrai";

async function main() {
  const provider = new TenraiProvider();

  console.log("\n--- TRENDING ---");

  const trending = await provider.getTrending();

  console.log(
    trending.slice(0, 3),
  );

console.log("\n--- TRENDING #2 ---");

const second = await provider.getTrending();

console.log(
  second.slice(0, 3),
);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});