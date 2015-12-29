'use strict';

namespace wschat {

  export interface Chat {
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

  export interface ChatOptions {
    url : string
    fileuploadUrl : string
    uid? : string
    icon? : string
    notifySound? : string
    notifySoundVolume? : number
    decorator? : ($target : JQuery) => void
    inputAssist? : () => JQuery
  }

  export interface AttachedFile {
    name : string
    deleted : boolean
    tmpfile : string
    contentType : string
  }

  export interface NewMessage {
    message : string
    file? : AttachedFile
  }

  export interface Message extends NewMessage {
    mid : string
    uid : string
    nickname : string
    message : string
    date : number
    newMsg : boolean
    modified? : boolean
    deleted? : boolean
    edited? : boolean
    file? : AttachedFile
    requestAddToContacts? : boolean
    requestAddToContactsUid? : string
  }

  export interface FetchOptions {
  }

  export interface ContactRequest {
    uid : string
    nickname : string
  }

  export interface NewUser {
    uid : string
    nickname : string
  }

  export interface User extends ContactRequest, NewUser {
    uid : string
    nickname : string
    message : string
    date : number
    idleTime : number
    gid : string
    contacts : { [uid : string] : Contact }
  }

  export interface GroupUser {
    uid : string
    nickname : string
  }

  export interface Contact {
    gid : string
  }

  export interface ProgressData {
    gid: string
    fid: number
    progress: string
  }

  export interface Group {
    gid : string
    users : { [uid : string] : GroupUser }
    messages : { [mid : string] : Message }
    minDate : number
    maxDate : number
    newMsg : boolean
  }

  export interface Point {
    x : number
    y : number
  }

  export interface Dialog {
    showDialog : ($content : JQuery) => void
    hideDialog : () => void
  }

  export interface IdleTime {
    time : number
    idleTime : number
  }

  export interface TypingData {
    uid : string
    nickname : string
    gid : string
    status : string
  }
  export interface UI {
    valid : boolean
    validate : () => void
  }
  export interface PrevMessage {
    label : string
    lastDays : number
  }

  export interface Actions {
    login? : (data : any) => void
    user? : (data : any) => void
    avatar? : (data : any) => void
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

  export interface ServerActions {
    login? : (data : any) => void
    user? : (data : any) => void
    updateAvatar? : (data : any) => void
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

  export interface MessageEditor {
    beginEdit : (message : string) => void
    isEditing : () => boolean
    endEdit : (reason? : string, msg? : string) => void
  }

  export interface Messages {
    OK : string
    CANCEL : string
    USERS : string
    GROUPS : string
    NOTIFY_NEW_MESSAGE : string
    ENTER_HERE_A_MESSAGE : string
    UPLOADING: string
    MONTH_LABELS : string
    DAY_LABELS : string
    SHORT_DATE_FORMAT : string
    FULL_DATE_FORMAT : string
    TODAY : string
    YESTERDAY : string
    SEVEN_DAYS : string
    THIRTY_DAYS : string
    THREE_MONTHS : string
    SIX_MONTHS : string
    ONE_YEAR : string
    FROM_FIRST : string
    SUBMIT : string
    CONTACT_ADD_REQUEST : string
    SEARCH_CONTACT : string
    SELECT_CONTACT : string
    DELETE_CONTACT : string
    FILE_NOT_AVAILABLE : string
    DELETED : string
    MODIFIED : string
    APPROVE : string
    DELETE : string
    EDIT : string
    QUOTE : string
    DBLCLICK_TO_SEND_CONTACT_ADD_REQUEST : string
    EXIT_FROM_THIS_GROUP : string
    COMFIRM_EXIT_FROM_THIS_GROUP : string
    SHOW_MESSAGE_FROM : string
    CONFIRM_DELETE_CONTACT : string
    SEND_CONTACT_ADD_REQUEST : string
    TODAYS_FEELING : string
    TYPING : string
    CONFIRM_ATTACH_IMAGE : string
    DROP_HERE_A_FILE : string
  }

  export interface JQThin {
    each: {
      <T>(it: T[], f : (i : number, v : T) => void) : void
      <T>(it: { [k:string]:T }, f : (k : string, v : T) => void) : void
    }
  }
}
