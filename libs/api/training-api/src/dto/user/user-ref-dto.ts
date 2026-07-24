import { z } from 'zod';

export const UserRefDtoSchema = z.object({
    user_ref_id: z.number(),
    sub: z.string(),
    given_name: z.string(),
    family_name: z.string(),
    picture: z.string(),
    mail: z.string(),
});

export type UserRefDTO = z.infer<typeof UserRefDtoSchema>;
