import format from 'string-template';

export type ValidationMessageReportFormatter = (message: any) => Promise<string | undefined> | string | undefined;

export type ValidationMessageFormatter = (message?: string, injectOptons?: any) => Promise<any> | any;

export function defaultValidationMessageFormatter(message?: string, injectOptons?: any) {
  if (message && injectOptons) {
    return format(message, injectOptons)
  }
  return message;
}

export function defaultValidationMessageReportFormatter() {
  return undefined;
}
