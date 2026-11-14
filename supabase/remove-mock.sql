-- Removes all mock data (test users and everything that belongs to them).
delete from auth.users where email like '%@mock.takewith.invalid';
