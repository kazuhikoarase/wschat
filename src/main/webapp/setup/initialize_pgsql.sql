
drop sequence if exists SEQ_GID;
create sequence SEQ_GID start with 1 increment by 1;

drop sequence if exists SEQ_MID;
create sequence SEQ_MID start with 1 increment by 1;

drop table if exists USERS;
create table USERS (
  UID varchar(32) not null,
  JSON_DATA varchar(1024) not null,
  primary key (UID)
);

drop table if exists CONTACTS;
create table CONTACTS (
  UID varchar(32) not null,
  CONTACT_UID varchar(32) not null,
  CONTACT_GID bigint not null,
  primary key (UID,CONTACT_UID)
);

drop table if exists GROUPS;
create table GROUPS (
  UID varchar(32) not null,
  GID bigint not null,
  JSON_DATA varchar(1024) not null,
  primary key (UID,GID)
);

drop table if exists GROUP_USERS;
create table GROUP_USERS (
  UID varchar(32) not null,
  GID bigint not null,
  GROUP_UID varchar(32) not null,
  JSON_DATA varchar(1024) not null,
  primary key (UID,GID,GROUP_UID)
);

drop table if exists MESSAGES;
create table MESSAGES (
  UID varchar(32) not null,
  MID bigint not null,
  GID bigint not null,
  DATE bigint not null,
  JSON_DATA varchar(100000) not null,
  primary key (UID,MID)
);

drop table if exists AVATARS;
create table AVATARS (
  UID varchar(32) not null,
  DATA TEXT not null,
  primary key (UID)
);

drop index if exists MESSAGES_IDX1;
create index MESSAGES_IDX1 on MESSAGES (DATE); 

drop index if exists MESSAGES_IDX2;
create index MESSAGES_IDX2 on MESSAGES (DATE desc); 

drop table if exists DUAL;
create table DUAL (DUMMY varchar(1) );
insert into DUAL (DUMMY) values ('X');
