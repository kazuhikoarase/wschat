delete from USERS where UID like 'testuser%';
delete from CONTACTS where UID not in (select UID from USERS);
delete from GROUPS where UID not in (select UID from USERS);
delete from GROUP_USERS where UID not in (select UID from USERS);
delete from MESSAGES where UID not in (select UID from USERS);
delete from AVATARS where UID not in (select UID from USERS);
