/**
 * The pages every generator iterates. `depth` is the number of directories
 * below the site root; `page` is the value of <body data-page>.
 */
export const PAGES = [
  { file: "index.html", page: "home", depth: 0 },
  { file: "plumb-line/index.html", page: "plumb-line", depth: 1 },
  { file: "privacy/index.html", page: "privacy", depth: 1 },
];

/** Relative prefix that reaches the site root from a page at `depth`. */
export function rootFor(depth) {
  return depth === 0 ? "./" : "../".repeat(depth);
}
