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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalStepSnapshot = void 0;
const typeorm_1 = require("typeorm");
const approval_enum_1 = require("../../../common/enums/approval.enum");
const employee_entity_1 = require("../employee/employee.entity");
const document_entity_1 = require("../document/document.entity");
let ApprovalStepSnapshot = class ApprovalStepSnapshot {
    문서를설정한다(documentId) {
        this.documentId = documentId;
    }
    결재단계순서를설정한다(stepOrder) {
        this.stepOrder = stepOrder;
    }
    결재단계타입을설정한다(stepType) {
        this.stepType = stepType;
    }
    결재자를설정한다(approverId) {
        this.approverId = approverId;
    }
    결재자스냅샷을설정한다(approverSnapshot) {
        this.approverSnapshot = approverSnapshot;
    }
    의견을설정한다(comment) {
        this.comment = comment;
    }
    승인한다() {
        this.status = approval_enum_1.ApprovalStatus.APPROVED;
        this.approvedAt = new Date();
    }
    반려한다() {
        this.status = approval_enum_1.ApprovalStatus.REJECTED;
        this.approvedAt = new Date();
    }
    대기한다() {
        this.status = approval_enum_1.ApprovalStatus.PENDING;
        this.approvedAt = null;
    }
    취소한다() {
        this.status = approval_enum_1.ApprovalStatus.CANCELLED;
        this.approvedAt = null;
    }
};
exports.ApprovalStepSnapshot = ApprovalStepSnapshot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { comment: '결재 단계 스냅샷 ID' }),
    __metadata("design:type", String)
], ApprovalStepSnapshot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', comment: '문서 ID' }),
    __metadata("design:type", String)
], ApprovalStepSnapshot.prototype, "documentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', comment: '결재 단계 순서' }),
    __metadata("design:type", Number)
], ApprovalStepSnapshot.prototype, "stepOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: approval_enum_1.ApprovalStepType,
        comment: '결재 단계 타입',
    }),
    __metadata("design:type", String)
], ApprovalStepSnapshot.prototype, "stepType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', comment: '결재자 ID' }),
    __metadata("design:type", String)
], ApprovalStepSnapshot.prototype, "approverId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        comment: '결재자 스냅샷 시점 정보 (부서, 직책, 직급 등)',
    }),
    __metadata("design:type", Object)
], ApprovalStepSnapshot.prototype, "approverSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: approval_enum_1.ApprovalStatus,
        default: approval_enum_1.ApprovalStatus.PENDING,
        comment: '결재 상태',
    }),
    __metadata("design:type", String)
], ApprovalStepSnapshot.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '결재 의견' }),
    __metadata("design:type", String)
], ApprovalStepSnapshot.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, comment: '결재 완료 시간' }),
    __metadata("design:type", Date)
], ApprovalStepSnapshot.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성일' }),
    __metadata("design:type", Date)
], ApprovalStepSnapshot.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정일' }),
    __metadata("design:type", Date)
], ApprovalStepSnapshot.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => document_entity_1.Document, (document) => document.approvalSteps, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'documentId' }),
    __metadata("design:type", document_entity_1.Document)
], ApprovalStepSnapshot.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee),
    (0, typeorm_1.JoinColumn)({ name: 'approverId' }),
    __metadata("design:type", employee_entity_1.Employee)
], ApprovalStepSnapshot.prototype, "approver", void 0);
exports.ApprovalStepSnapshot = ApprovalStepSnapshot = __decorate([
    (0, typeorm_1.Entity)('approval_step_snapshots'),
    (0, typeorm_1.Index)(['documentId', 'stepOrder']),
    (0, typeorm_1.Index)(['approverId']),
    (0, typeorm_1.Index)(['status'])
], ApprovalStepSnapshot);
//# sourceMappingURL=approval-step-snapshot.entity.js.map