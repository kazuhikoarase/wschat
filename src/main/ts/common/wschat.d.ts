declare module wschat {

  interface AttachedFile {
    name : string
    deleted : boolean
    tmpfile : string
    contentType : string
  }

  interface NewMessage {
    message : string
    file? : AttachedFile
  }

  interface Message extends NewMessage {
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

  interface FetchOptions {
  }

  interface ContactRequest {
    uid : string
    nickname : string
  }

  interface NewUser {
    uid : string
    nickname : string
  }

  interface User extends ContactRequest, NewUser {
    uid : string
    nickname : string
    message : string
    state : string
    date : number
    idleTime : number
    gid : string
    contacts : { [uid : string] : Contact }
  }

  interface GroupUser {
    uid : string
    nickname : string
  }

  interface Contact {
    gid : string
  }

  interface ProgressData {
    gid: string
    fid: number
    progress: string
  }

  interface Group {
    gid : string
    users : { [uid : string] : GroupUser }
    messages : { [mid : string] : Message }
    minDate : number
    maxDate : number
    newMsg : boolean
  }

  interface IdleTime {
    time : number
    idleTime : number
  }

  interface TypingData {
    uid : string
    nickname : string
    gid : string
    status : string
  }

  interface Messages {
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
    COPY_ALL : string
    NEW : string
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
    ONLINE : string
    OFFLINE : string
    IDLE : string
    BUSY : string
  }
}
