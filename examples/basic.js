import { shipIt } from "@deployanyway/ship-it-meter";

console.log(
  shipIt({
    tests: 125,
    failingTests: 2,
    coverage: 82,
    day: "Friday",
    branch: "main",
    build: true,
  }),
);
