export type ValidationMessageReportFormatter = (message: any) => string | undefined;

export default function defaultValidationMessageReportFormatter() {
  return undefined;
}
