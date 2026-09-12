-- One optional external attendee per meeting, for calendar invites.

alter table meetings
  add column attendee_email text;
