import { ColumnAlign, LovFieldType } from '../enum';
import { FieldType } from '../data-set/enum';
import { FieldProps } from '../data-set/Field';

export type TimeStep = {
  hour?: number;
  minute?: number;
  second?: number;
}

export interface Form {

}

export interface FormField {
  getValidatorProps();
}

export type LovConfigItem = {
  display?: string;
  conditionField?: string;
  conditionFieldLovCode?: string;
  conditionFieldType?: FieldType | LovFieldType;
  conditionFieldName?: string;
  conditionFieldSelectCode?: string;
  conditionFieldSelectUrl?: string;
  conditionFieldSelectTf?: string;
  conditionFieldSelectVf?: string;
  conditionFieldSequence: number;
  conditionFieldRequired?: boolean;
  gridField?: string;
  gridFieldName?: string;
  gridFieldWidth?: number;
  gridFieldAlign?: ColumnAlign;
  gridFieldSequence: number;
  queryFieldProps?: FieldProps;
  fieldProps?: FieldProps;
};

export type LovConfig = {
  title?: string;
  width?: number;
  height?: number;
  customUrl?: string;
  lovPageSize?: string;
  lovItems: LovConfigItem[] | null;
  treeFlag?: 'Y' | 'N';
  parentIdField?: string;
  idField?: string;
  textField?: string;
  valueField?: string;
  placeholder?: string;
  editableFlag?: 'Y' | 'N';
  queryColumns?: number;
};
