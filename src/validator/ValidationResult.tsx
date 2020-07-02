import { computed, observable, runInAction } from 'mobx';
import { ValidationMessages } from './Validator';
import { getConfig } from '../configure';

export default class ValidationResult {
  @observable validationMessageRaw?: string;

  @computed
  get validationMessage() {
    const { validationMessageRaw, injectionOptions } = this;
    if (validationMessageRaw && injectionOptions) {
      return getConfig('validationMessageFormatter')(validationMessageRaw, injectionOptions);
    }
    return validationMessageRaw;
  }

  set validationMessage(validationMessageRaw) {
    runInAction(() => {
      this.validationMessageRaw = validationMessageRaw;
    });
  }

  @observable injectionOptions?: any;

  @observable value?: any;

  @observable ruleName: keyof ValidationMessages;

  constructor(props: ValidationResult) {
    runInAction(() => {
      Object.assign(this, props);
    });
  }
}
