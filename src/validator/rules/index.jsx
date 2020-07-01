import badInput from './badInput';
import patternMismatch from './patternMismatch';
import rangeOverflow from './rangeOverflow';
import rangeUnderflow from './rangeUnderflow';
import stepMismatch from './stepMismatch';
import tooLong from './tooLong';
import tooShort from './tooShort';
import typeMismatch from './typeMismatch';
import customError from './customError';
import uniqueError from './uniqueError';
const validationRules = [
    badInput,
    patternMismatch,
    rangeOverflow,
    rangeUnderflow,
    stepMismatch,
    tooLong,
    tooShort,
    typeMismatch,
    customError,
    uniqueError,
];
export default validationRules;
