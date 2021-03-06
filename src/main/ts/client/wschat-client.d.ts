declare module wschat.client {

  interface ChatOptions {
    url : string
    fileuploadUrl : string
    uid? : string
    icon? : string
    notifySound? : string
    notifySoundVolume? : number
    decorator? : ($target : JQuery) => void
    inputAssist? : () => JQuery
    mobile? : boolean
  }

  interface ChatUtil {
    getUserNickname : (user : User) => string
    applyDecoration : ($target : JQuery) => JQuery
    createStatusMap : (users : { uid : string }[]) =>
      { [uid : string] : any[] }
  }

  interface Chat {
    user : User
    date : number
    fid : number
    users : { [uid : string] : User }
    groups : { [gid : string] : Group }
    selectedUids : { [uid : string] : boolean }
    selectedUid : string
    selectedGid : string
    selectedMid : string
    selectedView : string
    threadGid : string
    threadMsg : { [gid : string] : string }
    userIdleTimes : { [uid : string] : IdleTime[] }
    groupPrevs : { [gid : string] : number }
    userStates : { [uid : string] : string }
    avatars : { [uid : string] : string }
    threadMessagesGid : string
    threadMessages : Message[]
    lastActiveTime : number
    dayInMillis : number
    heartBeatInterval : number
    offlineTimeout : number
    idleTimeout : number
    readTimeout : number
    readFocusTimeout : number
    reopenInterval : number
    modifyTimeout : number
    messages : Messages
    dayLabels : string[]
    monthLabels : string[]
  }

  interface Point {
    x : number
    y : number
  }

  interface Dialog {
    showDialog : ($content : JQuery) => JQuery
    hideDialog : () => void
  }

  interface MessageEditor {
    beginEdit : (message : string) => void
    isEditing : () => boolean
    endEdit : (reason? : string, msg? : string) => void
  }

  interface TimeLine {
    $ui : JQuery,
    refreshData : (gid : string,
      userFilter : (uid : string) => boolean) => void,
    dlg? : Dialog
  }

  interface UI {
    valid : boolean
    validate : () => void
  }

  interface PrevMessage {
    label : string
    lastDays : number
  }

  interface Actions {
    login? : (data : any) => void
    user? : (data : any) => void
    avatar? : (data : any) => void
    userData? : (data : any) => void
    searchUsers? : (data : any) => void
    requestAddToContacts? : (data : any) => void
    acceptContact? : (data : any) => void
    removeContact? : (data : any) => void
    group? : (data : any) => void
    addToGroup? : (data : any) => void
    removeFromGroup? : (data : any) => void
    exitFromGroup? : (data : any) => void
    message? : (data : any) => void
    newGroup? : (data : any) => void
    typing? : (data : any) => void
    download? : (data : any) => void
  }
}
