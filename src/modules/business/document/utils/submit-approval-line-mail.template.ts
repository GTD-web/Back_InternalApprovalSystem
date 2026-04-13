import { readFile } from 'fs/promises';
import { join } from 'path';

let 캐시된템플릿문자열: string | null = null;

/**
 * `templates/submit-approval-line.mail.html` 기반 결재선 상신 안내 메일 HTML
 */
export async function submitApprovalLineMailHtml을생성한다(params: {
    escapeHtml: (plain: string) => string;
    drafterName: string;
    documentTitle: string;
    documentId: string;
    portalHomeUrl: string;
}): Promise<string> {
    if (!캐시된템플릿문자열) {
        const path = join(__dirname, '..', 'templates', 'submit-approval-line.mail.html');
        캐시된템플릿문자열 = await readFile(path, 'utf-8');
    }

    const { escapeHtml, drafterName, documentTitle, documentId, portalHomeUrl } = params;

    return 캐시된템플릿문자열.replace(/__DRAFTER_NAME__/g, escapeHtml(drafterName))
        .replace(/__DOCUMENT_TITLE__/g, escapeHtml(documentTitle))
        .replace(/__DOCUMENT_ID__/g, escapeHtml(documentId))
        .replace(/__PORTAL_URL__/g, portalHomeUrl);
}
