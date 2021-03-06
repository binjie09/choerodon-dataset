import { Lang } from './enum';
import { Locale } from './locale';

const locale: Locale = {
  lang: Lang.ja_JP,
  DataSet: {
    unsaved_data_confirm: '未保存のデータがあります。続行しますか？ ',
    invalid_query_dataset: 'クエリ条件データセットの検証に失敗しました',
    delete_selected_row_confirm: '選択した行を削除してもよろしいですか？ ',
    delete_all_row_confirm: '本当にすべての行を削除しますか？ ',
    query_success: '検索成功',
    query_failure: 'クエリに失敗しました',
    submit_success: '送信に成功しました',
    submit_failure: '送信に失敗しました',
    cannot_add_record_when_head_no_current:
      'ヘッダーが選択されていません。新しい行レコードを作成できません',
  },
  Validator: {
    bad_input: '数字を入力してください。',
    pattern_mismatch: '有効な値を入力してください。',
    range_overflow: '{label}は{max}以下でなければなりません。',
    range_underflow: '{label}は{min}以上でなければなりません。',
    step_mismatch: '有効な値を入力してください。 最も近い有効な値は{0}です。',
    step_mismatch_between:
      '有効な値を入力してください。 最も近い有効な2つの値は、それぞれ{0}と{1}です。',
    too_long:
      'コンテンツを{maxlength}以下の文字に減らしてください（現在は{length}文字を使用しています）。',
    too_short:
      'コンテンツを{minlength}以上の文字に増やしてください（現在は{length}文字を使用しています）。',
    type_mismatch: 'タイプに一致する有効な値を入力してください。',
    value_missing_no_label: 'このフィールドに入力してください。',
    value_missing: '{label}を入力してください。',
    unique: 'このフィールドの値は一意ではありません。再入力してください。',
    unknown: '不明なエラー。',
  },
};

export default locale;
