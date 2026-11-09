const Database = require('better-sqlite3');
const db = new Database('./dev.db');
const users = db.prepare("SELECT u.id, u.email, p.displayName FROM User u LEFT JOIN Profile p ON u.id = p.userId").all();
console.log('Users:', users);
const courses = db.prepare("SELECT id, title, slug, enrollmentCount FROM Course").all();
console.log('Courses:', courses);

