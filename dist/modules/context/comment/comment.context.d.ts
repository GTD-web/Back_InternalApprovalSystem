import { DomainCommentService } from '../../domain/comment/comment.service';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
export declare class CommentContext {
    private readonly commentService;
    private readonly documentService;
    private readonly employeeService;
    private readonly approvalStepSnapshotService;
    private readonly logger;
    constructor(commentService: DomainCommentService, documentService: DomainDocumentService, employeeService: DomainEmployeeService, approvalStepSnapshotService: DomainApprovalStepSnapshotService);
    코멘트를작성한다(params: {
        documentId: string;
        authorId: string;
        content: string;
        parentCommentId?: string;
    }): Promise<import("../../domain").Comment>;
    코멘트를수정한다(params: {
        commentId: string;
        authorId: string;
        content: string;
    }): Promise<import("../../domain").Comment>;
    코멘트를삭제한다(commentId: string, authorId: string): Promise<import("../../domain").Comment>;
    문서의코멘트를조회한다(documentId: string): Promise<import("../../domain").Comment[]>;
    코멘트를조회한다(commentId: string): Promise<import("../../domain").Comment>;
}
