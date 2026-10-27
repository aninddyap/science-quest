# Science Quest — POE Adventure 🧬
LKM digital kolaboratif IPA kelas VII dengan misi Predict–Observe–Explain, kuis, XP, kode kelompok, dan dashboard guru.

## Run locally
1. Install Node.js 20 or later.
2. Run `npm install`.
3. Create a Supabase project at https://supabase.com.
4. In Supabase SQL Editor, execute `supabase/schema.sql` on a new/empty project.
5. In Supabase Dashboard > Authentication > Providers, **enable Anonymous Sign-Ins** for students. Enable email/password for teachers.
6. In Authentication > Users, create a teacher account (email/password). Copy its user UUID. In SQL Editor run:
   `insert into public.teacher_profiles(user_id) values ('TEACHER-UUID');`
7. Copy `.env.example` to `.env.local`, then fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase project settings. **Never use the service_role key in browser variables.**
8. Run `npm run dev`, then open http://localhost:3000.
9. Teacher opens `/teacher`, logs in, creates a group, and shares the generated code with up to 5 students.
10. Students open `/`, enter name and code, and edit shared responses.

## Deploy
Push this folder to a GitHub repository, import it into Vercel, and add the same two NEXT_PUBLIC_ environment variables. Deploy. Supabase must remain enabled.

## Important limitations / next improvements
- This is a **functional starter**, not a production-audited LMS. Run tests with multiple devices before classroom use.
- Textarea synchronization uses last-write-wins at field level: simultaneous typing in the *same answer* may overwrite edits. Assign one editor per mission, or add a CRDT/Yjs collaborative editor for true character-by-character merging.
- XP reflects completed fields, **not** scientific correctness; teachers review the open-ended answers.
- Anonymous students may lose their session when switching browsers or clearing browser data. Group code access should be shared privately; a code alone grants entry to a group.
- No personal student data should be entered beyond nicknames. Add rate limiting, stronger invite controls, moderation, backup, and privacy review before wide deployment.
- Group size is intended to be five, but concurrent joins at exactly the same instant can race; enforce the limit transactionally with locking before production use.
- The demo uses one POE scenario (ice and salt) and one quiz item. Customize the content for your teaching sequence.
- Teacher profile registration is manual for security. Do not expose unrestricted teacher signup.
