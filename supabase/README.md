# Writing backend (Supabase)

The text of `/writing/` lives in a Supabase database, not in this repo.

## One-time setup

1. Create a free project at supabase.com.
2. **SQL editor:** paste and run `writing.sql`. Then add yourself as an author:
   `insert into public.authors (email) values ('your@email.com');`
3. **Authentication → Users → Add user → Send invitation** to that same email, so the account
   exists. The sign-in form never creates accounts.
4. **Authentication → Sign In / Providers:** turn off "Allow new users to sign up". Keep Email on.
5. **Authentication → URL Configuration:** Site URL `https://fakharaltaf.github.io`. Add
   `https://fakharaltaf.github.io/writing/admin/` and `http://localhost:5173/writing/admin/` to
   Redirect URLs.
6. **Project Settings → API:** copy the Project URL and the anon (public) key.
   - GitHub repo → Settings → Secrets and variables → Actions → **Variables**:
     `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
   - Locally: put them in `.env.local` as `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=`.

Never put the `service_role` key anywhere in this repo or the site.

## Who can do what

| | Read listed | Read unlisted | Write / edit / delete |
|---|---|---|---|
| Anyone | yes | only by its exact link | no |
| Signed in, in `authors` | yes | yes | yes |
| Signed in, not in `authors` | yes | only by its exact link | no |
