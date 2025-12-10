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
exports.BaseService = void 0;
const common_1 = require("@nestjs/common");
let BaseService = class BaseService {
    constructor(repository) {
        this.repository = repository;
    }
    createQueryBuilder(alias) {
        return this.repository.createQueryBuilder(alias);
    }
    get manager() {
        return this.repository.manager;
    }
    async create(entity, options) {
        return this.repository.create(entity, options);
    }
    async save(entity, options) {
        return this.repository.save(entity, options);
    }
    async findAll(options) {
        return this.repository.findAll(options);
    }
    async findOne(options) {
        return this.repository.findOne(options);
    }
    async findAndCount(options) {
        return this.repository.findAndCount(options);
    }
    async update(entityId, entity, options) {
        return this.repository.update(entityId, entity, options);
    }
    async delete(entityId, options) {
        return this.repository.delete(entityId, options);
    }
    async findOneWithError(options) {
        const entity = await this.findOne(options);
        if (!entity) {
            throw new common_1.NotFoundException(`${this.repository['repository'].target.name}를 찾을 수 없습니다.`);
        }
        return entity;
    }
    async findAllWithError(options) {
        const entities = await this.findAll(options);
        if (entities.length === 0) {
            throw new common_1.NotFoundException(`${this.repository['repository'].target.name} 목록을 찾을 수 없습니다.`);
        }
        return entities;
    }
};
exports.BaseService = BaseService;
exports.BaseService = BaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], BaseService);
//# sourceMappingURL=base.service.js.map