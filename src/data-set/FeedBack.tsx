export interface FeedBack {
  loadSuccess?(result: any);

  loadFailed?(error: Error);

  submitSuccess?(result: any);

  submitFailed?(error: Error);
}

const defaultFeedback: FeedBack = {
  loadSuccess(_result: any) {
  },
  loadFailed(_error: Error) {
  },
  submitSuccess(_result: any) {
  },
  submitFailed(_error: Error) {
  },
};

export default defaultFeedback;
