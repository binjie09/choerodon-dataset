import { computed, observable, runInAction } from 'mobx';
import { ValidationMessages } from './Validator';
import { getConfig } from '../configure';

export interface ValidationResultProps {
  validationMessageRaw?: string;
  injectionOptions?: object;
  value?: any;
  ruleName: keyof ValidationMessages;
}

export default class ValidationResult {
  @observable validationMessageRaw?: string;

  @computed
  get validationMessage(): any {
    const { validationMessageRaw, injectionOptions } = this;
    if (validationMessageRaw && injectionOptions) {
      return getConfig('validationMessageFormatter')(validationMessageRaw, injectionOptions);
    }
    return validationMessageRaw;
  }

  set validationMessage(validationMessageRaw: any) {
    runInAction(() => {
      this.validationMessageRaw = validationMessageRaw;
    });
  }

  @observable injectionOptions?: object;

  @observable value?: any;

  @observable ruleName: keyof ValidationMessages;

  constructor(props: ValidationResultProps) {
    runInAction(() => {
      Object.assign(this, props);
    });
  }
}
