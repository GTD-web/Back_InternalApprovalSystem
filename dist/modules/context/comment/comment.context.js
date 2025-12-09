"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommentContext_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentContext = void 0;
const common_1 = require("@nestjs/common");
const comment_service_1 = require("../../domain/comment/comment.service");
const document_service_1 = require("../../domain/document/document.service");
const employee_service_1 = require("../../domain/employee/employee.service");
const approval_step_snapshot_service_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.service");
const approval_enum_1 = require("../../../common/enums/approval.enum");
let CommentContext = CommentContext_1 = class CommentContext {
    constructor(commentService, documentService, employeeService, approvalStepSnapshotService) {
        this.commentService = commentService;
        this.documentService = documentService;
        this.employeeService = employeeService;
        this.approvalStepSnapshotService = approvalStepSnapshotService;
        this.logger = new common_1.Logger(CommentContext_1.name);
    }
    async 코멘트를작성한다(params) {
        this.logger.log(`코멘트 작성 시작: 문서 ${params.documentId}`);
        await this.documentService.findOneWithError({
            where: { id: params.documentId },
        });
        await this.employeeService.findOneWithError({
            where: { id: params.authorId },
        });
        const approvalSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId: params.documentId },
        });
        const isAuthorized = approvalSteps.some((step) => step.approverId === params.authorId &&
            (step.stepType === approval_enum_1.ApprovalStepType.AGREEMENT || step.stepType === approval_enum_1.ApprovalStepType.APPROVAL));
        if (!isAuthorized) {
            throw new common_1.ForbiddenException('해당 문서의 합의자 또는 결재자만 코멘트를 작성할 수 있습니다');
        }
        if (params.parentCommentId) {
            const parentComment = await this.commentService.findOneWithError({
                where: { id: params.parentCommentId },
            });
            if (parentComment.documentId !== params.documentId) {
                throw new common_1.BadRequestException('부모 코멘트가 다른 문서에 속해 있습니다');
            }
        }
        const savedComment = await this.commentService.createComment(params);
        this.logger.log(`코멘트 작성 완료: ${savedComment.id}`);
        return savedComment;
    }
    async 코멘트를수정한다(params) {
        this.logger.log(`코멘트 수정 시작: ${params.commentId}`);
        const comment = await this.commentService.findOneWithError({
            where: { id: params.commentId },
        });
        if (comment.authorId !== params.authorId) {
            throw new common_1.BadRequestException('본인의 코멘트만 수정할 수 있습니다');
        }
        const updatedComment = await this.commentService.updateComment(comment, params.content);
        this.logger.log(`코멘트 수정 완료: ${params.commentId}`);
        return updatedComment;
    }
    async 코멘트를삭제한다(commentId, authorId) {
        this.logger.log(`코멘트 삭제 시작: ${commentId}`);
        const comment = await this.commentService.findOneWithError({
            where: { id: commentId },
        });
        if (comment.authorId !== authorId) {
            throw new common_1.BadRequestException('본인의 코멘트만 삭제할 수 있습니다');
        }
        const deletedComment = await this.commentService.deleteComment(comment);
        this.logger.log(`코멘트 삭제 완료: ${commentId}`);
        return deletedComment;
    }
    async 문서의코멘트를조회한다(documentId) {
        this.logger.debug(`문서 코멘트 조회: ${documentId}`);
        await this.documentService.findOneWithError({
            where: { id: documentId },
        });
        const comments = await this.commentService.findAll({
            where: { documentId },
            relations: ['author', 'replies', 'replies.author'],
            order: {
                createdAt: 'ASC',
                replies: {
                    createdAt: 'ASC',
                },
            },
        });
        const topLevelComments = comments.filter((comment) => !comment.parentCommentId);
        return topLevelComments;
    }
    async 코멘트를조회한다(commentId) {
        this.logger.debug(`코멘트 조회: ${commentId}`);
        const comment = await this.commentService.findOneWithError({
            where: { id: commentId },
            relations: ['author', 'document', 'parentComment', 'replies'],
        });
        return comment;
    }
};
exports.CommentContext = CommentContext;
exports.CommentContext = CommentContext = CommentContext_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [comment_service_1.DomainCommentService,
        document_service_1.DomainDocumentService,
        employee_service_1.DomainEmployeeService,
        approval_step_snapshot_service_1.DomainApprovalStepSnapshotService])
], CommentContext);
//# sourceMappingURL=comment.context.js.map