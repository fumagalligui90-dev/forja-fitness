-- Row Level Security: 2ª camada de isolamento entre usuários.
-- A API executa toda operação de usuário numa transação com
--   set_config('app.user_id', <id>, true) + SET LOCAL ROLE forja_app
-- e o banco recusa linhas de outro dono mesmo que um serviço tenha bug.

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forja_app') THEN
    CREATE ROLE forja_app NOLOGIN;
  END IF;
  -- Em provedores gerenciados o usuário de conexão não é superusuário e
  -- precisa ser membro do papel para executar SET ROLE.
  BEGIN
    EXECUTE format('GRANT forja_app TO %I', current_user);
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'GRANT forja_app ignorado: %', SQLERRM;
  END;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO forja_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON exercises TO forja_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON exercise_favorites TO forja_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON workouts, workout_exercises TO forja_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON workout_sessions, session_exercises, set_logs TO forja_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON set_log_revisions TO forja_app;
--> statement-breakpoint

-- Exercícios: globais (owner_id NULL) visíveis a todos; escrita só nos próprios.
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY exercises_read ON exercises FOR SELECT TO forja_app
  USING (owner_id IS NULL OR owner_id = app_user_id());
--> statement-breakpoint
CREATE POLICY exercises_insert ON exercises FOR INSERT TO forja_app
  WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
CREATE POLICY exercises_update ON exercises FOR UPDATE TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint

ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY exercise_favorites_owner ON exercise_favorites FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY workouts_owner ON workouts FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY workout_exercises_owner ON workout_exercises FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY workout_sessions_owner ON workout_sessions FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY session_exercises_owner ON session_exercises FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY set_logs_owner ON set_logs FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint
ALTER TABLE set_log_revisions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY set_log_revisions_owner ON set_log_revisions FOR ALL TO forja_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
