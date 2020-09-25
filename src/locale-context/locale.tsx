/* eslint-disable camelcase */
import { Lang } from './enum';
import zh_CN from './zh_CN';

export interface Locale {
  lang: Lang;
  DataSet: {
    unsaved_data_confirm;
    invalid_query_dataset;
    delete_selected_row_confirm;
    delete_all_row_confirm;
    query_success;
    query_failure;
    submit_success;
    submit_failure;
    cannot_add_record_when_head_no_current;
  };
  Validator: {
    bad_input;
    pattern_mismatch;
    range_overflow;
    range_underflow;
    step_mismatch;
    step_mismatch_between;
    too_long;
    too_short;
    type_mismatch;
    value_missing;
    value_missing_no_label;
    unique;
    unknown;
  };
}

export default zh_CN;
