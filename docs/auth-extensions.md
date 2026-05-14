# Auth extensions

The core auth flow remains stateless and adapter-driven. Advanced auth features are enabled only when the corresponding repository and hook dependencies are passed to `makeAuthService()` or `createAuthRouter()`.

## Persistent refresh token rotation

By default, refresh tokens are stateless JWTs. This is simple and works for small apps, but a stolen refresh token remains valid until expiry unless you rotate the signing secret.

Persistent refresh tokens add server-side state:

- Refresh JWTs include a token ID and token family ID.
- The repository stores a hash of the refresh token, never the raw token.
- `/auth/refresh` rotates the refresh token and revokes the previous token.
- Reusing a revoked refresh token is treated as replay and revokes the full token family when the repository supports `revokeFamily`.
- `/auth/logout` revokes the submitted refresh token.

```ts
import { createAuthRouter } from "my-crud-lib/auth";
import {
  makePrismaRefreshTokenRepo,
  makePrismaUserRepo,
} from "my-crud-lib/adapter-prisma";

app.use(
  "/auth",
  createAuthRouter({
    userRepo: makePrismaUserRepo(prisma),
    refreshTokenRepo: makePrismaRefreshTokenRepo(prisma),
  })
);
```

## Password reset

Password reset is app-owned for delivery. The library creates a one-time opaque token, stores only its hash, and calls your delivery hook.

Routes:

- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

```ts
import {
  makePrismaPasswordResetTokenRepo,
  makePrismaUserRepo,
} from "my-crud-lib/adapter-prisma";

createAuthRouter({
  userRepo: makePrismaUserRepo(prisma),
  passwordResetTokenRepo: makePrismaPasswordResetTokenRepo(prisma),
  async sendPasswordReset({ user, token, expiresAt }) {
    await emailProvider.sendPasswordReset(user.email, token, expiresAt);
  },
});
```

Security expectations:

- Return a generic success response for unknown emails.
- Keep reset token TTLs short.
- Send the token only through an out-of-band channel controlled by the application.
- Require HTTPS in production.

## Email verification

Email verification uses the same one-time token pattern as password reset. Delivery stays app-owned.

Routes:

- `POST /auth/email-verification/request`
- `POST /auth/email-verification/confirm`

```ts
import {
  makePrismaEmailVerificationTokenRepo,
  makePrismaUserRepo,
} from "my-crud-lib/adapter-prisma";

createAuthRouter({
  userRepo: makePrismaUserRepo(prisma),
  emailVerificationTokenRepo: makePrismaEmailVerificationTokenRepo(prisma),
  async sendEmailVerification({ user, token, expiresAt }) {
    await emailProvider.sendVerification(user.email, token, expiresAt);
  },
});
```

The bundled Prisma schema includes `User.emailVerifiedAt`. Existing Prisma users only need to add that column when they enable email verification. Apps should gate privileged behavior according to their own rules.

## OAuth and social login

OAuth provider redirects, scopes, and provider SDKs remain outside the core package. The auth service exposes a provider-agnostic account-linking method:

```ts
import {
  makeAuthService,
  type OAuthProviderProfile,
} from "my-crud-lib/auth";
import {
  makePrismaOAuthAccountRepo,
  makePrismaUserRepo,
} from "my-crud-lib/adapter-prisma";

const auth = makeAuthService({
  userRepo: makePrismaUserRepo(prisma),
  oauthAccountRepo: makePrismaOAuthAccountRepo(prisma),
});

const profile: OAuthProviderProfile = {
  provider: "github",
  providerAccountId: githubUser.id,
  email: githubUser.email,
  emailVerified: true,
  name: githubUser.name,
};

const result = await auth.signInWithOAuthProfile(profile);
```

If a provider account is already linked, the linked user is used. Otherwise, a verified email can be linked to an existing user. If no user exists, the service creates one with an unusable generated password hash and links the provider account.
