export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppStackParamList = {
  FriendList: undefined;
  FriendForm: { friendId?: number };
  LogGathering: { friendId: number };
};
