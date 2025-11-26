import z from "zod/v4";

export const sessionIdParamSchema = z.object({
  id: z.string(),
});

export const sessionSchema = {
  deleteById: {
    params: sessionIdParamSchema,
  },
};
