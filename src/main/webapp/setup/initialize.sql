
drop sequence SEQ_GID if exists;
create sequence SEQ_GID as bigint start with 1 increment by 1;

drop sequence SEQ_MID if exists;
create sequence SEQ_MID as bigint start with 1 increment by 1;

drop sequence SEQ_DATA_ID if exists;
create sequence SEQ_DATA_ID as bigint start with 1 increment by 1;

drop table SEQUENCES if exists;
create table SEQUENCES (
  SEQ_ID varchar(32) not null,
  SEQ_VAL bigint not null,
  primary key (SEQ_ID)
);

drop table USERS if exists;
create table USERS (
  UID varchar(32) not null,
  JSON_DATA varchar(1024) not null,
  primary key (UID)
);

drop table CONTACTS if exists;
create table CONTACTS (
  UID varchar(32) not null,
  CONTACT_UID varchar(32) not null,
  CONTACT_GID bigint not null,
  primary key (UID,CONTACT_UID)
);

drop table GROUPS if exists;
create table GROUPS (
  UID varchar(32) not null,
  GID bigint not null,
  JSON_DATA varchar(1024) not null,
  primary key (UID,GID)
);

drop table GROUP_USERS if exists;
create table GROUP_USERS (
  UID varchar(32) not null,
  GID bigint not null,
  GROUP_UID varchar(32) not null,
  JSON_DATA varchar(1024) not null,
  primary key (UID,GID,GROUP_UID)
);

drop table MESSAGES if exists;
create table MESSAGES (
  UID varchar(32) not null,
  MID bigint not null,
  GID bigint not null,
  DATE bigint not null,
  JSON_DATA varchar(100000) not null,
  primary key (UID,MID)
);

drop table AVATARS if exists;
create table AVATARS (
  UID varchar(32) not null,
  DATA clob(10M) not null,
  primary key (UID)
);

drop table USER_DATA if exists;
create table USER_DATA (
  DATA_ID bigint not null,
  DATA_TYPE varchar(8) not null,
  UID varchar(32) not null,
  DATE bigint not null,
  JSON_DATA varchar(1024) not null,
  primary key (DATA_ID)
);

drop index MESSAGES_IDX1 if exists;
create index MESSAGES_IDX1 on MESSAGES (DATE); 

drop index MESSAGES_IDX2 if exists;
create index MESSAGES_IDX2 on MESSAGES (DATE desc); 

drop index USER_DATA_IDX1 if exists;
create index USER_DATA_IDX1 on USER_DATA (UID); 

drop table DUAL if exists;
create table DUAL (DUMMY varchar(1) );
insert into DUAL (DUMMY) values ('X');
