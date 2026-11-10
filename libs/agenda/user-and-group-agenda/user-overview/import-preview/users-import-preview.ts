import { map, Observable } from 'rxjs';
import { z } from 'zod';
import { FileImportPreview, FileReadResult, readFileAsText } from '@crczp/components';
import { nonBlankStringSchema, parseJsonDocument } from '@crczp/utils';
import { UserImportCardComponent, UserImportSummary } from './user-import-card.component';

const usersDocumentSchema = z.object({ users: z.array(z.unknown()).min(1) });

const userSchema = z.object({
    sub: nonBlankStringSchema,
    iss: nonBlankStringSchema,
    full_name: nonBlankStringSchema.nullable().catch(null).default(null),
});

/** Previews a users import file as one card per listed user. */
export class UsersImportPreview implements FileImportPreview<UserImportSummary> {
    readonly cardComponent = UserImportCardComponent;

    readFile(file: File): Observable<FileReadResult<UserImportSummary>> {
        return readFileAsText(file).pipe(map((text) => this.toResult(text)));
    }

    private toResult(text: string): FileReadResult<UserImportSummary> {
        const parsed = parseJsonDocument(text);
        if ('rejection' in parsed) {
            return parsed;
        }
        const document = usersDocumentSchema.safeParse(parsed.document);
        if (!document.success) {
            return { rejection: 'The file lists no users' };
        }
        const entities: UserImportSummary[] = [];
        for (const [index, listedUser] of document.data.users.entries()) {
            const user = userSchema.safeParse(listedUser);
            if (!user.success) {
                return { rejection: `User ${index + 1} has no subject or issuer` };
            }
            entities.push({ sub: user.data.sub, issuer: user.data.iss, fullName: user.data.full_name });
        }
        return { entities };
    }
}
