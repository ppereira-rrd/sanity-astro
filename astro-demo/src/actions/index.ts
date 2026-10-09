// https://docs.astro.build/en/guides/actions/
// https://docs.astro.build/en/reference/modules/astro-zod/
import { defineAction } from "astro:actions";
import { z } from "astro/zod";

export const server = {
  defaultForm: defineAction({
    accept: "form",
    input: z.object({
      name: z.string(),
      email: z.email(),
      phone: z
        .string()
        .regex(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/, {
          message: "Invalid phone number format",
        }),
      message: z.string(),
      terms: z.boolean(),
    }),
    handler: async ({ name, email, phone, message, terms }) => {
      /* ... */
    },
  }),
};
