import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const schema = await readFile(
  new URL("../supabase/schema.sql", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL(
    "../supabase/migrations/20260917000000_reusable_owner_invitation.sql",
    import.meta.url,
  ),
  "utf8",
);

test("invitation migration and redemption in PostgreSQL", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(`
    create schema extensions;
    create schema auth;
    create role anon;
    create role authenticated;
    create role service_role;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  await db.exec(schema);
  const user = async () => {
    const id = randomUUID();
    await db.query("insert into auth.users(id) values ($1)", [id]);
    return id;
  };
  const invite = async (token, role, expired = false, usedBy = null) => {
    await db.query(
      `insert into public.invites(token_hash, role, expires_at, used_by, used_at)
      values (encode(extensions.digest($1, 'sha256'), 'hex'), $2,
        now() + case when $3 then interval '-1 day' else interval '7 days' end,
        $4, case when $4::uuid is not null then now() else null end)`,
      [token, role, expired, usedBy],
    );
  };
  const inspect = async (token) =>
    (await db.query("select public.inspect_invite($1) as role", [token]))
      .rows[0].role;
  const redeem = (token, id, name = "Test member") =>
    db.query("select public.redeem_invite($1, $2, $3)", [token, id, name]);
  const ownerToken = "a".repeat(48);
  const originalOwner = await user();
  await db.query(
    "insert into public.members(id,name,role) values ($1, 'Original owner', 'owner')",
    [originalOwner],
  );
  await invite(ownerToken, "owner", false, originalOwner);

  await t.test(
    "reproduces rejection of the already-used issued invitation",
    async () => {
      assert.equal(await inspect(ownerToken), null);
      await assert.rejects(
        redeem(ownerToken, await user()),
        /Invite expired or already used/,
      );
    },
  );

  // Also verify that migration restores the credential after its old expiry.
  await db.exec(
    "update public.invites set expires_at = now() - interval '1 day' where role = 'owner'",
  );
  // Recreate the pre-migration table shape to exercise the column upgrade too.
  await db.exec("alter table public.invites drop column reusable cascade");
  await db.exec(migration);
  await t.test(
    "restores the same owner code, removes expiry, and preserves history",
    async () => {
      assert.equal(await inspect(ownerToken), "owner");
      const { rows } = await db.query(
        "select reusable, expires_at::text as expiry, used_by from public.invites where role='owner'",
      );
      assert.deepEqual(rows[0], {
        reusable: true,
        expiry: "infinity",
        used_by: originalOwner,
      });
      for (let i = 0; i < 3; i++) {
        const id = await user();
        await redeem(ownerToken, id);
        assert.equal(await inspect(ownerToken), "owner");
        assert.equal(
          (await db.query("select role from public.members where id=$1", [id]))
            .rows[0].role,
          "owner",
        );
      }
      await db.exec(migration); // Safe to reapply without changing the credential.
      assert.equal(await inspect(ownerToken), "owner");
    },
  );

  await t.test(
    "ordinary learner and mentor invitations remain single-use",
    async () => {
      for (const role of ["learner", "mentor"]) {
        const token = (role === "learner" ? "b" : "c").repeat(48);
        await invite(token, role);
        assert.equal(await inspect(token), role);
        await redeem(token, await user());
        assert.equal(await inspect(token), null);
        await assert.rejects(
          redeem(token, await user()),
          /Invite expired or already used/,
        );
      }
    },
  );

  await t.test("expired and unknown invitations remain rejected", async () => {
    const token = "d".repeat(48);
    await invite(token, "learner", true);
    for (const invalid of [token, "e".repeat(48)]) {
      assert.equal(await inspect(invalid), null);
      await assert.rejects(
        redeem(invalid, await user()),
        /Invite expired or already used/,
      );
    }
  });

  await t.test(
    "failed membership creation does not consume an invitation",
    async () => {
      const token = "f".repeat(48);
      await invite(token, "learner");
      await assert.rejects(redeem(token, originalOwner), /duplicate key/);
      assert.equal(await inspect(token), "learner");
      await redeem(token, await user());
      assert.equal(await inspect(token), null);
    },
  );

  await t.test(
    "invitation RPCs remain restricted to the service role",
    async () => {
      for (const fn of [
        "public.inspect_invite(text)",
        "public.redeem_invite(text,uuid,text)",
      ]) {
        for (const role of ["anon", "authenticated", "service_role"]) {
          const { rows } = await db.query(
            "select has_function_privilege($1, $2, 'execute') as allowed",
            [role, fn],
          );
          assert.equal(rows[0].allowed, role === "service_role");
        }
      }
    },
  );

  await t.test(
    "migration refuses to enable multiple bootstrap owner invitations",
    async () => {
      await invite("0".repeat(48), "owner");
      await assert.rejects(
        db.exec(migration),
        /Multiple bootstrap owner invitations found/,
      );
    },
  );
});
