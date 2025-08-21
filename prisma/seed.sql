-- Upsert utente admin (per email)
INSERT INTO "User" (email, "passwordHash", name, role)
VALUES (
  'admin@example.com',
  '$2a$10$zPri/qfqUlJh4HuOr0NvyepX/0iqnWIEqk53fQ2/ES4x3tXmrWvrO', -- bcrypt("admin123")
  'Super Admin',
  'ADMIN'
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role,
    "updatedAt" = NOW();

-- Upsert profilo collegato all'admin
INSERT INTO "Profile" ("userId", bio, "avatarUrl")
VALUES (
  (SELECT id FROM "User" WHERE email = 'admin@example.com'),
  'Utente amministratore creato con seed',
  NULL
)
ON CONFLICT ("userId") DO UPDATE
SET bio = EXCLUDED.bio,
    "avatarUrl" = EXCLUDED."avatarUrl";
