export const sqlStatements = Object.fromEntries(
  Object
    .entries(import.meta.glob<string>('./*.sql', {eager:true, query:"?raw", import: "default"}))
    .map(([k,v]) => [k.replace(/\.sql$/, "").replace(/^\.\//,""), v])
);
