import { createLibrary, createServer, type UserRepo, type UserListItem } from 'my-crud-lib';

type StoredUser = UserListItem & { passwordHash: string };

const users = new Map<number, StoredUser>();
let nextId = 1;

const publicUser = (user: StoredUser): UserListItem => {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

const userRepo: UserRepo = {
  async count() {
    return users.size;
  },
  async findMany({ page, pageSize }) {
    return [...users.values()].slice((page - 1) * pageSize, page * pageSize).map(publicUser);
  },
  async findById(id) {
    const user = users.get(Number(id));
    return user ? publicUser(user) : null;
  },
  async findByEmail(email) {
    return [...users.values()].find((user) => user.email === email) ?? null;
  },
  async create(input) {
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: nextId++,
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name ?? null,
      role: input.role === 'ADMIN' ? 'ADMIN' : 'USER',
      createdAt: now,
      updatedAt: now,
      profile: { bio: input.bio ?? null, avatarUrl: input.avatarUrl ?? null },
    };
    users.set(Number(user.id), user);
    return publicUser(user);
  },
  async update(id, input) {
    const user = users.get(Number(id));
    if (!user) throw new Error('USER_NOT_FOUND');
    const nextUser: StoredUser = {
      ...user,
      name: input.name ?? user.name,
      role: input.role ?? user.role,
      updatedAt: new Date().toISOString(),
      profile: {
        bio: input.bio ?? user.profile?.bio ?? null,
        avatarUrl: input.avatarUrl ?? user.profile?.avatarUrl ?? null,
      },
    };
    users.set(Number(id), nextUser);
    return publicUser(nextUser);
  },
  async delete(id) {
    users.delete(Number(id));
  },
  async updateMe(userId, input) {
    return this.update(userId, input);
  },
};

const app = createServer();
const lib = createLibrary({ routesPrefix: '/api' }, { userRepo });

app.use(lib.router);
app.listen(3000, () => console.log('API running on http://localhost:3000'));
