-- Dados de demonstracao. Execute somente depois das migrations.
-- Substitua os cinco hashes abaixo por hashes bcrypt gerados com bcryptjs
-- usando o salt round 10, antes de executar este arquivo.
-- Nunca use uma senha em texto puro no campo password.
--
-- Para gerar cada hash localmente:
--   node
--   > require('bcryptjs').hash('SUA_SENHA_FORTE', 10).then(console.log)
--
-- Ajuste nomes, e-mails e CRMs antes de executar. Para evitar contas extras
-- quando o seed TypeScript tambem for executado, use os mesmos e-mails e CRMs
-- configurados nas variaveis do seed da aplicacao.

BEGIN;

DO $seed$
DECLARE
  admin_password_hash text := 'REPLACE_WITH_BCRYPT_HASH_ADMIN';
  secretary_1_password_hash text := 'REPLACE_WITH_BCRYPT_HASH_SECRETARY_1';
  secretary_2_password_hash text := 'REPLACE_WITH_BCRYPT_HASH_SECRETARY_2';
  doctor_1_password_hash text := 'REPLACE_WITH_BCRYPT_HASH_DOCTOR_1';
  doctor_2_password_hash text := 'REPLACE_WITH_BCRYPT_HASH_DOCTOR_2';
BEGIN
  IF admin_password_hash !~ '^\$2[aby]\$10\$[./A-Za-z0-9]{53}$'
    OR secretary_1_password_hash !~ '^\$2[aby]\$10\$[./A-Za-z0-9]{53}$'
    OR secretary_2_password_hash !~ '^\$2[aby]\$10\$[./A-Za-z0-9]{53}$'
    OR doctor_1_password_hash !~ '^\$2[aby]\$10\$[./A-Za-z0-9]{53}$'
    OR doctor_2_password_hash !~ '^\$2[aby]\$10\$[./A-Za-z0-9]{53}$'
  THEN
    RAISE EXCEPTION
      'Substitua os cinco placeholders por hashes bcryptjs validos com salt round 10.';
  END IF;

  INSERT INTO users (name, email, password, roles)
  VALUES
    ('Administrador', 'admin@medclinic.com', admin_password_hash, 'admin'),
    ('Secretaria Um', 'secretaria1@example.com', secretary_1_password_hash, 'secretary'),
    ('Secretaria Dois', 'secretaria2@example.com', secretary_2_password_hash, 'secretary'),
    ('Medico Um', 'medico1@example.com', doctor_1_password_hash, 'doctor'),
    ('Medico Dois', 'medico2@example.com', doctor_2_password_hash, 'doctor')
  ON CONFLICT (email) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'admin@medclinic.com'
      AND roles ~ '(^|,)admin(,|$)'
  ) OR NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'secretaria1@example.com'
      AND roles ~ '(^|,)secretary(,|$)'
  ) OR NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'secretaria2@example.com'
      AND roles ~ '(^|,)secretary(,|$)'
  ) OR NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'medico1@example.com'
      AND roles ~ '(^|,)doctor(,|$)'
  ) OR NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'medico2@example.com'
      AND roles ~ '(^|,)doctor(,|$)'
  ) THEN
    RAISE EXCEPTION
      'Uma conta preexistente nao possui o perfil esperado; confira os e-mails e roles.';
  END IF;

  INSERT INTO doctors (crm, user_id)
  SELECT 'CRM-SEED-001', id
  FROM users
  WHERE email = 'medico1@example.com'
  ON CONFLICT DO NOTHING;

  INSERT INTO doctors (crm, user_id)
  SELECT 'CRM-SEED-002', id
  FROM users
  WHERE email = 'medico2@example.com'
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM doctors d
    JOIN users u ON u.id = d.user_id
    WHERE u.email = 'medico1@example.com'
      AND d.crm = 'CRM-SEED-001'
  ) OR NOT EXISTS (
    SELECT 1
    FROM doctors d
    JOIN users u ON u.id = d.user_id
    WHERE u.email = 'medico2@example.com'
      AND d.crm = 'CRM-SEED-002'
  )    
  END IF;

  INSERT INTO patients (name, cpf)
  VALUES
    ('Paciente Demonstracao 01', '00000000001'),
    ('Paciente Demonstracao 02', '00000000002'),
    ('Paciente Demonstracao 03', '00000000003'),
    ('Paciente Demonstracao 04', '00000000004'),
    ('Paciente Demonstracao 05', '00000000005'),
    ('Paciente Demonstracao 06', '00000000006'),
    ('Paciente Demonstracao 07', '00000000007'),
    ('Paciente Demonstracao 08', '00000000008'),
    ('Paciente Demonstracao 09', '00000000009'),
    ('Paciente Demonstracao 10', '00000000010')
  ON CONFLICT (cpf) DO NOTHING;
END
$seed$;

COMMIT;
