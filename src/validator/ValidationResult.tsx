import { ValidationMessages } from './Validator';

export default class ValidationResult {
  validationMessage?: string;

  injectionOptions?: object;

  value?: any;

  ruleName: keyof ValidationMessages;

  constructor(props: ValidationResult) {
    Object.assign(this, props);
  }
}
