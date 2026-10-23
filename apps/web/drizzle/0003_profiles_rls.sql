-- Perfil: cada usuário só lê e altera a própria linha.
GRANT SELECT, INSERT, UPDATE ON profiles TO forja_app;
--> statement-breakpoint
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY profiles_owner ON profiles FOR ALL TO forja_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
