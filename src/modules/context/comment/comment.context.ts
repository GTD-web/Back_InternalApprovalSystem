import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DomainCommentService } from '../../domain/comment/comment.service';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { ApprovalStepType } from '../../../common/enums/approval.enum';

/**
 * 코멘트 컨텍스트
 *
 * 역할:
 * - 코멘트 작성, 수정, 삭제
 * - 문서별 코멘트 조회
 */
@Injectable()
export class CommentContext {
    private readonly logger = new Logger(CommentContext.name);

    constructor(
        private readonly commentService: DomainCommentService,
        private readonly documentService: DomainDocumentService,
        private readonly employeeService: DomainEmployeeService,
        private readonly approvalStepSnapshotService: DomainApprovalStepSnapshotService,
    ) {}

    /**
     * 코멘트를 작성한다
     * 해당 문서의 합의자(AGREEMENT) 또는 결재자(APPROVAL)만 코멘트 작성 가능
     */
    async 코멘트를작성한다(params: {
        documentId: string;
        authorId: string;
        content: string;
        parentCommentId?: string;
    }) {
        this.logger.log(`코멘트 작성 시작: 문서 ${params.documentId}`);

        // 1. 문서 존재 확인
        await this.documentService.findOneWithError({
            where: { id: params.documentId },
        });

        // 2. 작성자 확인
        await this.employeeService.findOneWithError({
            where: { id: params.authorId },
        });

        // 3. 코멘트 작성 권한 확인 (합의자 또는 결재자만 가능)
        const approvalSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId: params.documentId },
        });

        const isAuthorized = approvalSteps.some(
            (step) =>
                step.approverId === params.authorId &&
                (step.stepType === ApprovalStepType.AGREEMENT || step.stepType === ApprovalStepType.APPROVAL),
        );

        if (!isAuthorized) {
            throw new ForbiddenException('해당 문서의 합의자 또는 결재자만 코멘트를 작성할 수 있습니다');
        }

        // 4. 부모 코멘트 확인 (대댓글인 경우)
        if (params.parentCommentId) {
            const parentComment = await this.commentService.findOneWithError({
                where: { id: params.parentCommentId },
            });

            // 부모 코멘트가 같은 문서에 속하는지 확인
            if (parentComment.documentId !== params.documentId) {
                throw new BadRequestException('부모 코멘트가 다른 문서에 속해 있습니다');
            }
        }

        // 5. 코멘트 생성 (도메인 서비스 사용)
        const savedComment = await this.commentService.createComment(params);

        this.logger.log(`코멘트 작성 완료: ${savedComment.id}`);
        return savedComment;
    }

    /**
     * 코멘트를 수정한다
     */
    async 코멘트를수정한다(params: { commentId: string; authorId: string; content: string }) {
        this.logger.log(`코멘트 수정 시작: ${params.commentId}`);

        // 1. 코멘트 조회
        const comment = await this.commentService.findOneWithError({
            where: { id: params.commentId },
        });

        // 2. 작성자 확인 (본인만 수정 가능)
        if (comment.authorId !== params.authorId) {
            throw new BadRequestException('본인의 코멘트만 수정할 수 있습니다');
        }

        // 3. 코멘트 수정 (도메인 서비스 사용)
        const updatedComment = await this.commentService.updateComment(comment, params.content);

        this.logger.log(`코멘트 수정 완료: ${params.commentId}`);
        return updatedComment;
    }

    /**
     * 코멘트를 삭제한다 (소프트 삭제)
     */
    async 코멘트를삭제한다(commentId: string, authorId: string) {
        this.logger.log(`코멘트 삭제 시작: ${commentId}`);

        // 1. 코멘트 조회
        const comment = await this.commentService.findOneWithError({
            where: { id: commentId },
        });

        // 2. 작성자 확인 (본인만 삭제 가능)
        if (comment.authorId !== authorId) {
            throw new BadRequestException('본인의 코멘트만 삭제할 수 있습니다');
        }

        // 3. 소프트 삭제 (도메인 서비스 사용)
        const deletedComment = await this.commentService.deleteComment(comment);

        this.logger.log(`코멘트 삭제 완료: ${commentId}`);
        return deletedComment;
    }

    /**
     * 문서의 코멘트를 조회한다
     */
    async 문서의코멘트를조회한다(documentId: string) {
        this.logger.debug(`문서 코멘트 조회: ${documentId}`);

        // 1. 문서 존재 확인
        await this.documentService.findOneWithError({
            where: { id: documentId },
        });

        // 2. 코멘트 조회 (삭제되지 않은 것만, 작성자 및 대댓글 포함)
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

        // 3. 최상위 코멘트만 반환 (replies에 대댓글이 포함됨)
        const topLevelComments = comments.filter((comment) => !comment.parentCommentId);

        return topLevelComments;
    }

    /**
     * 코멘트 상세를 조회한다
     */
    async 코멘트를조회한다(commentId: string) {
        this.logger.debug(`코멘트 조회: ${commentId}`);

        const comment = await this.commentService.findOneWithError({
            where: { id: commentId },
            relations: ['author', 'document', 'parentComment', 'replies'],
        });

        return comment;
    }
}
