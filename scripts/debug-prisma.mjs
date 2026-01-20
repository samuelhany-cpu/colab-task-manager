import { Prisma } from "@prisma/client";

console.log(
  "User fields:",
  Prisma.dmmf.datamodel.models
    .find((m) => m.name === "User")
    ?.fields.map((f) => f.name),
);
