declare module wschat.server {

  interface JQThin {
    each: {
      <T>(it: T[], f : (i : number, v : T) => void) : void
      <T>(it: { [k:string]:T }, f : (k : string, v : T) => void) : void
    }
  }

  interface ChatService {
    putUserSession: (uid: string, sid: string, data: any) => void;
    getUserSession: (uid: string, sid: string) => any;
    removeUserSession: (uid: string, sid: string) => void;
    getUserSessionIdList: (uid: string) => string[];
    doLogin: (uid: string) => User;
    getUser: (uid: string) => User;
    updateUser: (user: User) => void;
    getAvatar: (uid: string) => string;
    updateAvatar: (uid: string, file: AttachedFile) => void;
    newUser: (user: NewUser) => void;
    searchUsers: (uid: string, keyword: string) => GroupUser[];
    containsUser: (uid: string, dstUid: string) => boolean;
    applyContact: (uid1: string, uid2: string, gid: string) => string;
    removeContact: (uid: string, targetUid: string) => string;
    createContactGroup: (uid1: string, uid2: string) => string;
    newGroup: (users: string[]) => string;
    getGroup: (uid: string, gid: string) => Group;
    addToGroup: (uid: string, group: Group, uidToAdd: string) => Group;
    removeFromGroup: (uid: string, group: Group, uidToRemove: string) => Group;
    fetchGroups: (uid: string, opts: FetchOptions) => {
        [gid: string]: Group;
    };
    newMid: () => string;
    getMessage: (uid: string, mid: string) => Message;
    updateMessage: (uid: string, gid: string, message: Message) => void;
    fetchMessages: (uid: String, gid: String, opts: FetchOptions) => {
        [mid: string]: Message;
    };
    newDataId: () => string;
    updateUserData: (userData : any, date : string) => any;
    getUserData: (dataId : string) => any;
    deleteUserData: (dataId : string) => void;
    fetchUserData: (uid : string) => any[];
  }

  interface ServerActions {
    login? : (data : any) => void
    user? : (data : any) => void
    updateAvatar? : (data : any) => void
    updateUserData? : (data : any) => void
    searchUsers? : (data : any) => void
    newGroup? : (data : { gid : string,
    users? : string[], message : string }) => void
    requestAddToContacts? : (data : any) => void
    acceptContact? : (data : any) => void
    removeContact? : (data : any) => void
    addToGroup? : (data : any) => void
    removeFromGroup? : (data : any) => void
    exitFromGroup? : (data : any) => void
    fetchGroups? : (data : any) => void
    message? : (data : any) => void
    fetchMessages? : (data : any) => void
    postMessage? : (data : any) => void
    typing? : (data : any) => void
    download? : (data : any) => void
  }
}
