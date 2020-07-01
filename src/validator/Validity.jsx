import { __decorate } from "tslib";
import { action, computed, observable } from 'mobx';
export default class Validity {
    constructor(props) {
        this.init(props);
    }
    get valid() {
        return Object.keys(this)
            .filter(key => key !== 'valid')
            .every(key => !this[key]);
    }
    reset() {
        this.init();
    }
    init(props) {
        this.badInput = false;
        this.customError = false;
        this.patternMismatch = false;
        this.rangeOverflow = false;
        this.rangeUnderflow = false;
        this.stepMismatch = false;
        this.tooLong = false;
        this.tooShort = false;
        this.typeMismatch = false;
        this.valueMissing = false;
        this.uniqueError = false;
        if (props) {
            Object.assign(this, props);
        }
    }
}
__decorate([
    observable
], Validity.prototype, "badInput", void 0);
__decorate([
    observable
], Validity.prototype, "customError", void 0);
__decorate([
    observable
], Validity.prototype, "patternMismatch", void 0);
__decorate([
    observable
], Validity.prototype, "rangeOverflow", void 0);
__decorate([
    observable
], Validity.prototype, "rangeUnderflow", void 0);
__decorate([
    observable
], Validity.prototype, "stepMismatch", void 0);
__decorate([
    observable
], Validity.prototype, "tooLong", void 0);
__decorate([
    observable
], Validity.prototype, "tooShort", void 0);
__decorate([
    observable
], Validity.prototype, "typeMismatch", void 0);
__decorate([
    observable
], Validity.prototype, "valueMissing", void 0);
__decorate([
    observable
], Validity.prototype, "uniqueError", void 0);
__decorate([
    computed
], Validity.prototype, "valid", null);
__decorate([
    action
], Validity.prototype, "init", null);
